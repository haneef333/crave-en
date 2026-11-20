import { Router } from 'express'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Review from '../models/Review.js'
import { requireAuth } from '../middleware/auth.js'
import { badRequest, forbidden, notFound } from '../utils/httpError.js'

const router = Router()

// Recalculate the average shown on menu cards
export async function refreshRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  await Product.findByIdAndUpdate(productId, {
    ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  })
}

// GET /api/reviews/mine — which products I've already reviewed
router.get('/mine', requireAuth, async (req, res) => {
  const reviews = await Review.find({ user: req.user._id }).select('product rating comment')
  res.json(reviews)
})

// POST /api/reviews  { productId, rating, comment }
// Only customers with a completed order containing the product can review it.
router.post('/', requireAuth, async (req, res) => {
  const { productId, comment = '' } = req.body || {}
  const rating = Number(req.body?.rating)
  if (!mongoose.isValidObjectId(productId)) throw badRequest('Choose an item to review.')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Choose between 1 and 5 stars.')

  const order = await Order.findOne({ user: req.user._id, status: 'completed', 'items.product': productId }).sort({ createdAt: -1 })
  if (!order) throw forbidden('You can review an item once you’ve received it.')

  // Saving again updates the earlier review instead of adding a second one
  const review = await Review.findOneAndUpdate(
    { product: productId, user: req.user._id },
    { order: order._id, userName: req.user.name.split(' ')[0], rating, comment: String(comment).trim().slice(0, 500) },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  )
  await refreshRating(productId)
  res.status(201).json(review)
})

// DELETE /api/reviews/:id — the author or the owner
router.delete('/:id', requireAuth, async (req, res) => {
  const review = await Review.findById(req.params.id)
  if (!review) throw notFound('Review not found.')
  if (!review.user.equals(req.user._id) && req.user.role !== 'admin') throw forbidden()
  await review.deleteOne()
  await refreshRating(review.product)
  res.json({ deleted: review._id })
})

export default router
