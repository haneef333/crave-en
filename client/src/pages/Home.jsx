import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { getProducts } from '../api/client'
import { BAKERY } from '../config'
import { PHOTOS, PHOTO_ALT } from '../photos'
import Photo from '../components/Photo'
import ProductArt from '../components/ProductArt'
import ProductCard from '../components/ProductCard'
import ProductSheet from '../components/ProductSheet'
import QuantityStepper from '../components/QuantityStepper'
import CakeMessage from '../components/CakeMessage'
import { SkeletonGrid } from '../components/Motion'
import { useAvailability, useMeta } from '../hooks/useBakeryData'
import { useProductSheet } from '../hooks/useProductSheet'
import { formatPrice } from '../utils'

const TOWN = BAKERY.city.split(',')[0]
const HERO_LINES = ['Home bakery', `in ${TOWN}`]
const EASE_OUT = [0.23, 1, 0.32, 1]
const EASE_IN_OUT = [0.77, 0, 0.175, 1]

// Drawn bakes stand in for the photographs until the bakery adds its own
const art = category => <ProductArt product={{ category, name: category }} />

/* ---------- hero ---------- */

// The hero plays its entrance once per visit, not every time you come back to the home page
function useFirstVisit() {
  const [first] = useState(() => {
    try {
      const seen = sessionStorage.getItem('hero-seen')
      sessionStorage.setItem('hero-seen', '1')
      return !seen
    } catch {
      return true
    }
  })
  return first
}

