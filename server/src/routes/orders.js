import crypto from 'node:crypto'
import { Router } from 'express'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { env } from '../config/env.js'
import { pushCancel, pushOrder } from '../services/inventoryClient.js'
import { evaluateCoupon } from '../services/coupons.js'
import { sendOrderPlaced } from '../services/emails.js'
import { emitNewOrder, emitOrderUpdate } from '../services/realtime.js'
import { addDaysISO, isValidISODate, todayISO } from '../utils/dates.js'
import { optionsKey, resolveItem } from '../utils/pricing.js'
import { slotsFor } from '../utils/slots.js'
import { HttpError, badRequest, conflict, forbidden, notFound } from '../utils/httpError.js'

const router = Router()
router.use(requireAuth)

const MAX_DAYS_AHEAD = 60

function newOrderNumber() {
  const datePart = todayISO().slice(2).replaceAll('-', '') // YYMMDD
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase() // 6 chars
  return `BK-${datePart}-${randomPart}`
}

const clean = v => (typeof v === 'string' ? v.trim() : '')

// POST /api/orders  — place an order from the cart
router.post('/', async (req, res) => {
  const body = req.body || {}

  // 1. Basic shape of each cart line
  if (!Array.isArray(body.items) || body.items.length === 0) throw badRequest('Your cart is empty.')
  if (body.items.length > 20) throw badRequest('Orders can have at most 20 different items.')
  for (const line of body.items) {
    const qty = Number(line?.quantity)
    if (!line?.productId || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      throw badRequest('Each item needs a quantity between 1 and 50.')
    }
  }

  // 2. Look up products. Prices always come from the database, never the browser.
  const ids = [...new Set(body.items.map(l => String(l.productId)))]
  const products = await Product.find({ _id: { $in: ids } })
  const byId = new Map(products.map(p => [p._id.toString(), p]))
  const unavailable = ids.filter(id => !byId.get(id)?.isAvailable)
  if (unavailable.length) {
    const names = unavailable.map(id => byId.get(id)?.name).filter(Boolean)
    throw conflict(
      names.length
        ? `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} no longer on the menu. Remove ${names.length === 1 ? 'it' : 'them'} from your cart.`
        : 'Some items in your cart are no longer on the menu. Remove them and try again.',
    )
  }

  // 3. Price each line from its options; merge identical lines
  const merged = new Map()
  for (const line of body.items) {
    const product = byId.get(String(line.productId))
    const { unitPrice, recipeScale, options } = resolveItem(product, line.options)
    const key = `${product._id}|${optionsKey(options)}`
    const existing = merged.get(key)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + Number(line.quantity), 50)
      existing.lineTotal = existing.unitPrice * existing.quantity
    } else {
      merged.set(key, {
        product: product._id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        imageUrl: product.imageUrl,
        recipeName: product.recipeName,
        unitLabel: product.sizes?.length ? options.size : product.unitLabel,
        options,
        recipeScale,
        unitPrice,
        quantity: Number(line.quantity),
        lineTotal: unitPrice * Number(line.quantity),
      })
    }
  }
  const items = [...merged.values()]

  // 4. Customer details and fulfilment
  const name = clean(body.name) || req.user.name
  const phone = clean(body.phone) || req.user.phone
  if (!/^[0-9+\-\s]{10,15}$/.test(phone)) throw badRequest('Enter a 10-digit phone number so the baker can reach you.')

  const fulfilment = body.fulfilment === 'delivery' ? 'delivery' : 'pickup'
  const address = clean(body.address)
  if (fulfilment === 'delivery' && address.length < 10) throw badRequest('Enter your full delivery address.')

  // 5. Date (respecting each item's notice period) and time slot
  const neededBy = clean(body.neededBy)
  if (!isValidISODate(neededBy)) throw badRequest('Choose the date you need your order.')
  const today = todayISO()
  const maxNotice = Math.max(...products.map(p => p.minNoticeDays || 0))
  const earliest = addDaysISO(today, maxNotice)
  if (neededBy < earliest) {
    throw badRequest(
      maxNotice > 0
        ? `Some items need ${maxNotice} day${maxNotice > 1 ? 's' : ''} notice. The earliest date is ${earliest}.`
        : 'The needed-by date cannot be in the past.',
    )
  }
  if (neededBy > addDaysISO(today, MAX_DAYS_AHEAD)) {
    throw badRequest(`Orders can be placed up to ${MAX_DAYS_AHEAD} days ahead.`)
  }
  const slot = slotsFor(neededBy).find(s => s.id === body.timeSlot)
  if (!slot) throw badRequest('Choose a time slot.')
  if (!slot.available) throw badRequest('That time slot has passed for today. Choose a later slot or another day.')

  const paymentMethod = body.paymentMethod === 'upi' ? 'upi' : 'cash'
  const notes = clean(body.notes).slice(0, 500)

  // 6. Totals, with an optional coupon (checked again here, not trusted from checkout)
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  let couponCode = ''
  let discount = 0
  if (clean(body.couponCode)) {
    const result = await evaluateCoupon({ code: body.couponCode, user: req.user, subtotal })
    couponCode = result.code
    discount = result.discount
  }
  const deliveryFee = fulfilment === 'delivery' ? env.deliveryFee : 0

  // 7. Save (retry on the rare order-number collision)
  let order
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    try {
      const draft = new Order({
        orderNumber: newOrderNumber(),
        user: req.user._id,
        customer: { name, phone, email: req.user.email },
        items,
        subtotal,
        couponCode,
        discount,
        deliveryFee,
        total: subtotal - discount + deliveryFee,
        fulfilment,
        address: fulfilment === 'delivery' ? address : '',
        neededBy,
        timeSlot: slot.id,
        notes,
        paymentMethod,
      })
      draft.setStatus('awaiting_confirmation', 'Order placed')
      order = await draft.save()
    } catch (err) {
      if (err?.code !== 11000 || attempt === 2) throw err
    }
  }

  // Remember phone/address for next time
  let profileChanged = false
  if (!req.user.phone) { req.user.phone = phone; profileChanged = true }
  if (fulfilment === 'delivery' && !req.user.address) { req.user.address = address; profileChanged = true }
  if (profileChanged) await req.user.save()

  // 8. Side effects that must not slow down or break the checkout
  if (env.inventorySyncEnabled) pushOrder(order._id).catch(err => console.error('[sync] push failed', err))
  sendOrderPlaced(order).catch(() => {})
  emitNewOrder(order)

  res.status(201).json(order)
})

