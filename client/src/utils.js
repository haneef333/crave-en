const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const formatPrice = amount => inr.format(amount || 0)

export function formatDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', opts)
}

export function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function noticeLabel(days) {
  if (!days) return 'Ready the same day'
  return days === 1 ? 'Order 1 day ahead' : `Order ${days} days ahead`
}

// Photos uploaded to the API server come back as "/uploads/…". In development
// Vite forwards those; in production they need the API's own address in front.
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')
export const assetUrl = url => (url && url.startsWith('/uploads/') ? `${API_ORIGIN}${url}` : url)
