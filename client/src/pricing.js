// Live price preview while choosing options. The server does the same maths
// when the order is placed, and its answer is the one that counts.

export function defaultOptions(product) {
  const opts = {}
  if (product.sizes?.length) opts.size = product.sizes[0].label
  if (product.flavours?.length) opts.flavour = product.flavours[0].label
  return opts
}

export function unitPriceFor(product, options = {}) {
  let price = product.price
  const size = product.sizes?.find(s => s.label === options.size)
  if (size) price = size.price
  const flavour = product.flavours?.find(f => f.label === options.flavour)
  if (flavour) price += flavour.extra || 0
  if (options.eggless && product.egglessExtra != null) price += product.egglessExtra
  return price
}

// Drop empty values so the same choices always produce the same cart line
export function cleanOptions(options = {}) {
  const out = {}
  for (const [k, v] of Object.entries(options)) {
    if (v === undefined || v === null || v === '' || v === false || v === 0) continue
    out[k] = typeof v === 'string' ? v.trim() : v
  }
  return out
}

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
  if (options.message) parts.push(`Message: “${options.message}”`)
  if (options.candles) parts.push(`${options.candles} candle${options.candles > 1 ? 's' : ''}`)
  return parts.join('. ')
}

export const hasOptions = product =>
  Boolean(product.sizes?.length || product.flavours?.length || product.egglessExtra != null || product.customizable)
