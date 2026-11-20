import { Router } from 'express'
import Coupon from '../models/Coupon.js'
import Order from '../models/Order.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { evaluateCoupon } from '../services/coupons.js'
import { badRequest, notFound } from '../utils/httpError.js'

const router = Router()
router.use(requireAuth)

// POST /api/coupons/validate  { code, subtotal } — preview the discount at checkout
router.post('/validate', async (req, res) => {
  const subtotal = Number(req.body?.subtotal)
  if (!Number.isFinite(subtotal) || subtotal < 0) throw badRequest('Add something to your cart first.')
  const { coupon, code, discount } = await evaluateCoupon({ code: req.body?.code, user: req.user, subtotal })
  res.json({ code, discount, description: coupon.description })
})

// ----- owner only -----
const FIELDS = ['code', 'description', 'type', 'value', 'minOrder', 'maxDiscount', 'expiresAt', 'usageLimit', 'perUserLimit', 'firstOrderOnly', 'active']
function pick(body = {}) {
  const out = {}
  for (const k of FIELDS) if (body[k] !== undefined) out[k] = body[k] === '' ? null : body[k]
  return out
}

router.get('/', requireAdmin, async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean()
  // Show how often each code has been used
  const usage = await Order.aggregate([
    { $match: { couponCode: { $ne: '' }, status: { $nin: ['declined', 'cancelled'] } } },
    { $group: { _id: '$couponCode', count: { $sum: 1 }, discount: { $sum: '$discount' } } },
  ])
  const byCode = Object.fromEntries(usage.map(u => [u._id, u]))
  res.json(coupons.map(c => ({ ...c, usedCount: byCode[c.code]?.count || 0, totalDiscount: byCode[c.code]?.discount || 0 })))
})

router.post('/', requireAdmin, async (req, res) => {
  res.status(201).json(await Coupon.create(pick(req.body)))
})

router.put('/:id', requireAdmin, async (req, res) => {
  const coupon = await Coupon.findById(req.params.id)
  if (!coupon) throw notFound('Coupon not found.')
  coupon.set(pick(req.body))
  await coupon.save()
  res.json(coupon)
})

router.delete('/:id', requireAdmin, async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id)
  if (!coupon) throw notFound('Coupon not found.')
  res.json({ deleted: coupon._id })
})

export default router
