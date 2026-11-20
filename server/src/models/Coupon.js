import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: [/^[A-Z0-9]{3,20}$/, 'Codes use 3–20 letters or numbers.'] },
    description: { type: String, trim: true, default: '', maxlength: 120 },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true, min: 1 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 }, // cap for percent coupons
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null, min: 1 }, // total uses across all customers
    perUserLimit: { type: Number, default: 1, min: 1 },
    firstOrderOnly: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

couponSchema.path('value').validate(function validPercent(v) {
  return this.type !== 'percent' || v <= 90
}, 'A percentage discount can be at most 90%.')

export default mongoose.model('Coupon', couponSchema)
