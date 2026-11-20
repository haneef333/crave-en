import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { forbidden, unauthorized } from '../utils/httpError.js'

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: '7d' })
}

async function userFromRequest(req) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    return await User.findById(payload.sub)
  } catch {
    return null
  }
}

export async function requireAuth(req, _res, next) {
  const user = await userFromRequest(req)
  if (!user) throw unauthorized()
  req.user = user
  next()
}

export async function optionalAuth(req, _res, next) {
  req.user = await userFromRequest(req)
  next()
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') throw forbidden('Only the bakery owner can do this.')
  next()
}

// For calls coming from the Smart Inventory System
export function requireIntegrationSecret(req, _res, next) {
  const given = Buffer.from(req.get('x-integration-secret') || '')
  const expected = Buffer.from(env.integrationSecret)
  const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected)
  if (!ok) throw unauthorized('Invalid integration secret.')
  next()
}
