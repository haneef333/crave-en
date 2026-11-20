import { Router } from 'express'
import mongoose from 'mongoose'
import Product, { CATEGORIES } from '../models/Product.js'
import Review from '../models/Review.js'
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js'
import { getAvailability, getRecipeNames } from '../services/inventoryClient.js'
import { HttpError, notFound } from '../utils/httpError.js'

const router = Router()

const EDITABLE_FIELDS = [
  'name', 'recipeName', 'category', 'description', 'price', 'unitLabel',
  'imageUrl', 'minNoticeDays', 'tags', 'isAvailable', 'isFeatured',
  'sizes', 'flavours', 'egglessExtra', 'customizable',
]

function pickEditable(body = {}) {
  const out = {}
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  if (typeof out.tags === 'string') {
    out.tags = out.tags.split(',').map(t => t.trim()).filter(Boolean)
  }
  if (out.egglessExtra === '') out.egglessExtra = null
  // With sizes, the menu price is the smallest size's price
  if (Array.isArray(out.sizes) && out.sizes.length) out.price = Math.min(...out.sizes.map(s => Number(s.price) || 0))
  return out
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /api/products?category=Cakes&q=choco
router.get('/', optionalAuth, async (req, res) => {
  const filter = {}
  const showAll = req.user?.role === 'admin' && req.query.all === '1'
  if (!showAll) filter.isAvailable = true
  if (req.query.category && CATEGORIES.includes(req.query.category)) filter.category = req.query.category
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i')
    filter.$or = [{ name: rx }, { description: rx }, { tags: rx }]
  }
  if (req.query.featured === '1') filter.isFeatured = true

  const products = await Product.find(filter).sort({ isFeatured: -1, category: 1, name: 1 })
  res.json(products)
})

router.get('/categories', (_req, res) => {
  res.json(CATEGORIES)
})

// How many of each item can be made from current stock (from the inventory app)
router.get('/availability', async (_req, res) => {
  res.json(await getAvailability())
})

// Recipe names defined in the inventory app, to link menu items to recipes
router.get('/recipe-names', requireAuth, requireAdmin, async (_req, res) => {
  const names = await getRecipeNames()
  if (!names) throw new HttpError(502, 'Could not reach the inventory app to load recipe names.')
  res.json(names)
})

// GET /api/products/:id/reviews — newest first
router.get('/:id/reviews', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Product not found.')
  const reviews = await Review.find({ product: req.params.id }).sort({ createdAt: -1 }).limit(30)
    .select('userName rating comment createdAt user')
  res.json(reviews)
})

router.get('/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
  if (!product) throw notFound('That item is not on the menu.')
  res.json(product)
})

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const product = await Product.create(pickEditable(req.body))
  res.status(201).json(product)
})

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) throw notFound('Product not found.')
  product.set(pickEditable(req.body))
  await product.save()
  res.json(product)
})

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) throw notFound('Product not found.')
  res.json({ deleted: product._id })
})

export default router
