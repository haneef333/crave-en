// Checks a coupon code for a customer and works out the discount.
import Coupon from '../models/Coupon.js'
import Order from '../models/Order.js'
import { badRequest } from '../utils/httpError.js'

// Orders that were declined or cancelled don't use up a coupon
const COUNTED = { status: { $nin: ['declined', 'cancelled'] } }

export async function evaluateCoupon({ code, user, subtotal }) {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) throw badRequest('Enter a coupon code.')

  const coupon = await Coupon.findOne({ code: normalized })
  if (!coupon || !coupon.active) throw badRequest(`${normalized} isn't a valid code.`)
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw badRequest(`${normalized} has expired.`)
  if (subtotal < coupon.minOrder) {
    throw badRequest(`${normalized} needs an order of at least ₹${coupon.minOrder}. Add ₹${coupon.minOrder - subtotal} more.`)
  }

  if (coupon.firstOrderOnly) {
    const previous = await Order.countDocuments({ user: user._id, ...COUNTED })
    if (previous > 0) throw badRequest(`${normalized} is only for your first order.`)
  }
  if (coupon.usageLimit) {
    const used = await Order.countDocuments({ couponCode: normalized, ...COUNTED })
    if (used >= coupon.usageLimit) throw badRequest(`${normalized} has been fully used.`)
  }
  const usedByUser = await Order.countDocuments({ user: user._id, couponCode: normalized, ...COUNTED })
  if (usedByUser >= coupon.perUserLimit) throw badRequest(`You've already used ${normalized}.`)

  let discount = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
  discount = Math.min(discount, subtotal)

  return { coupon, code: normalized, discount }
}