function Hero({ onDesignCake }) {
  const reduce = useReducedMotion()
  const animate = useFirstVisit() && !reduce

  // Lead: the headline lines rise out of a mask, slightly overlapped.
  // Support: intro and buttons follow with smaller moves. The photo is revealed from the bottom at the same time.
  const line = i => animate
    ? { initial: { y: '105%' }, animate: { y: '0%' }, transition: { duration: 0.7, ease: EASE_OUT, delay: i * 0.09 } }
    : {}
  const support = (delay, distance) => animate
    ? { initial: { opacity: 0, y: distance }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: EASE_OUT, delay } }
    : {}

  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy">
          <motion.p className="hero-note" {...(animate ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: 0.3 } } : {})}>
            {BAKERY.hours}
          </motion.p>
          <h1 aria-label={HERO_LINES.join(' ')}>
            {HERO_LINES.map((text, i) => (
              <span className="hero-line" key={text} aria-hidden="true">
                <motion.span {...line(i)}>{text}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="hero-intro" {...support(0.22, 10)}>
            Brownies, cookies, breads and celebration cakes, baked for your order in our home kitchen.
          </motion.p>
          <motion.div className="hero-actions" {...support(0.3, 8)}>
            <Link to="/menu" className="btn btn-primary btn-large">Order now</Link>
            <button type="button" className="btn btn-large" onClick={onDesignCake}>Design a cake</button>
          </motion.div>
        </div>

        <motion.figure
          className="hero-photo"
          {...(animate ? {
            initial: { clipPath: 'inset(100% 0% 0% 0%)' },
            animate: { clipPath: 'inset(0% 0% 0% 0%)' },
            transition: { duration: 1, ease: EASE_IN_OUT },
          } : {})}
        >
          {PHOTOS.hero ? (
            <motion.img
              src={PHOTOS.hero}
              alt={PHOTO_ALT.hero}
              fetchPriority="high"
              {...(animate ? { initial: { scale: 1.08 }, animate: { scale: 1 }, transition: { duration: 1.2, ease: EASE_OUT } } : {})}
            />
          ) : (
            <div className="counter-fallback" aria-hidden="true">
              {['Cakes', 'Brownies', 'Cookies', 'Breads'].map(c => <ProductArt key={c} product={{ category: c, name: c }} eager />)}
            </div>
          )}
        </motion.figure>
      </div>
    </section>
  )
}

/* ---------- celebration cakes: type a message and see it on the cake ---------- */

function CelebrationCakes({ cake, meta, onDesign }) {
  const [message, setMessage] = useState('')
  const [candles, setCandles] = useState(0)
  const max = meta?.messageMax || 40

  return (
    <section className="cakes" id="cakes" aria-labelledby="cakes-title">
      <div className="container cakes-inner">
        <div className="cakes-head">
          <h2 id="cakes-title">Cakes for birthdays and anniversaries</h2>
          <p>
            Choose the size and flavour, make it eggless if you like, and write a message for the top.
            {cake.minNoticeDays > 0 && ` Order ${cake.minNoticeDays === 1 ? 'a day' : `${cake.minNoticeDays} days`} ahead.`}
          </p>

          {cake.sizes?.length > 0 && (
            <ul className="cakes-sizes" aria-label="Sizes and prices">
              {cake.sizes.map(s => (
                <li key={s.label}><span>{s.label}</span><span>{formatPrice(s.price)}</span></li>
              ))}
            </ul>
          )}
        </div>

        <Photo
          className="cakes-photo"
          src={PHOTOS.cakes[0]}
          alt={PHOTO_ALT.cakes[0]}
          fallback={<ProductArt product={cake} />}
        >
          <CakeMessage text={message} candles={candles} />
        </Photo>

        <div className="cakes-actions">
          <div className="cakes-try">
            <label className="field">
              <span>Try a message</span>
              <input
                className="input"
                value={message}
                maxLength={max}
                placeholder="Happy Birthday Sana"
                onChange={e => setMessage(e.target.value)}
              />
            </label>
            <div className="field">
              <span className="field-label" id="candles-label">Candles</span>
              <QuantityStepper value={candles} onChange={setCandles} min={0} max={meta?.candlesMax || 20} label="candles" />
            </div>
          </div>

          <button type="button" className="btn btn-dark btn-large" onClick={() => onDesign({ message, candles })}>
            Design your cake
          </button>
          {cake.flavours?.length > 0 && (
            <p className="muted small" style={{ marginTop: 16 }}>
              Flavours: {cake.flavours.map(f => f.label).join(', ')}.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------- how your order is made: steps change as you scroll ---------- */

function OrderChapters({ meta }) {
  const trackRef = useRef(null)
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] })

  const steps = useMemo(() => [
    { title: 'You order', body: 'Pick your bakes and the day you need them. Cakes need a day’s notice.', art: 'Cookies' },
    { title: 'We confirm', body: 'The baker checks your order against what’s in the kitchen and confirms it. Your order page updates straight away.', art: 'Brownies' },
    { title: 'We bake it', body: 'Your order is baked for you in a small batch, not taken off a shelf.', art: 'Breads' },
    {
      title: 'Pickup or delivery',
      body: `Collect it from our kitchen, or have it delivered in your time slot${meta ? ` for ${formatPrice(meta.deliveryFee)}` : ''}. Pay by cash or UPI when you get it.`,
      art: 'Cakes',
    },
  ], [meta])

  useMotionValueEvent(scrollYProgress, 'change', v => {
    setActive(Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length * 0.999))))
  })

  return (
    <section className="chapters" id="how-we-bake" aria-labelledby="chapters-title">
      <div className="chapters-track" ref={trackRef}>
        <div className="container chapters-sticky">
          <div className="chapters-copy">
            <h2 id="chapters-title">How your order is made</h2>
            <ol className="chapter-list">
              {steps.map((s, i) => (
                <li key={s.title} className={`chapter${i === active ? ' is-active' : ''}`} aria-current={i === active ? 'step' : undefined}>
                  <span className="chapter-number" aria-hidden="true">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <div className="chapter-body">
                    <div>
                      <p>{s.body}</p>
                      <Photo className="chapter-inline-photo" src={PHOTOS.process[i]} alt={PHOTO_ALT.process[i]} fallback={art(s.art)} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="chapters-photos" aria-hidden="true">
            {steps.map((s, i) => (
              <Photo
                key={s.title}
                className={`chapter-photo${i === active ? ' is-active' : ''}`}
                src={PHOTOS.process[i]}
                alt=""
                fallback={art(s.art)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- pickup and delivery ---------- */

function Visit({ meta }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BAKERY.landmark)}`
  const phone = BAKERY.phone.replace(/\s/g, '')
  return (
    <section className="container section" id="visit" aria-labelledby="visit-title">
      <h2 id="visit-title">Pickup and delivery</h2>
      <a className="visit-place" href={mapUrl} target="_blank" rel="noreferrer">
        <span>{BAKERY.landmark}</span>
      </a>
      <div className="visit-grid">
        <div className="visit-panel">
          <div className="visit-cols">
            <div>
              <h3>Pickup</h3>
              <p>{BAKERY.pickupAddress}. Free.</p>
            </div>
            <div>
              <h3>Delivery</h3>
              <p>Anywhere in {TOWN}{meta ? ` for ${formatPrice(meta.deliveryFee)}` : ''}.</p>
            </div>
            <div>
              <h3>Time slots</h3>
              <ul className="visit-slots">
                {(meta?.slots?.later || []).map(s => <li key={s.id}>{s.label}</li>)}
              </ul>
            </div>
            <div>
              <h3>Orders</h3>
              <p>{BAKERY.hours}</p>
            </div>
          </div>
          <div className="visit-actions">
            <a className="btn" href={`tel:${phone}`}>Call {BAKERY.phone}</a>
          </div>
        </div>
        <Photo className="visit-photo" src={PHOTOS.visit} alt={PHOTO_ALT.visit} fallback={art('Pastries')} />
      </div>
    </section>
  )
}

/* ---------- page ---------- */

export default function Home() {
  const [products, setProducts] = useState(null)
  const [error, setError] = useState(false)
  const availability = useAvailability()
  const meta = useMeta()
  const sheet = useProductSheet(products)

  useEffect(() => {
    getProducts().then(setProducts).catch(() => setError(true))
  }, [])

  const featured = useMemo(() => {
    if (!products) return null
    const picked = products.filter(p => p.isFeatured)
    return (picked.length ? picked : products).slice(0, 8)
  }, [products])
  const cake = products?.find(p => p.customizable && p.sizes?.length)

  return (
    <>
      <Hero onDesignCake={() => (cake ? sheet.open(cake) : document.getElementById('cakes')?.scrollIntoView({ behavior: 'smooth' }))} />

      <section className="container section" aria-labelledby="counter-title">
        <div className="section-head">
          <h2 id="counter-title">From the counter</h2>
          <div className="section-head-side">
            <p>Most bakes are ready the same day.</p>
            <Link to="/menu" className="text-link">Full menu</Link>
          </div>
        </div>
        {error && <p className="notice notice-bad">The menu could not be loaded. Refresh the page to try again.</p>}
        {!featured && !error && <SkeletonGrid count={4} />}
        {featured && (
          <div className="product-grid">
            {featured.map(p => (
              <ProductCard key={p._id} product={p} availability={availability} onOpen={sheet.open} />
            ))}
          </div>
        )}
      </section>

      {cake && <CelebrationCakes cake={cake} meta={meta} onDesign={opts => sheet.open(cake, opts)} />}

      <OrderChapters meta={meta} />

      <Visit meta={meta} />

      <ProductSheet product={sheet.selected} initialOptions={sheet.initialOptions} onClose={sheet.close} />
    </>
  )
}
