import { useEffect, useState } from 'react'
import { getAvailability, getMeta } from '../api/client'

// Small module-level caches so every page does not refetch the same thing.
let metaPromise = null
let availability = { at: 0, promise: null }

export function useMeta() {
  const [meta, setMeta] = useState(null)
  useEffect(() => {
    metaPromise ||= getMeta().catch(err => { metaPromise = null; throw err })
    let alive = true
    metaPromise.then(m => alive && setMeta(m)).catch(() => {})
    return () => { alive = false }
  }, [])
  return meta
}

// { online: boolean, byRecipe: { Brownie: 83, ... } } — how many the baker can make with current stock
export function useAvailability() {
  const [data, setData] = useState({ online: false, byRecipe: {} })
  useEffect(() => {
    if (!availability.promise || Date.now() - availability.at > 60_000) {
      availability = {
        at: Date.now(),
        promise: getAvailability().catch(() => ({ online: false, byRecipe: {} })),
      }
    }
    let alive = true
    availability.promise.then(d => alive && setData(d))
    return () => { alive = false }
  }, [])
  return data
}

// How many more of a product can go in the cart, or null if unknown
export function remainingFor(product, availabilityData, inCart = 0) {
  if (!availabilityData.online) return null
  const canMake = availabilityData.byRecipe[product.recipeName]
  if (canMake === undefined) return null
  return Math.max(canMake - inCart, 0)
}
