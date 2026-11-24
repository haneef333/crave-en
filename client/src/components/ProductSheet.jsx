// Quick view: the product opens over the menu. On phones it's a bottom sheet
// you can drag down to close; on larger screens it's a centred dialog.
// The picture morphs from the card into the sheet (shared layoutId).
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import ProductArt, { productPhoto } from './ProductArt'
import ProductInfo from './ProductInfo'
import CakeMessage from './CakeMessage'

function Sheet({ product, initialOptions, onClose }) {
  const artRef = useRef(null)
  const closeRef = useRef(null)
  const dragControls = useDragControls()
  const [options, setOptions] = useState({})
  const onOptionsChange = useCallback(o => setOptions(o), [])

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="sheet-root">
      <motion.div
        className="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
        transition={{ type: 'spring', duration: 0.45, bounce: 0 }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }}
      >
        <div className="sheet-handle" onPointerDown={e => dragControls.start(e)} aria-hidden="true"><span /></div>
        <button ref={closeRef} type="button" className="sheet-close" onClick={onClose} aria-label="Close">×</button>
        <div className="sheet-art-wrap">
          <ProductArt product={product} layoutId={`art-${product._id}`} artRef={artRef} className="sheet-art" radius={0} eager />
          {product.customizable && <CakeMessage text={options.message} candles={options.candles} photo={Boolean(productPhoto(product))} />}
        </div>
        <div className="sheet-body">
          <ProductInfo product={product} artRef={artRef} headingLevel="h2" showFullPageLink initialOptions={initialOptions} onOptionsChange={onOptionsChange} />
        </div>
      </motion.div>
    </div>
  )
}

export default function ProductSheet({ product, initialOptions, onClose }) {
  return (
    <AnimatePresence>
      {product && <Sheet key={product._id} product={product} initialOptions={initialOptions} onClose={onClose} />}
    </AnimatePresence>
  )
}
