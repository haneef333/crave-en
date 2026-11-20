// Small animated building blocks shared across pages.
import { useEffect } from 'react'
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import { formatPrice } from '../utils'

// A price that counts up or down smoothly when it changes
export function AnimatedPrice({ value, className }) {
  const spring = useSpring(value, { stiffness: 160, damping: 22 })
  const text = useTransform(spring, v => formatPrice(Math.round(v)))
  useEffect(() => { spring.set(value) }, [spring, value])
  return <motion.span className={className}>{text}</motion.span>
}

// A number that rolls up or down (used in quantity steppers and the cart badge)
export function RollingNumber({ value, className }) {
  return (
    <span className={`rolling ${className || ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-90%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '90%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// Placeholder cards while the menu loads
export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-art" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  )
}
