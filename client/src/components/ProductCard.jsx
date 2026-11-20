import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProductArt from './ProductArt'
import QuantityStepper from './QuantityStepper'
import { useCart } from '../context/CartContext'
import { useFlyToCart } from '../context/FlyToCartContext'
import { useToast } from '../context/ToastContext'
import { remainingFor } from '../hooks/useBakeryData'
import { formatPrice, noticeLabel } from '../utils'
import { hasOptions } from '../pricing'
import { Stars } from './Stars'

const isPlainClick = e => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

export default function ProductCard({ product, availability, onOpen }) {
  const { add, quantityOf, setQuantity, plainLineId } = useCart()
  const { fly } = useFlyToCart()
  const toast = useToast()
  const artRef = useRef(null)
  const navigate = useNavigate()
  const inCart = quantityOf(product._id)
  const canMake = remainingFor(product, availability, 0)
  const soldOut = canMake === 0
  const atLimit = canMake !== null && inCart >= canMake
  const customizable = hasOptions(product)

  function addOne() {
    fly(artRef.current, product)
    add(product)
    toast(`Added ${product.name}`)
  }

  return (
    <article className={`product-card${soldOut ? ' is-sold-out' : ''}`}>
      <Link
        to={`/menu/${product.slug}`}
        className="product-card-link"
        onClick={e => {
          // A normal click opens the quick-view sheet; ctrl/cmd-click still opens the full page
          if (onOpen && isPlainClick(e)) { e.preventDefault(); onOpen(product) }
        }}
      >
        <div className="product-card-art">
          <ProductArt product={product} layoutId={onOpen ? `art-${product._id}` : undefined} artRef={artRef} radius={0} />
        </div>
        <div className="product-card-body">
          <h3>{product.name}</h3>
          <p className="product-meta">{product.unitLabel}</p>
          {product.ratingCount > 0 && (
            <p className="card-rating"><Stars value={product.ratingAvg} size={13} /> {product.ratingAvg.toFixed(1)} <span className="muted">({product.ratingCount})</span></p>
          )}
          {product.minNoticeDays > 0 && <p className="product-notice">{noticeLabel(product.minNoticeDays)}</p>}
          {product.tags?.[0] && <span className="card-tag">{product.tags[0]}</span>}
        </div>
      </Link>
      <div className="product-card-foot">
        <span className="price">
          {product.sizes?.length > 0 && <small className="price-from">from </small>}
          {formatPrice(product.fromPrice ?? product.price)}
        </span>
        {soldOut ? (
          <span className="sold-out">Out of stock today</span>
        ) : customizable ? (
          // Items with options open the sheet so the customer can choose
          <button
            type="button"
            className="btn btn-add"
            onClick={() => (onOpen ? onOpen(product) : navigate(`/menu/${product.slug}`))}
          >
            {inCart ? `${inCart} in cart` : 'Choose options'}
          </button>
        ) : inCart ? (
          <QuantityStepper
            value={inCart}
            max={canMake ?? 50}
            onChange={q => setQuantity(plainLineId(product._id), q)}
            label={product.name}
            small
          />
        ) : (
          <button type="button" className="btn btn-add" disabled={atLimit} onClick={addOne}>
            Add
          </button>
        )}
      </div>
    </article>
  )
}
