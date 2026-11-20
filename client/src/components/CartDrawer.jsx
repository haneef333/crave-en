import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import CartLines from './CartLines'
import { AnimatedPrice } from './Motion'
import { useCart } from '../context/CartContext'
import { useMeta } from '../hooks/useBakeryData'
import { formatPrice } from '../utils'

function Drawer() {
  const { lines, subtotal, maxNotice, closeCart } = useCart()
  const meta = useMeta()
  const navigate = useNavigate()
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    const onKey = e => { if (e.key === 'Escape') closeCart() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [closeCart])

  return (
    <div className="drawer-root">
      <motion.div
        className="drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeCart}
      />
      <motion.aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%', transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="drawer-head">
          <h2>Your cart</h2>
          <button ref={closeRef} type="button" className="sheet-close static" onClick={closeCart} aria-label="Close cart">×</button>
        </div>

        {lines.length === 0 ? (
          <motion.div className="drawer-empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p>Your cart is empty. Add a few bakes and they’ll show up here.</p>
            <Link to="/menu" className="btn btn-primary" onClick={closeCart}>Browse the menu</Link>
          </motion.div>
        ) : (
          <>
            <div className="drawer-body">
              <CartLines compact onNavigate={closeCart} />
            </div>
            <div className="drawer-foot">
              <dl className="totals">
                <div><dt>Subtotal</dt><dd><AnimatedPrice value={subtotal} /></dd></div>
                <div><dt>Delivery</dt><dd>{meta ? `${formatPrice(meta.deliveryFee)} if delivered` : 'Chosen at checkout'}</dd></div>
              </dl>
              {maxNotice > 0 && (
                <p className="muted small">Something in your cart needs {maxNotice} day{maxNotice > 1 ? 's' : ''} notice.</p>
              )}
              <button
                type="button"
                className="btn btn-primary btn-block btn-large"
                onClick={() => { closeCart(); navigate('/checkout') }}
              >
                Continue to checkout
              </button>
            </div>
          </>
        )}
      </motion.aside>
    </div>
  )
}

export default function CartDrawer() {
  const { isOpen, closeCart } = useCart()
  const { pathname } = useLocation()

  // Close the drawer when the page changes
  useEffect(() => { closeCart() }, [pathname, closeCart])

  return <AnimatePresence>{isOpen && <Drawer />}</AnimatePresence>
}
