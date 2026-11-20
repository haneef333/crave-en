import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import CartLines from '../components/CartLines'
import { AnimatedPrice } from '../components/Motion'
import { useCart } from '../context/CartContext'
import { useMeta } from '../hooks/useBakeryData'
import { formatPrice } from '../utils'

export default function Cart() {
  const { lines, subtotal, maxNotice } = useCart()
  const meta = useMeta()
  const navigate = useNavigate()

  if (lines.length === 0) {
    return (
      <div className="container page narrow">
        <h1>Your cart</h1>
        <motion.div className="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p>Your cart is empty. Add a few bakes from the menu and they’ll show up here.</p>
          <Link to="/menu" className="btn btn-primary">Browse the menu</Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container page">
      <h1>Your cart</h1>
      <div className="two-col">
        <CartLines />
        <aside className="summary">
          <h2>Summary</h2>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd><AnimatedPrice value={subtotal} /></dd></div>
            <div><dt>Delivery</dt><dd>{meta ? `${formatPrice(meta.deliveryFee)} if delivered` : 'Chosen at checkout'}</dd></div>
          </dl>
          {maxNotice > 0 && (
            <p className="muted small">Something in your cart needs {maxNotice} day{maxNotice > 1 ? 's' : ''} notice, so the earliest date will be later.</p>
          )}
          <motion.button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/checkout')}>
            Continue to checkout
          </motion.button>
          <Link to="/menu" className="text-link center">Add more from the menu</Link>
        </aside>
      </div>
    </div>
  )
}
