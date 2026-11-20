// Delivery / pickup time slots
import { env } from '../config/env.js'
import { todayISO } from './dates.js'

export const SLOTS = [
  { id: 'morning', label: 'Morning, 9 am – 12 pm', endHour: 12 },
  { id: 'afternoon', label: 'Afternoon, 12 – 4 pm', endHour: 16 },
  { id: 'evening', label: 'Evening, 4 – 8 pm', endHour: 20 },
]

// Current hour in the bakery's timezone (0–23)
export function currentHour(timeZone = env.timezone) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date()))
}

// A slot can still be booked for today if at least two hours of it are left
export function slotsFor(dateISO) {
  if (dateISO !== todayISO()) return SLOTS.map(s => ({ ...s, available: true }))
  const hour = currentHour()
  return SLOTS.map(s => ({ ...s, available: s.endHour - hour >= 2 }))
}

export const slotLabel = id => SLOTS.find(s => s.id === id)?.label || ''
