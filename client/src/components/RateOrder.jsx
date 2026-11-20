// After an order is completed, the customer can rate each item in it
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { errorMessage, getMyReviews, saveReview } from '../api/client'
import { useToast } from '../context/ToastContext'
import ProductArt from './ProductArt'
import { StarInput } from './Stars'

function RateItem({ item, existing, onSaved }) {
  const [rating, setRating] = useState(existing?.rating || 0)
  const [comment, setComment] = useState(existing?.comment || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(Boolean(existing))
  const toast = useToast()

  async function save() {
    setSaving(true)
    try {
      const review = await saveReview({ productId: item.product, rating, comment })
      setSaved(true)
      onSaved(review)
      toast(existing ? 'Review updated' : 'Thanks for your review!')
    } catch (err) {
      toast(errorMessage(err), 'bad')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="rate-item">
      <div className="rate-thumb"><ProductArt product={item} /></div>
      <div className="rate-body">
        <strong>{item.name}</strong>
        <StarInput value={rating} onChange={v => { setRating(v); setSaved(false) }} size={26} />
        <AnimatePresence>
          {rating > 0 && !saved && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <textarea className="input" rows={2} maxLength={500} placeholder="What did you like? (optional)" value={comment} onChange={e => setComment(e.target.value)} />
              <button type="button" className="btn btn-primary btn-small" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : existing ? 'Update review' : 'Post review'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {saved && <span className="muted small">Thanks! Your review is on the menu.</span>}
      </div>
    </li>
  )
}

export default function RateOrder({ order }) {
  const [mine, setMine] = useState(null)
  useEffect(() => { getMyReviews().then(setMine).catch(() => setMine([])) }, [])
  if (!mine) return null

  // One row per product, even if it was ordered in two sizes
  const unique = [...new Map(order.items.map(i => [String(i.product), i])).values()]
  const byProduct = Object.fromEntries(mine.map(r => [String(r.product), r]))

  return (
    <section className="rate-order">
      <h2>Rate your bakes</h2>
      <ul>
        {unique.map(item => (
          <RateItem
            key={String(item.product)}
            item={item}
            existing={byProduct[String(item.product)]}
            onSaved={review => setMine(list => [...list.filter(r => String(r.product) !== String(review.product)), review])}
          />
        ))}
      </ul>
    </section>
  )
}
