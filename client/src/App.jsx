import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Home from './pages/Home'
import Menu from './pages/Menu'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import { ForgotPassword, Login, Register, ResetPassword } from './pages/Auth'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import ManageMenu from './pages/admin/ManageMenu'
import ManageCoupons from './pages/admin/ManageCoupons'

function NotFound() {
  return (
    <div className="container page narrow">
      <h1>Page not found</h1>
      <p className="muted">That link doesn’t go anywhere on this site.</p>
      <Link to="/menu" className="btn btn-primary">Go to the menu</Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="menu" element={<Menu />} />
          <Route path="menu/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="orders/:orderNumber" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="admin/menu" element={<RequireAuth admin><ManageMenu /></RequireAuth>} />
          <Route path="admin/coupons" element={<RequireAuth admin><ManageCoupons /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
