import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { errorMessage, placeOrder, validateCoupon } from '../api/client'
import { AnimatedPrice } from '../components/Motion'
import { variantLabel } from '../pricing'
import { BAKERY } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useMeta } from '../hooks/useBakeryData'
import { addDaysISO, formatDate, formatPrice } from '../utils'

export default function Checkout() {
  const { user, refresh } = useAuth()
  const { lines, subtotal, maxNotice, clear } = useCart()
  const meta = useMeta()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    fulfilment: 'pickup',
    address: user?.address || '',
    neededBy: '',
    timeSlot: '',
    notes: '',
    paymentMethod: 'cash',
  })
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState(null) // { code, discount, description }
  const [couponError, setCouponError] = useState('')
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // After the last slot of the day has gone, the earliest date is tomorrow
  const todayClosed = meta ? !meta.slots.today.some(s => s.available) : false
  const earliest = meta ? addDaysISO(meta.today, Math.max(maxNotice, todayClosed ? 1 : 0)) : ''
  const latest = meta ? addDaysISO(meta.today, 60) : ''

  // Default the date to the earliest possible day
  useEffect(() => {
    if (earliest && (!form.neededBy || form.neededBy < earliest)) {
      setForm(f => ({ ...f, neededBy: earliest }))
    }
  }, [earliest, form.neededBy])

  // Which time slots are still open for the chosen date
  const slots = meta ? (form.neededBy === meta.today ? meta.slots.today : meta.slots.later) : []
  useEffect(() => {
    if (!slots.length) return
    const current = slots.find(s => s.id === form.timeSlot)
    if (!current || !current.available) {
      const first = slots.find(s => s.available)
      setForm(f => ({ ...f, timeSlot: first ? first.id : '' }))
    }
  }, [slots, form.timeSlot])

  // A coupon checked for one subtotal may not apply to another
  useEffect(() => { setCoupon(null) }, [subtotal])

  if (lines.length === 0 && !submitting) return <Navigate to="/cart" replace />

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  const deliveryFee = form.fulfilment === 'delivery' ? meta?.deliveryFee || 0 : 0
  const discount = coupon?.discount || 0
  const noSlotToday = form.neededBy === meta?.today && !slots.some(s => s.available)

  async function applyCoupon() {
    if (!couponInput.trim()) return
    setCheckingCoupon(true); setCouponError('')
    try {
      setCoupon(await validateCoupon(couponInput.trim(), subtotal))
    } catch (err) {
      setCoupon(null)
      setCouponError(errorMessage(err, 'That code could not be applied.'))
    } finally {
      setCheckingCoupon(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const order = await placeOrder({
        ...form,
        couponCode: coupon?.code || '',
        items: lines.map(l => ({ productId: l.productId, quantity: l.quantity, options: l.options })),
      })
      clear()
      refresh()
      navigate(`/orders/${order.orderNumber}`, { replace: true, state: { justPlaced: true } })
    } catch (err) {
      setError(errorMessage(err, 'Your order could not be placed. Check the details and try again.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="container page">
      <h1>Checkout</h1>
      <form className="two-col" onSubmit={submit} noValidate>
        <div className="checkout-form">
          <fieldset>
            <legend>Your details</legend>
            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input className="input" value={form.name} onChange={set('name')} required autoComplete="name" />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  className="input"
                  value={form.phone}
                  onChange={set('phone')}
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                />
              </label>
            </div>
            <p className="muted small">The baker will call this number if there’s a question about your order.</p>
          </fieldset>

          <fieldset>
            <legend>Pickup or delivery</legend>
            <div className="choice-group">
              <label className={`choice${form.fulfilment === 'pickup' ? ' is-checked' : ''}`}>
                <input type="radio" name="fulfilment" value="pickup" checked={form.fulfilment === 'pickup'} onChange={set('fulfilment')} />
                <span className="choice-title">Pick it up</span>
                <span className="choice-sub">Free. {BAKERY.pickupAddress}</span>
              </label>
              <label className={`choice${form.fulfilment === 'delivery' ? ' is-checked' : ''}`}>
                <input type="radio" name="fulfilment" value="delivery" checked={form.fulfilment === 'delivery'} onChange={set('fulfilment')} />
                <span className="choice-title">Deliver to me</span>
                <span className="choice-sub">{meta ? formatPrice(meta.deliveryFee) : '…'} within {BAKERY.city.split(',')[0]}</span>
              </label>
            </div>
            {form.fulfilment === 'delivery' && (
              <label className="field">
                <span>Delivery address</span>
                <textarea className="input" rows={3} value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="House number, street, area, landmark" />
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend>When do you need it?</legend>
            <label className="field field-date">
              <span>Date</span>
              <input type="date" className="input" value={form.neededBy} min={earliest} max={latest} onChange={set('neededBy')} required />
            </label>
            {maxNotice > 0 && (
              <p className="muted small">
                Something in your cart needs {maxNotice} day{maxNotice > 1 ? 's' : ''} notice, so the earliest date is {formatDate(earliest)}.
              </p>
            )}
            <div className="slot-group" role="radiogroup" aria-label="Time slot">
              {slots.map(slot => (
                <label key={slot.id} className={`slot${form.timeSlot === slot.id ? ' is-checked' : ''}${slot.available ? '' : ' is-disabled'}`}>
                  <input type="radio" name="timeSlot" value={slot.id} checked={form.timeSlot === slot.id} disabled={!slot.available} onChange={set('timeSlot')} />
                  <span>{slot.label}</span>
                  {!slot.available && <small>Too late today</small>}
                </label>
              ))}
            </div>
            {noSlotToday && <p className="notice">All of today’s slots have passed. Choose tomorrow or later.</p>}
          </fieldset>

          <fieldset>
            <legend>Notes for the baker</legend>
            <label className="field">
              <span className="sr-only">Notes</span>
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                value={form.notes}
                onChange={set('notes')}
                placeholder="Allergies, a preferred pickup time, anything else the baker should know…"
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>Payment</legend>
            <div className="choice-group">
              <label className={`choice${form.paymentMethod === 'cash' ? ' is-checked' : ''}`}>
                <input type="radio" name="payment" value="cash" checked={form.paymentMethod === 'cash'} onChange={set('paymentMethod')} />
                <span className="choice-title">Cash</span>
              </label>
              <label className={`choice${form.paymentMethod === 'upi' ? ' is-checked' : ''}`}>
                <input type="radio" name="payment" value="upi" checked={form.paymentMethod === 'upi'} onChange={set('paymentMethod')} />
                <span className="choice-title">UPI</span>
              </label>
            </div>
            <p className="muted small">You pay when you collect your order. Nothing is charged now.</p>
          </fieldset>
        </div>

        <aside className="summary">
          <h2>Your order</h2>
          <ul className="summary-lines">
            {lines.map(l => {
              const variant = variantLabel(l.options)
              return (
                <li key={l.lineId}>
                  <span>{l.quantity} × {l.name}{variant && <span className="muted"> ({variant})</span>}</span>
                  <span>{formatPrice(l.price * l.quantity)}</span>
                </li>
              )
            })}
          </ul>

          <div className="coupon">
            <AnimatePresence mode="wait" initial={false}>
              {coupon ? (
                <motion.div key="applied" className="coupon-applied" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <span><strong>{coupon.code}</strong> applied{coupon.description ? `: ${coupon.description}` : ''}</span>
                  <button type="button" className="link-button" onClick={() => { setCoupon(null); setCouponInput('') }}>Remove</button>
                </motion.div>
              ) : (
                <motion.div key="enter" className="coupon-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <input
                    className="input"
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                    aria-label="Coupon code"
                  />
                  <button type="button" className="btn btn-ghost btn-small" onClick={applyCoupon} disabled={checkingCoupon || !couponInput.trim()}>
                    {checkingCoupon ? 'Checking…' : 'Apply'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {couponError && <p className="warn small">{couponError}</p>}
          </div>

          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <AnimatePresence>
              {discount > 0 && (
                <motion.div className="totals-discount" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <dt>Discount</dt><dd>−{formatPrice(discount)}</dd>
                </motion.div>
              )}
            </AnimatePresence>
            <div><dt>Delivery</dt><dd>{deliveryFee ? formatPrice(deliveryFee) : 'Free'}</dd></div>
            <div className="totals-grand"><dt>Total</dt><dd><AnimatedPrice value={subtotal - discount + deliveryFee} /></dd></div>
          </dl>
          {form.neededBy && (
            <p className="muted small">
              For {formatDate(form.neededBy, { weekday: 'long', day: 'numeric', month: 'long' })}
              {form.timeSlot && `, ${slots.find(s => s.id === form.timeSlot)?.label.toLowerCase()}`}
            </p>
          )}
          {error && <p className="notice notice-bad" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !meta || !form.timeSlot}>
            {submitting ? 'Placing your order…' : 'Place order'}
          </button>
          <p className="muted small">The baker confirms every order before baking. You’ll see the update on your order page.</p>
          <Link to="/cart" className="text-link center">Back to cart</Link>
        </aside>
      </form>
    </div>
  )
}
