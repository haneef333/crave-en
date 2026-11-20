import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { cancelOrder, errorMessage, getOrder } from '../api/client'
import { OrderProgress, StatusPill } from '../components/OrderStatus'
import { BAKERY, FINAL_STATUSES } from '../config'
import { useToast } from '../context/ToastContext'
import { useOrderUpdates } from '../context/SocketContext'
import { useMeta } from '../hooks/useBakeryData'
import { useReorder } from '../hooks/useReorder'
import RateOrder from '../components/RateOrder'
import { celebrationLabel, variantLabel } from '../pricing'
import { assetUrl } from '../utils'
import { formatDate, formatDateTime, formatPrice } from '../utils'

const BRAND_COLOURS = ['#f2b21b', '#1e5134', '#b42f27', '#132a1d', '#fcefc7']

function fireConfetti() {
  const base = { particleCount: 70, spread: 70, startVelocity: 48, colors: BRAND_COLOURS, disableForReducedMotion: true, scalar: 1.1 }
  confetti({ ...base, angle: 60, origin: { x: 0, y: 0.75 } })
  confetti({ ...base, angle: 120, origin: { x: 1, y: 0.75 } })
}

// Shown once, right after checkout: the tick draws itself and confetti bursts
function Celebration() {
  const fired = useRef(false)
  useEffect(() => {
    // The flag is set inside the timer so React's development double-run can't cancel it
    const t = setTimeout(() => {
      if (fired.current) return
      fired.current = true
      fireConfetti()
    }, 350)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="celebration"
      initial={{ opacity: 0, scale: 0.9, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
    >
      <svg viewBox="0 0 52 52" className="celebration-check" aria-hidden="true">
        <motion.circle cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, ease: 'easeOut' }} />
        <motion.path d="M15 27 l7.5 7.5 L37.5 19" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.5, ease: 'easeOut' }} />
      </svg>
      <div>
        <h2>Order placed!</h2>
        <p>The baker will check it and confirm soon. This page updates by itself.</p>
      </div>
    </motion.div>
  )
}

export default function OrderDetail() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [justPlaced] = useState(() => Boolean(location.state?.justPlaced))
  const toast = useToast()
  const lastStatus = useRef(null)

  // Forget the "just placed" flag so a refresh doesn't celebrate again
  useEffect(() => {
    if (location.state?.justPlaced) navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const meta = useMeta()
  const reorder = useReorder()

  const applyUpdate = useCallback(o => {
    if (lastStatus.current && lastStatus.current !== o.status && o.status === 'accepted') fireConfetti()
    lastStatus.current = o.status
    setOrder(o)
    setError('')
  }, [])

  const load = useCallback(
    () => getOrder(orderNumber).then(applyUpdate).catch(err => setError(errorMessage(err))),
    [orderNumber, applyUpdate],
  )

  // Status changes arrive instantly over Socket.IO...
  useOrderUpdates(o => { if (o.orderNumber === orderNumber) applyUpdate(o) })

  // ...and a slow poll catches anything missed while the connection was down
  useEffect(() => {
    load()
  }, [load])
  const isFinal = order && FINAL_STATUSES.includes(order.status)
  useEffect(() => {
    if (!order || isFinal) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [order, isFinal, load])

  async function cancel() {
    setCancelling(true)
    try {
      const cancelled = await cancelOrder(orderNumber)
      lastStatus.current = cancelled.status
      setOrder(cancelled)
      toast('Order cancelled')
    } catch (err) {
      toast(errorMessage(err), 'bad')
      load()
    } finally {
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  if (error && !order) {
    return (
      <div className="container page narrow">
        <p className="notice notice-bad">{error}</p>
        <Link to="/orders" className="text-link">Back to my orders</Link>
      </div>
    )
  }
  if (!order) return <div className="container page narrow"><p className="muted">Loading your order…</p></div>

  return (
    <div className="container page narrow">
      <Link to="/orders" className="text-link back-link">My orders</Link>
      <div className="order-head">
        <h1>Your order</h1>
        <StatusPill order={order} />
      </div>
      <p className="muted">Order <strong className="order-number">{order.orderNumber}</strong>, placed {formatDateTime(order.createdAt)}</p>

      {justPlaced && order.status === 'awaiting_confirmation' && <Celebration />}

      {order.status === 'declined' && (
        <div className="notice notice-bad">
          <strong>The baker couldn’t take this order.</strong>
          <p>{order.declineReason}</p>
          <p>Nothing was charged. Call {BAKERY.phone} if you’d like to arrange something else.</p>
        </div>
      )}
      {order.status === 'cancelled' && <p className="notice">You cancelled this order. Nothing was charged.</p>}

      <OrderProgress order={order} />

      <div className="detail-grid">
        <div>
          <h2>Needed by</h2>
          <p>
            {formatDate(order.neededBy, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {order.timeSlot && <><br /><span className="muted">{[...(meta?.slots.later || [])].find(s => s.id === order.timeSlot)?.label || order.timeSlot}</span></>}
          </p>
        </div>
        <div>
          <h2>{order.fulfilment === 'delivery' ? 'Delivery to' : 'Pickup from'}</h2>
          <p>{order.fulfilment === 'delivery' ? order.address : BAKERY.pickupAddress}</p>
        </div>
        <div>
          <h2>Payment</h2>
          <p>
            {order.paymentMethod === 'upi' ? 'UPI' : 'Cash'}, {order.paymentStatus === 'paid' ? 'paid' : `pay on ${order.fulfilment === 'delivery' ? 'delivery' : 'pickup'}`}
          </p>
        </div>
        {order.notes && (
          <div>
            <h2>Your notes</h2>
            <p>{order.notes}</p>
          </div>
        )}
      </div>

      <section className="order-items">
        <h2>Items</h2>
        <ul className="summary-lines">
          {order.items.map((i, idx) => {
            const variant = variantLabel(i.options)
            const extras = celebrationLabel(i.options)
            return (
              <li key={`${i.product}-${idx}`} className="order-item">
                <span>
                  {i.quantity} × {i.name} <span className="muted">({variant || i.unitLabel})</span>
                  {extras && <span className="order-item-extras">{extras}</span>}
                  {i.options?.referencePhotoUrl && (
                    <a className="order-item-photo" href={assetUrl(i.options.referencePhotoUrl)} target="_blank" rel="noreferrer">
                      <img src={assetUrl(i.options.referencePhotoUrl)} alt="Your reference design" /> Reference photo
                    </a>
                  )}
                </span>
                <span>{formatPrice(i.lineTotal)}</span>
              </li>
            )
          })}
        </ul>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="totals-discount"><dt>Discount ({order.couponCode})</dt><dd>−{formatPrice(order.discount)}</dd></div>}
          <div><dt>Delivery</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Free'}</dd></div>
          <div className="totals-grand"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </section>

      {order.status === 'completed' && <RateOrder order={order} />}

      {order.status !== 'awaiting_confirmation' && (
        <div className="reorder-row">
          <motion.button type="button" className="btn btn-ghost" onClick={() => reorder(order)}>
            Order again
          </motion.button>
        </div>
      )}

      {order.status === 'awaiting_confirmation' && (
        <div className="cancel-box">
          <AnimatePresence mode="wait" initial={false}>
          {confirmCancel ? (
            <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p>Cancel this order? The baker will be told straight away.</p>
              <div className="button-row">
                <button type="button" className="btn btn-danger" onClick={cancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Yes, cancel order'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
                  Keep order
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button key="ask" type="button" className="link-button danger" onClick={() => setConfirmCancel(true)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Cancel order
            </motion.button>
          )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
