import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { deleteReview, getReviews } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Stars } from './Stars'

export default function ProductReviews({ product }) {
  const [reviews, setReviews] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const { user, isAdmin } = useAuth()
  const toast = useToast()

  useEffect(() => {
    getReviews(product._id).then(setReviews).catch(() => setReviews([]))
  }, [product._id])

  if (!reviews) return null
  if (reviews.length === 0) {
    return <p className="muted small reviews-empty">No reviews yet. Customers can review an item once they’ve received it.</p>
  }

  async function remove(id) {
    try {
      await deleteReview(id)
      setReviews(list => list.filter(r => r._id !== id))
      toast('Review deleted')
    } catch {
      toast('Could not delete that review.', 'bad')
    }
  }

  const shown = showAll ? reviews : reviews.slice(0, 3)
  return (
    <section className="reviews" aria-label="Reviews">
      <div className="reviews-head">
        <h3>Reviews</h3>
        <span className="reviews-avg"><Stars value={product.ratingAvg} /> {product.ratingAvg?.toFixed(1)} from {product.ratingCount}</span>
      </div>
      <ul className="review-list">
        <AnimatePresence initial={false}>
          {shown.map(r => (
            <motion.li key={r._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
              <div className="review-top">
                <Stars value={r.rating} size={14} />
                <strong>{r.userName}</strong>
                <span className="muted small">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
              {r.comment && <p>{r.comment}</p>}
              {(isAdmin || r.user === user?.id) && (
                <button type="button" className="link-button danger small" onClick={() => remove(r._id)}>Delete</button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {reviews.length > 3 && (
        <button type="button" className="link-button" onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show fewer' : `Show all ${reviews.length} reviews`}
        </button>
      )}
    </section>
  )
}
