import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { cleanOptions, optionsKey, unitPriceFor } from '../pricing'

const CART_KEY = 'bakery_cart_v2'
const CartContext = createContext(null)

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter(l => l.lineId && l.productId) : []
  } catch {
    return []
  }
}

// Each cart line is a product *plus* its options, so a 1 kg chocolate cake and
// a 2 kg vanilla cake are separate lines.
const lineIdFor = (productId, options) => `${productId}|${optionsKey(options)}`

export function CartProvider({ children }) {
  const [lines, setLines] = useState(loadCart)
  const [lastAddedAt, setLastAddedAt] = useState(0)
  const [isOpen, setIsOpen] = useState(false) // the slide-in cart drawer
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)) } catch { /* storage unavailable */ }
  }, [lines])

  // We keep a small snapshot of the product for display. Prices shown in the
  // cart are a preview: the server recalculates everything when the order is placed.
  const add = useCallback((product, quantity = 1, rawOptions = {}) => {
    const options = cleanOptions(rawOptions)
    const lineId = lineIdFor(product._id, options)
    setLines(prev => {
      const existing = prev.find(l => l.lineId === lineId)
      if (existing) {
        return prev.map(l => (l.lineId === lineId ? { ...l, quantity: Math.min(l.quantity + quantity, 50) } : l))
      }
      return [...prev, {
        lineId,
        productId: product._id,
        slug: product.slug,
        name: product.name,
        price: unitPriceFor(product, options),
        unitLabel: options.size || product.unitLabel,
        category: product.category,
        recipeName: product.recipeName,
        imageUrl: product.imageUrl,
        minNoticeDays: product.minNoticeDays || 0,
        options,
        quantity: Math.min(quantity, 50),
      }]
    })
    setLastAddedAt(Date.now())
  }, [])

  const setQuantity = useCallback((lineId, quantity) => {
    setLines(prev => (quantity <= 0
      ? prev.filter(l => l.lineId !== lineId)
      : prev.map(l => (l.lineId === lineId ? { ...l, quantity: Math.min(quantity, 50) } : l))))
  }, [])

  const remove = useCallback(lineId => setLines(prev => prev.filter(l => l.lineId !== lineId)), [])
  const clear = useCallback(() => setLines([]), [])

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0)
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0)
    const maxNotice = lines.reduce((m, l) => Math.max(m, l.minNoticeDays || 0), 0)
    // For menu cards: how many of a product (any options) are in the cart
    const quantityOf = productId => lines.filter(l => l.productId === productId).reduce((n, l) => n + l.quantity, 0)
    // The cart line for a product with no options (menu card steppers use this)
    const plainLineId = productId => lineIdFor(productId, {})
    return {
      lines, count, subtotal, maxNotice, lastAddedAt, add, setQuantity, remove, clear, quantityOf, plainLineId,
      isOpen, openCart, closeCart,
    }
  }, [lines, lastAddedAt, add, setQuantity, remove, clear, isOpen, openCart, closeCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
