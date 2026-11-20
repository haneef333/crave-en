import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { errorMessage, getProducts } from '../api/client'
import ProductCard from '../components/ProductCard'
import ProductSheet from '../components/ProductSheet'
import { SkeletonGrid } from '../components/Motion'
import { useAvailability, useMeta } from '../hooks/useBakeryData'
import { useProductSheet } from '../hooks/useProductSheet'

export default function Menu() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  const meta = useMeta()
  const availability = useAvailability()
  const sheet = useProductSheet(products)

  // The menu is small, so load it once and filter in the browser.
  // That's what lets cards slide into place when you switch category.
  useEffect(() => {
    getProducts().then(setProducts).catch(err => setError(errorMessage(err)))
  }, [])

  const visible = useMemo(() => {
    if (!products) return null
    const q = query.trim().toLowerCase()
    return products.filter(p => {
      if (category && p.category !== category) return false
      if (!q) return true
      return [p.name, p.description, ...(p.tags || [])].some(t => t?.toLowerCase().includes(q))
    })
  }, [products, category, query])

  function chooseCategory(c) {
    const next = new URLSearchParams(params)
    if (c) next.set('category', c)
    else next.delete('category')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Menu</h1>
        <input
          type="search"
          className="input search-input"
          placeholder="Search brownies, cakes, bread…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search the menu"
        />
      </div>

      <div className="chips" role="tablist" aria-label="Categories">
        {['', ...(meta?.categories || [])].map(c => {
          const active = category === c
          return (
            <button
              key={c || 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              className={`chip${active ? ' is-active' : ''}`}
              onClick={() => chooseCategory(c)}
            >
              {active && (
                <motion.span layoutId="chip-pill" className="chip-pill" transition={{ type: 'spring', duration: 0.35, bounce: 0 }} />
              )}
              <span className="chip-label">{c || 'Everything'}</span>
            </button>
          )
        })}
      </div>

      {error && <p className="notice notice-bad">{error}</p>}
      {!visible && !error && <SkeletonGrid />}

      <AnimatePresence>
        {visible && visible.length === 0 && (
          <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p>Nothing matches {query ? `“${query}”` : 'this category'} right now.</p>
            <button type="button" className="btn btn-ghost" onClick={() => { setQuery(''); chooseCategory('') }}>
              Show everything
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {visible && (
        <motion.div className="product-grid" layout>
          <AnimatePresence mode="popLayout">
            {visible.map(p => (
              <motion.div
                key={p._id}
                layout
                // Switching category is done often, so no stagger: cards fade in together
                // while the ones that stay slide into their new places
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, ease: 'easeOut', layout: { type: 'spring', duration: 0.4, bounce: 0 } }}
              >
                <ProductCard product={p} availability={availability} onOpen={sheet.open} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ProductSheet product={sheet.selected} onClose={sheet.close} />
    </div>
  )
}
