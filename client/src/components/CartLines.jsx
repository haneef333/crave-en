import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import ProductArt from './ProductArt'
import QuantityStepper from './QuantityStepper'
import { AnimatedPrice } from './Motion'
import { useCart } from '../context/CartContext'
import { celebrationLabel, variantLabel } from '../pricing'
import { assetUrl, formatPrice, noticeLabel } from '../utils'

// The list of items in the cart. Removed items slide away; the rest close the gap.
export default function CartLines({ compact = false, onNavigate }) {
  const { lines, setQuantity, remove } = useCart()

  return (
    <ul className={`cart-lines${compact ? ' cart-lines-compact' : ''}`}>
      <AnimatePresence initial={false}>
        {lines.map(line => {
          const variant = variantLabel(line.options)
          const extras = celebrationLabel(line.options)
          return (
            <motion.li
              key={line.lineId}
              className="cart-line"
              layout
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <Link to={`/menu/${line.slug}`} className="cart-thumb" tabIndex={-1} aria-hidden="true" onClick={onNavigate}>
                <ProductArt product={line} />
              </Link>
              <div className="cart-line-info">
                <Link to={`/menu/${line.slug}`} className="cart-line-name" onClick={onNavigate}>{line.name}</Link>
                <span className="muted">{variant || line.unitLabel}</span>
                {extras && <span className="cart-line-extras">{extras}</span>}
                {line.options?.referencePhotoUrl && (
                  <span className="cart-line-photo"><img src={assetUrl(line.options.referencePhotoUrl)} alt="" /> Reference photo added</span>
                )}
                {line.minNoticeDays > 0 && <span className="product-notice">{noticeLabel(line.minNoticeDays)}</span>}
              </div>
              <div className="cart-line-actions">
                <QuantityStepper value={line.quantity} onChange={q => setQuantity(line.lineId, q)} min={1} label={line.name} small />
                <button type="button" className="link-button" onClick={() => remove(line.lineId)}>Remove</button>
              </div>
              <span className="cart-line-total">
                <AnimatedPrice value={line.price * line.quantity} />
                {line.quantity > 1 && <small>{formatPrice(line.price)} each</small>}
              </span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
