// Everything the storefront says to the Smart Inventory System (FastAPI) goes through here.
import { env } from '../config/env.js'
import Order from '../models/Order.js'
import { celebrationLabel, variantLabel } from '../utils/pricing.js'
import { slotLabel } from '../utils/slots.js'
import { absoluteUrl } from './storage.js'

async function callInventory(path, { method = 'GET', body, timeoutMs = 20000 } = {}) {
  try {
    const res = await fetch(`${env.inventoryApiUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-integration-secret': env.integrationSecret,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    // Network error, DNS failure or timeout (e.g. a sleeping free-tier server)
    return { ok: false, status: 0, data: null, error: err.name === 'TimeoutError' ? 'timed out' : err.message }
  }
}

function describeFailure(result) {
  if (result.status === 0) return `Could not reach inventory app (${result.error})`
  const detail = result.data?.detail
  return `Inventory app replied ${result.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
}

export function toInventoryPayload(order) {
  return {
    external_id: order.orderNumber,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_email: order.customer.email,
    fulfilment: order.fulfilment,
    address: order.address,
    due_date: order.neededBy,
    time_slot: slotLabel(order.timeSlot),
    // The inventory app records payment as "cash" or "online"
    payment_method: order.paymentMethod === 'upi' ? 'online' : 'cash',
    notes: order.notes,
    delivery_fee: order.deliveryFee,
    coupon_code: order.couponCode,
    discount: order.discount,
    total: order.total,
    items: order.items.map(item => {
      const variant = variantLabel(item.options)
      return {
        product_name: item.recipeName,
        display_name: variant ? `${item.name} (${variant})` : item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        // 2 kg cake = 2 × the recipe, so the right amount of stock is deducted
        recipe_scale: item.recipeScale || 1,
        details: celebrationLabel(item.options) || null,
        photo_url: absoluteUrl(item.options?.referencePhotoUrl) || null,
      }
    }),
  }
}

// Send a new order to the inventory app. Safe to call repeatedly: the
// inventory app treats the order number as an idempotency key.
export async function pushOrder(orderId) {
  const order = await Order.findById(orderId)
  if (!order || order.inventorySync.state === 'sent' || order.status === 'cancelled') return

  const result = await callInventory('/api/online-orders', { method: 'POST', body: toInventoryPayload(order) })

  order.inventorySync.attempts += 1
  order.inventorySync.lastAttemptAt = new Date()

  if (result.ok) {
    order.inventorySync.state = 'sent'
    order.inventorySync.lastError = ''
  } else {
    order.inventorySync.state = 'failed'
    order.inventorySync.lastError = describeFailure(result)
    console.warn(`[sync] ${order.orderNumber}: ${order.inventorySync.lastError}`)
  }
  await order.save()

  // The customer may have cancelled while the request was in flight.
  if (result.ok) {
    const fresh = await Order.findById(orderId)
    if (fresh?.status === 'cancelled') {
      fresh.inventorySync.cancelPending = true
      await fresh.save()
      await pushCancel(fresh._id)
    }
  }
}

export async function pushCancel(orderId) {
  const order = await Order.findById(orderId)
  if (!order) return { ok: false, status: 404 }
  const result = await callInventory(
    `/api/online-orders/by-external/${encodeURIComponent(order.orderNumber)}/cancel`,
    { method: 'POST', timeoutMs: 15000 },
  )
  if (order.inventorySync.cancelPending && (result.ok || result.status === 404 || result.status === 409)) {
    order.inventorySync.cancelPending = false
    if (!result.ok) order.inventorySync.lastError = describeFailure(result)
    await order.save()
  }
  return result
}

// Background retry loop for orders the inventory app has not received yet.
function backoffMs(attempts) {
  return Math.min(env.syncIntervalMs * 2 ** Math.max(attempts - 1, 0), 10 * 60 * 1000)
}

let running = false
async function syncOnce() {
  if (running) return
  running = true
  try {
    const candidates = await Order.find({
      $or: [
        { 'inventorySync.state': { $in: ['pending', 'failed'] }, status: { $ne: 'cancelled' } },
        { 'inventorySync.cancelPending': true },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(20)

    const now = Date.now()
    for (const order of candidates) {
      const last = order.inventorySync.lastAttemptAt?.getTime() || 0
      if (now - last < backoffMs(order.inventorySync.attempts)) continue
      if (order.inventorySync.cancelPending) await pushCancel(order._id)
      else await pushOrder(order._id)
    }
  } catch (err) {
    console.error('[sync] worker error', err)
  } finally {
    running = false
  }
}

export function startSyncWorker() {
  const timer = setInterval(syncOnce, env.syncIntervalMs)
  timer.unref()
  console.log(`[sync] retrying undelivered orders every ${env.syncIntervalMs / 1000}s`)
  return timer
}

// How many of each recipe the baker can make with current stock.
// Cached briefly so browsing the menu does not hammer the inventory app.
let availabilityCache = { at: 0, data: null }
export async function getAvailability() {
  if (availabilityCache.data && Date.now() - availabilityCache.at < 60_000) {
    return { online: true, byRecipe: availabilityCache.data }
  }
  const result = await callInventory('/api/online-orders/availability', { timeoutMs: 4000 })
  if (result.ok && result.data && typeof result.data === 'object') {
    availabilityCache = { at: Date.now(), data: result.data }
    return { online: true, byRecipe: result.data }
  }
  // Inventory app unreachable: say nothing rather than showing items as sold out.
  return { online: false, byRecipe: {} }
}

export async function getRecipeNames() {
  const result = await callInventory('/api/recipes/products', { timeoutMs: 8000 })
  return result.ok && Array.isArray(result.data) ? result.data : null
}
