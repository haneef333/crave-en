// Name, price, options and the add-to-cart controls for one product.
// Used by the quick-view sheet and by the full product page.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import QuantityStepper from './QuantityStepper'
import ProductOptions from './ProductOptions'
import ProductReviews from './ProductReviews'
import { AnimatedPrice } from './Motion'
import { Stars } from './Stars'
import { useCart } from '../context/CartContext'
import { useFlyToCart } from '../context/FlyToCartContext'
import { useToast } from '../context/ToastContext'
import { remainingFor, useAvailability } from '../hooks/useBakeryData'
import { defaultOptions, hasOptions, unitPriceFor, variantLabel } from '../pricing'
import { noticeLabel } from '../utils'

// Only the celebration details can be carried over (message and candles), and only on cakes that take them
function withStarter(product, starter) {
  const opts = defaultOptions(product)
  if (!product.customizable || !starter) return opts
  if (typeof starter.message === 'string' && starter.message.trim()) opts.message = starter.message.slice(0, 40)
  if (Number.isInteger(starter.candles) && starter.candles > 0) opts.candles = Math.min(starter.candles, 20)
  return opts
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

export default function ProductInfo({ product, artRef, headingLevel = 'h1', onAdded, onOptionsChange, initialOptions, showFullPageLink = false }) {
  const [qty, setQty] = useState(1)
  const [options, setOptions] = useState(() => withStarter(product, initialOptions))
  const { add, quantityOf, openCart } = useCart()
  const { fly } = useFlyToCart()
  const toast = useToast()
  const availability = useAvailability()

  useEffect(() => { onOptionsChange?.(options) }, [options, onOptionsChange])

  const customizable = hasOptions(product)
  const unitPrice = unitPriceFor(product, options)
  const inCart = quantityOf(product._id)
  // Bigger cakes use more of the recipe, so they use up more of what can be baked
  const scale = product.sizes?.find(s => s.label === options.size)?.recipeScale || 1
  const remaining = remainingFor(product, availability, inCart * scale)
  const canMakeNow = remaining === null ? null : Math.floor(remaining / scale)
  const soldOut = remainingFor(product, availability, 0) === 0
  const maxQty = Math.max(1, Math.min(50, canMakeNow ?? 50))
  const unavailable = !product.isAvailable || soldOut
  const Heading = motion[headingLevel]

  function addToCart() {
    fly(artRef?.current, product)
    add(product, qty, options)
    const variant = variantLabel(options)
    toast(`Added ${qty} × ${product.name}${variant ? ` (${variant})` : ''}`)
    setQty(1)
    onAdded?.()
  }

  return (
    // One entrance per container: the sheet or page moves in, the details are simply there
    <motion.div className="product-info">
      <Heading variants={item} className="product-info-title">{product.name}</Heading>
      <motion.p variants={item} className="product-detail-price">
        <AnimatedPrice className="price" value={unitPrice} />
        <span className="muted">{options.size || product.unitLabel}</span>
        {product.ratingCount > 0 && (
          <span className="rating-inline"><Stars value={product.ratingAvg} size={15} /> {product.ratingAvg.toFixed(1)} ({product.ratingCount})</span>
        )}
      </motion.p>
      {product.description && <motion.p variants={item} className="product-description">{product.description}</motion.p>}

      <motion.ul variants={item} className="facts">
        <li>{noticeLabel(product.minNoticeDays)}</li>
        {product.tags?.map(t => <li key={t}>{t}</li>)}
      </motion.ul>

      {customizable && !unavailable && (
        <motion.div variants={item}>
          <ProductOptions product={product} options={options} onChange={setOptions} />
        </motion.div>
      )}

      {!product.isAvailable && <motion.p variants={item} className="notice">This item is not on the menu right now.</motion.p>}
      {product.isAvailable && soldOut && (
        <motion.p variants={item} className="notice">We’re out of ingredients for this today. Check back tomorrow, or call us.</motion.p>
      )}
      {product.isAvailable && !soldOut && canMakeNow !== null && canMakeNow <= 5 && (
        <motion.p variants={item} className="notice">
          {canMakeNow === 0 ? 'Not enough stock for this size today. Try a smaller size.' : `Only ${canMakeNow} more can be baked with today’s stock.`}
        </motion.p>
      )}

      {!unavailable && (
        <motion.div variants={item} className="buy-row">
          <QuantityStepper value={qty} onChange={setQty} min={1} max={maxQty} label={product.name} />
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={addToCart}
            disabled={canMakeNow === 0}
          >
            <span>Add to cart</span>
            <AnimatedPrice className="btn-price" value={unitPrice * qty} />
          </motion.button>
        </motion.div>
      )}
      {inCart > 0 && (
        <motion.p variants={item} className="muted in-cart-note">
          {inCart} in your cart.{' '}
          <button type="button" className="link-button" onClick={openCart}>View cart</button>
        </motion.p>
      )}

      <motion.div variants={item}>
        <ProductReviews product={product} />
      </motion.div>

      {showFullPageLink && (
        <motion.p variants={item} className="small">
          <Link to={`/menu/${product.slug}`} className="text-link">Open the full page</Link>
        </motion.p>
      )}
    </motion.div>
  )
}

