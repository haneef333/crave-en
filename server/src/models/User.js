import crypto from 'node:crypto'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    // Not required for people who only sign in with Google
    password: {
      type: String,
      minlength: 6,
      select: false,
      required() { return !this.googleId },
    },
    googleId: { type: String, index: true, sparse: true },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    // Password reset: we store only a hash of the token we email out
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.checkPassword = function checkPassword(plain) {
  if (!this.password) return Promise.resolve(false)
  return bcrypt.compare(plain, this.password)
}

export const hashResetToken = token => crypto.createHash('sha256').update(token).digest('hex')

// Returns the plain token to email; only its hash is saved
userSchema.methods.createResetToken = function createResetToken() {
  const token = crypto.randomBytes(32).toString('hex')
  this.resetTokenHash = hashResetToken(token)
  this.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  return token
}

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    address: this.address,
    role: this.role,
    avatarUrl: this.avatarUrl,
    usesGoogle: Boolean(this.googleId),
  }
}

export default mongoose.model('User', userSchema)
