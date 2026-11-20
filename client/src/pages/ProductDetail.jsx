import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { errorMessage, getProduct } from '../api/client'
import ProductArt from '../components/ProductArt'
import ProductInfo from '../components/ProductInfo'
import CakeMessage from '../components/CakeMessage'

export default function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const artRef = useRef(null)
  const [options, setOptions] = useState({})
  const onOptionsChange = useCallback(o => setOptions(o), [])

  useEffect(() => {
    setProduct(null)
    setError('')
    getProduct(slug).then(setProduct).catch(err => setError(errorMessage(err, 'That item is not on the menu.')))
  }, [slug])

  if (error) {
    return (
      <div className="container page">
        <p className="notice notice-bad">{error}</p>
        <Link to="/menu" className="text-link">Back to the menu</Link>
      </div>
    )
  }
  if (!product) {
    return (
      <div className="container page">
        <div className="product-detail" aria-hidden="true">
          <div className="skeleton skeleton-art product-art-large" />
          <div>
            <div className="skeleton skeleton-line" style={{ height: 40, width: '70%' }} />
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container page">
      <Link to={`/menu?category=${encodeURIComponent(product.category)}`} className="text-link back-link">
        {product.category}
      </Link>
      <div className="product-detail">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="sheet-art-wrap"
        >
          <ProductArt product={product} className="product-art-large" artRef={artRef} eager />
          {product.customizable && <CakeMessage text={options.message} candles={options.candles} />}
        </motion.div>
        <ProductInfo product={product} artRef={artRef} onOptionsChange={onOptionsChange} />
      </div>
    </div>
  )
}
