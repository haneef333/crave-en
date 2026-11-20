// "Add to cart" animation: a copy of the product picture flies in an arc
// from where you clicked to the cart button, then the cart badge bounces.
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import ProductArt from '../components/ProductArt'

const FlyContext = createContext({ fly: () => {}, registerTarget: () => {}, landedAt: 0 })
const SIZE = 64

function isOnScreen(el) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.top >= 0 && r.bottom <= window.innerHeight
}

export function FlyToCartProvider({ children }) {
  const targets = useRef({})
  const [flights, setFlights] = useState([])
  const [landedAt, setLandedAt] = useState(0)
  const reduceMotion = useReducedMotion()

  const registerTarget = useCallback((name, el) => {
    targets.current[name] = el
  }, [])

  const fly = useCallback((fromEl, product) => {
    if (reduceMotion || !fromEl) {
      setLandedAt(Date.now())
      return
    }
    const from = fromEl.getBoundingClientRect()
    const target = ['nav', 'bar'].map(n => targets.current[n]).find(isOnScreen)
    const to = target
      ? target.getBoundingClientRect()
      : { left: window.innerWidth / 2 - SIZE / 2, top: window.innerHeight - 70, width: SIZE, height: SIZE }

    setFlights(list => [...list, {
      id: `${Date.now()}-${Math.random()}`,
      product,
      x0: from.left + from.width / 2 - SIZE / 2,
      y0: from.top + from.height / 2 - SIZE / 2,
      x1: to.left + to.width / 2 - SIZE / 2,
      y1: to.top + to.height / 2 - SIZE / 2,
    }])
  }, [reduceMotion])

  const land = useCallback(id => {
    setFlights(list => list.filter(f => f.id !== id))
    setLandedAt(Date.now())
  }, [])

  return (
    <FlyContext.Provider value={{ fly, registerTarget, landedAt }}>
      {children}
      <div className="fly-layer" aria-hidden="true">
        <AnimatePresence>
          {flights.map(f => (
            <motion.div
              key={f.id}
              className="fly-item"
              initial={{ x: f.x0, y: f.y0, scale: 1, opacity: 1 }}
              animate={{
                x: [f.x0, (f.x0 + f.x1) / 2, f.x1],
                y: [f.y0, Math.max(8, Math.min(f.y0, f.y1) - 100), f.y1],
                scale: [1, 0.9, 0.35],
              }}
              transition={{ duration: 0.6, times: [0, 0.45, 1], ease: [0.77, 0, 0.175, 1] }}
              onAnimationComplete={() => land(f.id)}
            >
              <ProductArt product={f.product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </FlyContext.Provider>
  )
}

export const useFlyToCart = () => useContext(FlyContext)
