import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

// The product sheet is driven by ?item=<slug> in the URL, so the phone's
// back button closes it and a link with ?item= opens straight to it.
export function useProductSheet(products) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const slug = params.get('item')
  const selected = slug && products ? products.find(p => p.slug === slug) || null : null

  // initialOptions (optional) pre-fills the sheet, e.g. the cake message typed on the home page
  const open = useCallback((product, initialOptions) => {
    const next = new URLSearchParams(params)
    next.set('item', product.slug)
    setParams(next, { state: { sheet: true, initialOptions }, preventScrollReset: true })
  }, [params, setParams])

  const close = useCallback(() => {
    if (location.state?.sheet) {
      navigate(-1)
    } else {
      const next = new URLSearchParams(params)
      next.delete('item')
      setParams(next, { replace: true, preventScrollReset: true })
    }
  }, [location.state, navigate, params, setParams])

  return { selected, open, close, initialOptions: location.state?.initialOptions }
}
