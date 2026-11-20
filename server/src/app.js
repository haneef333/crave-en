import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import integrationRoutes from './routes/integrations.js'
import uploadRoutes from './routes/uploads.js'
import reviewRoutes from './routes/reviews.js'
import couponRoutes from './routes/coupons.js'
import { CATEGORIES } from './models/Product.js'
import { UPLOAD_DIR } from './services/storage.js'
import { todayISO } from './utils/dates.js'
import { CANDLES_MAX, MESSAGE_MAX, OCCASIONS } from './utils/pricing.js'
import { slotsFor } from './utils/slots.js'
import { addDaysISO } from './utils/dates.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1) // behind Render / Railway proxies
  app.use(cors({
    // Requests without an Origin header (server-to-server, curl) are allowed;
    // browsers are only allowed from the storefront's own URL(s).
    origin: (origin, cb) => cb(null, !origin || env.clientUrls.includes(origin)),
  }))
  app.use(express.json({ limit: '100kb' }))
  // Photos saved on this server (when Cloudinary isn't configured)
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }))
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
  })

  // Small settings the storefront needs on load
  app.get('/api/meta', (_req, res) => {
    const today = todayISO()
    res.json({
      deliveryFee: env.deliveryFee,
      today,
      timezone: env.timezone,
      categories: CATEGORIES,
      occasions: OCCASIONS,
      messageMax: MESSAGE_MAX,
      candlesMax: CANDLES_MAX,
      // Which slots can still be booked today and from tomorrow on
      slots: { today: slotsFor(today), later: slotsFor(addDaysISO(today, 1)) },
      googleClientId: env.googleClientId || null, // public value; the Google button needs it
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/integrations/inventory', integrationRoutes)
  app.use('/api/uploads', uploadRoutes)
  app.use('/api/reviews', reviewRoutes)
  app.use('/api/coupons', couponRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
