// Endpoints called by the Smart Inventory System, not by browsers.
import { Router } from 'express'
import Order, { ALLOWED_TRANSITIONS, ORDER_STATUSES } from '../models/Order.js'
import { requireIntegrationSecret } from '../middleware/auth.js'
import { sendStatusUpdate } from '../services/emails.js'
import { emitOrderUpdate } from '../services/realtime.js'
import { badRequest, conflict, notFound } from '../utils/httpError.js'

const router = Router()
router.use(requireIntegrationSecret)

router.get('/ping', (_req, res) => {
  res.json({ ok: true })
})

// POST /api/integrations/inventory/order-status
// { external_id: "BK-261115-A1B2C3", status: "accepted", note: "", payment_status?: "paid" }
router.post('/order-status', async (req, res) => {
  const { external_id: orderNumber, status, note = '', payment_status: paymentStatus } = req.body || {}
  if (!orderNumber || !ORDER_STATUSES.includes(status)) {
    throw badRequest('external_id and a valid status are required.')
  }

  const order = await Order.findOne({ orderNumber })
  if (!order) throw notFound(`Order ${orderNumber} not found.`)

  const statusChanged = order.status !== status
  if (statusChanged) {
    if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
      throw conflict(`Order ${orderNumber} cannot move from ${order.status} to ${status}.`)
    }
    order.setStatus(status, typeof note === 'string' ? note.slice(0, 300) : '')
    if (status === 'declined') order.declineReason = note || 'The baker could not take this order.'
  }
  const paymentChanged = (paymentStatus === 'paid' || paymentStatus === 'unpaid') && order.paymentStatus !== paymentStatus
  if (paymentChanged) order.paymentStatus = paymentStatus

  await order.save()
  // Tell the customer straight away: live on the website, and by email for the big moments
  if (statusChanged || paymentChanged) emitOrderUpdate(order)
  if (statusChanged) sendStatusUpdate(order).catch(() => {})
  res.json({ ok: true, orderNumber, status: order.status })
})

export default router
