import { AnimatePresence, motion } from 'motion/react'

// Shows the message the customer is typing as a little plaque on the cake picture
export default function CakeMessage({ text, candles = 0 }) {
  const shownCandles = Math.min(candles, 10)
  return (
    <div className="cake-message" aria-hidden="true">
      <AnimatePresence>
        {shownCandles > 0 && (
          <motion.div className="cake-candles" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            {Array.from({ length: shownCandles }, (_, i) => (
              <motion.span
                key={i}
                className="candle"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 18 }}
              >
                <motion.i animate={{ scale: [1, 1.25, 0.9, 1], rotate: [-4, 4, -2, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }} />
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {text?.trim() && (
          <motion.div
            className="cake-plaque"
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
