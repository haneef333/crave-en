// Time slots depend on the clock, so this test sets the clock itself.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { slotsFor } from '../src/utils/slots.js'
import { addDaysISO, todayISO } from '../src/utils/dates.js'

afterEach(() => vi.useRealTimers())

describe('time slots', () => {
  it('closes today’s slots that have less than two hours left', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T14:30:00+05:30')) // 2:30 pm in Hosapete
    const today = slotsFor(todayISO())
    expect(today.find(s => s.id === 'morning').available).toBe(false)
    expect(today.find(s => s.id === 'afternoon').available).toBe(true) // ends at 4 pm
    expect(today.find(s => s.id === 'evening').available).toBe(true)
  })

  it('keeps every slot open for future days', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T21:00:00+05:30'))
    expect(slotsFor(todayISO()).every(s => !s.available)).toBe(true)
    expect(slotsFor(addDaysISO(todayISO(), 1)).every(s => s.available)).toBe(true)
  })
})
