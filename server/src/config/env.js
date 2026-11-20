import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const DEV_SECRET = 'dev-integration-secret'
const port = Number(process.env.PORT) || 5000

export const env = {
  port,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crave_en',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-jwt-secret',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5174')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  // Public address of this API, used to build full links to uploaded photos
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  deliveryFee: Number(process.env.DELIVERY_FEE ?? 40),
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',

  inventoryApiUrl: (process.env.INVENTORY_API_URL || 'http://127.0.0.1:8010').replace(/\/+$/, ''),
  integrationSecret: process.env.INTEGRATION_SECRET || DEV_SECRET,
  syncIntervalMs: (Number(process.env.SYNC_INTERVAL_SECONDS) || 30) * 1000,
  inventorySyncEnabled: process.env.INVENTORY_SYNC !== 'off',

  // Optional services. Each feature switches itself off when its settings are missing.
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'Bakery <no-reply@bakery.local>',
  },

  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}

// The storefront website's address, for links in emails
export const siteUrl = () => env.clientUrls[0].replace(/\/+$/, '')

export function warnAboutDevSecrets() {
  if (!process.env.JWT_SECRET) {
    console.warn('[config] JWT_SECRET is not set; using a development value. Set it before deploying.')
  }
  if (env.integrationSecret === DEV_SECRET) {
    console.warn('[config] INTEGRATION_SECRET is the development default. Set the same strong value in both apps before deploying.')
  }
  if (env.isProduction && (!process.env.JWT_SECRET || env.integrationSecret === DEV_SECRET)) {
    throw new Error('Refusing to start in production with development secrets.')
  }
}
