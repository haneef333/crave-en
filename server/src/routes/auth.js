import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import User, { hashResetToken } from '../models/User.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { env } from '../config/env.js'
import { verifyGoogleCredential } from '../services/google.js'
import { sendPasswordReset } from '../services/emails.js'
import { HttpError, badRequest, unauthorized } from '../utils/httpError.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Wait a few minutes and try again.' },
})

const clean = v => (typeof v === 'string' ? v.trim() : '')
const authResponse = user => ({ token: signToken(user), user: user.toPublic() })

router.post('/register', authLimiter, async (req, res) => {
  const name = clean(req.body?.name)
  const email = clean(req.body?.email).toLowerCase()
  const phone = clean(req.body?.phone)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!name) throw badRequest('Enter your name.')
  if (!email) throw badRequest('Enter your email address.')
  if (password.length < 6) throw badRequest('Use a password with at least 6 characters.')

  const user = await User.create({ name, email, phone, password })
  res.status(201).json(authResponse(user))
})

router.post('/login', authLimiter, async (req, res) => {
  const email = clean(req.body?.email).toLowerCase()
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) throw badRequest('Enter your email and password.')

  const user = await User.findOne({ email }).select('+password')
  if (user && !user.password && user.googleId) {
    throw unauthorized('This account uses Google sign-in. Use "Continue with Google", or reset your password to add one.')
  }
  if (!user || !(await user.checkPassword(password))) {
    throw unauthorized('That email and password do not match an account.')
  }
  res.json(authResponse(user))
})

// POST /api/auth/google  { credential } — "Continue with Google"
router.post('/google', authLimiter, async (req, res) => {
  if (!env.googleClientId) throw new HttpError(503, 'Google sign-in is not set up on this server.')
  const credential = clean(req.body?.credential)
  if (!credential) throw badRequest('Google sign-in did not complete. Try again.')

  // Tests swap in a fake checker through app.locals
  const verify = req.app.locals.verifyGoogle || verifyGoogleCredential
  let profile
  try {
    profile = await verify(credential)
  } catch {
    throw unauthorized('Google could not confirm your sign-in. Try again.')
  }

  // Link to an existing account with the same email, or create a new one
  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] })
  if (user) {
    if (!user.googleId) user.googleId = profile.googleId
    if (!user.avatarUrl && profile.avatarUrl) user.avatarUrl = profile.avatarUrl
    await user.save()
  } else {
    user = await User.create({ name: profile.name, email: profile.email, googleId: profile.googleId, avatarUrl: profile.avatarUrl })
  }
  res.json(authResponse(user))
})

// POST /api/auth/forgot  { email } — always answers the same way, so nobody
// can use this form to find out which emails have accounts.
router.post('/forgot', authLimiter, async (req, res) => {
  const email = clean(req.body?.email).toLowerCase()
  if (!email) throw badRequest('Enter your email address.')
  const user = await User.findOne({ email })
  if (user) {
    const token = user.createResetToken()
    await user.save({ validateBeforeSave: false })
    await sendPasswordReset(user, token)
  }
  res.json({ message: 'If that email has an account, we’ve sent a link to reset the password.' })
})

// POST /api/auth/reset  { token, password }
router.post('/reset', authLimiter, async (req, res) => {
  const token = clean(req.body?.token)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!token) throw badRequest('This reset link is incomplete. Request a new one.')
  if (password.length < 6) throw badRequest('Use a password with at least 6 characters.')

  const user = await User.findOne({
    resetTokenHash: hashResetToken(token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires')
  if (!user) throw badRequest('This reset link has expired or was already used. Request a new one.')

  user.password = password
  user.resetTokenHash = undefined
  user.resetTokenExpires = undefined
  await user.save()
  res.json(authResponse(user))
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() })
})

router.patch('/me', requireAuth, async (req, res) => {
  for (const field of ['name', 'phone', 'address']) {
    if (typeof req.body?.[field] === 'string') req.user[field] = req.body[field].trim()
  }
  if (!req.user.name) throw badRequest('Name cannot be empty.')
  await req.user.save()
  res.json({ user: req.user.toPublic() })
})

export default router
