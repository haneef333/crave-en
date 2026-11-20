import { useCallback } from 'react'
import { getProducts } from '../api/client'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'

// Options may have changed since the order (a flavour removed, say).
// Keep what's still offered and fall back to the first choice otherwise.
function stillValid(product, options = {}) {
  const out = {}
  if (product.sizes?.length) out.size = product.sizes.some(s => s.label === options.size) ? options.size : product.sizes[0].label
  if (product.flavours?.length) out.flavour = product.flavours.some(f => f.label === options.flavour) ? options.flavour : product.flavours[0].label
  if (options.eggless && product.egglessExtra != null) out.eggless = true
  if (product.customizable) {
    for (const k of ['occasion', 'message', 'candles', 'referencePhotoUrl']) if (options[k]) out[k] = options[k]
  }
  return out
}

// "Order again": puts the items from a past order back in the cart at today's prices
export function useReorder() {
  const { add, openCart } = useCart()
  const toast = useToast()

  return useCallback(async order => {
    let products
    try {
      products = await getProducts()
    } catch {
      toast('Could not load the menu. Try again.', 'bad')
      return
    }
    const byId = new Map(products.map(p => [p._id, p]))
    const missing = []
    let added = 0
    for (const item of order.items) {
      const product = byId.get(String(item.product))
      if (!product) { missing.push(item.name); continue }
      add(product, item.quantity, stillValid(product, item.options))
      added++
    }
    if (added) openCart()
    if (missing.length) toast(`${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} no longer on the menu.`, added ? 'default' : 'bad')
    else toast('Added your previous order to the cart')
  }, [add, openCart, toast])
}