// GET /api/orders/mine
router.get('/mine', async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50)
  res.json(orders)
})

// GET /api/orders  — all orders (owner only)
router.get('/', requireAdmin, async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {}
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
  res.json(orders)
})

async function findOwnOrder(req) {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber })
  if (!order) throw notFound('Order not found.')
  const isOwner = order.user.equals(req.user._id)
  if (!isOwner && req.user.role !== 'admin') throw forbidden('This order belongs to another account.')
  return order
}

router.get('/:orderNumber', async (req, res) => {
  res.json(await findOwnOrder(req))
})

// POST /api/orders/:orderNumber/cancel — only before the baker accepts
router.post('/:orderNumber/cancel', async (req, res) => {
  const order = await findOwnOrder(req)
  if (order.status !== 'awaiting_confirmation') {
    throw conflict('The baker has already confirmed this order. Call the bakery to change it.')
  }

  if (order.inventorySync.state === 'sent') {
    const result = await pushCancel(order._id)
    if (result.status === 409) {
      throw conflict('The baker has just confirmed this order. Call the bakery to change it.')
    }
    if (!result.ok && result.status !== 404) {
      throw new HttpError(503, 'Could not reach the bakery to cancel. Try again in a minute.')
    }
  }

  // Reload in case a status update arrived while we were talking to the inventory app
  const fresh = await Order.findById(order._id)
  if (fresh.status !== 'awaiting_confirmation') {
    throw conflict('The baker has just confirmed this order. Call the bakery to change it.')
  }
  fresh.setStatus('cancelled', 'Cancelled by you')
  await fresh.save()
  emitOrderUpdate(fresh)
  res.json(fresh)
})

export default router
