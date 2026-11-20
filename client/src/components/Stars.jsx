import { useState } from 'react'
import { motion } from 'motion/react'

const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'

// Read-only stars, e.g. ★★★★☆ 4.2
export function Stars({ value = 0, size = 16, label }) {
  return (
    <span className="stars" role="img" aria-label={label || `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)))
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={`star-${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="var(--butter-deep)" />
                <stop offset={`${fill * 100}%`} stopColor="transparent" />
              </linearGradient>
            </defs>
            <path d={STAR} fill={`url(#star-${i}-${Math.round(fill * 100)})`} stroke="var(--cocoa)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        )
      })}
    </span>
  )
}

// Clickable stars for writing a review
export function StarInput({ value, onChange, size = 30 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="star-input" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(i => (
        <motion.button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          whileTap={{ scale: 0.8 }}
          animate={{ scale: shown >= i ? 1.08 : 1 }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d={STAR} fill={shown >= i ? 'var(--butter-deep)' : 'var(--white)'} stroke="var(--cocoa)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </motion.button>
      ))}
    </div>
  )
}
