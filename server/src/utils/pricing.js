// Works out the price of one item from the options the customer picked.
// The browser shows the same maths for a live preview, but the server's
// answer is the one that counts.
import { badRequest } from './httpError.js'
import { isOwnUpload } from '../services/storage.js'

export const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Baby shower', 'Graduation', 'Just because']
export const MESSAGE_MAX = 40
export const CANDLES_MAX = 20

const text = v => (typeof v === 'string' ? v.trim() : '')

export function resolveItem(product, raw = {}) {
  let unitPrice = product.price
  let recipeScale = 1
  const options = {}

  if (product.sizes?.length) {
    const size = product.sizes.find(s => s.label === raw.size)
    if (!size) throw badRequest(`Choose a size for ${product.name}.`)
    unitPrice = size.price
    recipeScale = size.recipeScale || 1
    options.size = size.label
  }

  if (product.flavours?.length) {
    const flavour = product.flavours.find(f => f.label === raw.flavour)
    if (!flavour) throw badRequest(`Choose a flavour for ${product.name}.`)
    unitPrice += flavour.extra || 0
    options.flavour = flavour.label
  }

  if (raw.eggless) {
    if (product.egglessExtra === null || product.egglessExtra === undefined) {
      throw badRequest(`${product.name} can't be made eggless.`)
    }
    unitPrice += product.egglessExtra
    options.eggless = true
  }

  // Celebration details: only for items the baker has marked as customizable
  if (product.customizable) {
    const occasion = text(raw.occasion)
    if (occasion) {
      if (!OCCASIONS.includes(occasion)) throw badRequest('Choose one of the listed occasions.')
      options.occasion = occasion
    }
    const message = text(raw.message)
    if (message) {
      if (message.length > MESSAGE_MAX) throw badRequest(`Keep the cake message under ${MESSAGE_MAX} characters.`)
      options.message = message
    }
    if (raw.candles !== undefined && raw.candles !== null && raw.candles !== '' && Number(raw.candles) !== 0) {
      const candles = Number(raw.candles)
      if (!Number.isInteger(candles) || candles < 0 || candles > CANDLES_MAX) {
        throw badRequest(`Candles must be between 0 and ${CANDLES_MAX}.`)
      }
      options.candles = candles
    }
    const photo = text(raw.referencePhotoUrl)
    if (photo) {
      if (!isOwnUpload(photo)) throw badRequest('Upload the reference photo again.')
      options.referencePhotoUrl = photo
    }
  }

  return { unitPrice, recipeScale, options }
}

// Same options in a different order should count as the same cart line
export function optionsKey(options = {}) {
  return Object.keys(options).sort().map(k => `${k}=${options[k]}`).join('&')
}

// "1 kg, Chocolate, eggless"
export function variantLabel(options = {}) {
  return [options.size, options.flavour, options.eggless ? 'eggless' : null].filter(Boolean).join(', ')
}

// "Birthday. Message: "Happy Birthday Sana". 5 candles."
export function celebrationLabel(options = {}) {
  const parts = []
  if (options.occasion) parts.push(options.occasion)
  if (options.message) parts.push(`Message: "${options.message}"`)
  if (options.candles) parts.push(`${options.candles} candle${options.candles > 1 ? 's' : ''}`)
  return parts.join('. ')
}
