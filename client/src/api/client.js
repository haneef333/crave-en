import axios from 'axios'

const TOKEN_KEY = 'bakery_token'

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(token) {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  },
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
})

api.interceptors.request.use(config => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Turn any API error into a readable sentence for the UI
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.code === 'ECONNABORTED') return 'The bakery server is taking too long to respond. Try again in a moment.'
  if (!err?.response) return 'Could not reach the bakery server. Check your connection and try again.'
  return err.response.data?.message || fallback
}

export default api

// --- auth
export const register = body => api.post('/auth/register', body).then(r => r.data)
export const login = body => api.post('/auth/login', body).then(r => r.data)
export const getMe = () => api.get('/auth/me').then(r => r.data.user)

// --- menu
export const getMeta = () => api.get('/meta').then(r => r.data)
export const getProducts = params => api.get('/products', { params }).then(r => r.data)
export const getProduct = slug => api.get(`/products/${encodeURIComponent(slug)}`).then(r => r.data)
export const getAvailability = () => api.get('/products/availability').then(r => r.data)

// --- orders
export const placeOrder = body => api.post('/orders', body).then(r => r.data)
export const getMyOrders = () => api.get('/orders/mine').then(r => r.data)
export const getOrder = number => api.get(`/orders/${encodeURIComponent(number)}`).then(r => r.data)
export const cancelOrder = number => api.post(`/orders/${encodeURIComponent(number)}/cancel`).then(r => r.data)

// --- owner: menu management
export const getAllProducts = () => api.get('/products', { params: { all: 1 } }).then(r => r.data)
export const getRecipeNames = () => api.get('/products/recipe-names').then(r => r.data)
export const createProduct = body => api.post('/products', body).then(r => r.data)
export const updateProduct = (id, body) => api.put(`/products/${id}`, body).then(r => r.data)
export const deleteProduct = id => api.delete(`/products/${id}`).then(r => r.data)

// --- accounts
export const googleLogin = credential => api.post('/auth/google', { credential }).then(r => r.data)
export const forgotPassword = email => api.post('/auth/forgot', { email }).then(r => r.data)
export const resetPassword = (token, password) => api.post('/auth/reset', { token, password }).then(r => r.data)

// --- photos (sent as a form, not JSON)
function uploadPhoto(path, file) {
  const form = new FormData()
  form.append('photo', file)
  return api.post(path, form, { timeout: 60000 }).then(r => r.data.url)
}
export const uploadReferencePhoto = file => uploadPhoto('/uploads/reference', file)
export const uploadProductPhoto = file => uploadPhoto('/uploads/product', file)

// --- reviews
export const getReviews = productId => api.get(`/products/${productId}/reviews`).then(r => r.data)
export const getMyReviews = () => api.get('/reviews/mine').then(r => r.data)
export const saveReview = body => api.post('/reviews', body).then(r => r.data)
export const deleteReview = id => api.delete(`/reviews/${id}`).then(r => r.data)

// --- coupons
export const validateCoupon = (code, subtotal) => api.post('/coupons/validate', { code, subtotal }).then(r => r.data)
export const getCoupons = () => api.get('/coupons').then(r => r.data)
export const createCoupon = body => api.post('/coupons', body).then(r => r.data)
export const updateCoupon = (id, body) => api.put(`/coupons/${id}`, body).then(r => r.data)
export const deleteCoupon = id => api.delete(`/coupons/${id}`).then(r => r.data)
