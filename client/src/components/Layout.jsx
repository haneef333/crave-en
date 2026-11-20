import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BAKERY } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFlyToCart } from '../context/FlyToCartContext'
import CartDrawer from './CartDrawer'
import { AnimatedPrice, RollingNumber } from './Motion'

function CartButton() {
  const { count, openCart } = useCart()
  const { registerTarget, landedAt } = useFlyToCart()
  const ref = useRef(null)
  useEffect(() => { registerTarget('nav', ref.current) }, [registerTarget])

  return (
    <button ref={ref} type="button" className="nav-cart" onClick={openCart} aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
      <span className="nav-cart-label">Cart</span>
      {/* The count bumps when a bake lands in the cart */}
      <motion.span
        key={landedAt}
        className="nav-cart-count"
        initial={landedAt ? { scale: 1.35 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.35 }}
      >
        <RollingNumber value={count} />
      </motion.span>
    </button>
  )
}

function useNavItems() {
  const { user, isAdmin, logout } = useAuth()
  return {
    links: [
      { to: '/menu', label: 'Menu' },
      { to: '/#cakes', label: 'Celebration cakes', hash: true },
      { to: '/#visit', label: 'Pickup and delivery', hash: true },
      ...(user ? [{ to: '/orders', label: 'My orders' }] : []),
      ...(isAdmin ? [{ to: '/admin/menu', label: 'Manage menu' }, { to: '/admin/coupons', label: 'Coupons' }] : []),
    ],
    user,
    logout,
  }
}

function Navbar() {
  const { links, user, logout } = useNavItems()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname, hash } = useLocation()

  // Close the phone menu whenever the page changes
  useEffect(() => { setMenuOpen(false) }, [pathname, hash])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const navLink = (item, className) => item.hash
    ? <Link key={item.to} to={item.to} className={className}>{item.label}</Link>
    : <NavLink key={item.to} to={item.to} className={className}>{item.label}</NavLink>

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="wordmark">{BAKERY.name}</Link>
        <nav className="main-nav" aria-label="Main">
          <div className="nav-links">
            {links.map(item => navLink(item, 'draw'))}
            {user
              ? <button type="button" className="link-button draw" onClick={logout}>Log out</button>
              : <NavLink to="/login" className="draw">Log in</NavLink>}
          </div>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
          <CartButton />
        </nav>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
          >
            <ul>
              {links.map(item => <li key={item.to}>{navLink(item)}</li>)}
              <li>
                {user
                  ? <button type="button" className="link-button" onClick={logout}>Log out</button>
                  : <NavLink to="/login">Log in</NavLink>}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

// On phones, a bar at the bottom keeps the cart one tap away while browsing
function MobileCartBar() {
  const { count, subtotal, openCart } = useCart()
  const { registerTarget } = useFlyToCart()
  const { pathname } = useLocation()
  const hidden = !count || pathname === '/checkout' || pathname.startsWith('/admin')

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          type="button"
          ref={el => registerTarget('bar', el)}
          className="mobile-cart-bar"
          onClick={openCart}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          <span>{count} item{count === 1 ? '' : 's'}, <AnimatedPrice value={subtotal} /></span>
          <strong>View cart</strong>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function Footer() {
  const { links } = useNavItems()
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-col">
            <h2>Pickup</h2>
            <p className="footer-address">{BAKERY.pickupAddress}</p>
          </div>
          <div className="footer-col">
            <h2>Orders</h2>
            <p>{BAKERY.hours}</p>
            <p>Call or WhatsApp <a className="draw" href={`tel:${BAKERY.phone.replace(/\s/g, '')}`}>{BAKERY.phone}</a></p>
          </div>
          <nav className="footer-col" aria-label="Footer">
            <h2>Shop</h2>
            <ul>
              {links.slice(0, 4).map(item => <li key={item.to}><Link to={item.to} className="draw">{item.label}</Link></li>)}
            </ul>
          </nav>
        </div>
        <div className="footer-name">
          <strong>{BAKERY.name}</strong>
          {BAKERY.cityLocal && <span lang="kn">{BAKERY.cityLocal}</span>}
        </div>
        <p className="footer-legal">© {year} {BAKERY.name} {BAKERY.tagline}.</p>
      </div>
    </footer>
  )
}

// New pages fade in quickly. There is no exit animation, so a page never
// waits for the old one to finish leaving.
function AnimatedOutlet() {
  const location = useLocation()
  const outlet = useOutlet()

  useEffect(() => {
    if (location.hash) {
      // Links like /#cakes scroll to that section once the page has drawn
      const id = location.hash.slice(1)
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } else if (!location.state?.sheet) {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.hash]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {outlet}
    </motion.div>
  )
}

export default function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main">
        <AnimatedOutlet />
      </main>
      <Footer />
      <MobileCartBar />
      <CartDrawer />
    </>
  )
}
