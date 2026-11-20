import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, makeUser, orderBody, seedMenu, startDB, stopDB, tomorrow } from './helpers.js'
import { todayISO } from '../src/utils/dates.js'

let menu
beforeAll(async () => {
  await startDB()
  menu = await seedMenu()
})
afterAll(stopDB)

describe('placing orders', () => {
  it('needs a login', async () => {
    const res = await api().post('/api/orders').send(orderBody([{ productId: menu.brownie._id, quantity: 1 }]))
    expect(res.status).toBe(401)
  })

  it('prices items from the database and ignores prices sent by the browser', async () => {
    const { auth } = await makeUser()
    const res = await api().post('/api/orders').set(auth)
      .send(orderBody([{ productId: menu.brownie._id, quantity: 3, price: 1, unitPrice: 1 }], { total: 1 }))
    expect(res.status).toBe(201)
    expect(res.body.items[0].unitPrice).toBe(80)
    expect(res.body.total).toBe(240)
    expect(res.body.status).toBe('awaiting_confirmation')
  })

  it('prices cake options and merges identical lines', async () => {
    const { auth } = await makeUser()
    const opts = { size: '2 kg', flavour: 'Chocolate', eggless: true, occasion: 'Birthday', message: 'Happy Birthday', candles: 5 }
    const shuffled = { candles: 5, message: 'Happy Birthday', occasion: 'Birthday', eggless: true, flavour: 'Chocolate', size: '2 kg' }
    const res = await api().post('/api/orders').set(auth)
      .send(orderBody([{ productId: menu.cake._id, quantity: 1, options: opts }, { productId: menu.cake._id, quantity: 1, options: shuffled }]))
    expect(res.status).toBe(201)
    expect(res.body.items).toHaveLength(1)
    const [cake] = res.body.items
    expect(cake.unitPrice).toBe(1650 + 50 + 60)
    expect(cake.quantity).toBe(2)
    expect(cake.recipeScale).toBe(2)
    expect(cake.options.message).toBe('Happy Birthday')
  })

  it.each([
    [{ flavour: 'Vanilla' }, 'Choose a size'],
    [{ size: '1 kg' }, 'Choose a flavour'],
    [{ size: '1 kg', flavour: 'Vanilla', occasion: 'Funeral' }, 'listed occasions'],
    [{ size: '1 kg', flavour: 'Vanilla', message: 'x'.repeat(41) }, 'under 40'],
    [{ size: '1 kg', flavour: 'Vanilla', candles: 50 }, 'Candles'],
    [{ size: '1 kg', flavour: 'Vanilla', referencePhotoUrl: 'https://evil.example/cat.jpg' }, 'reference photo'],
  ])('rejects bad cake options %j', async (options, message) => {
    const { auth } = await makeUser()
    const res = await api().post('/api/orders').set(auth).send(orderBody([{ productId: menu.cake._id, quantity: 1, options }]))
    expect(res.status).toBe(400)
    expect(res.body.message).toContain(message)
  })

  it('respects notice periods and needs a time slot', async () => {
    const { auth } = await makeUser()
    const cakeLine = [{ productId: menu.cake._id, quantity: 1, options: { size: '1 kg', flavour: 'Vanilla' } }]
    const tooSoon = await api().post('/api/orders').set(auth).send(orderBody(cakeLine, { neededBy: todayISO(), timeSlot: 'evening' }))
    expect(tooSoon.status).toBe(400)
    expect(tooSoon.body.message).toMatch(/notice/)

    const noSlot = await api().post('/api/orders').set(auth).send(orderBody(cakeLine, { timeSlot: '' }))
    expect(noSlot.status).toBe(400)
    expect(noSlot.body.message).toMatch(/time slot/)
  })

  it('refuses items that are off the menu', async () => {
    const { auth } = await makeUser()
    const res = await api().post('/api/orders').set(auth).send(orderBody([{ productId: menu.hidden._id, quantity: 1 }]))
    expect(res.status).toBe(409)
    expect(res.body.message).toContain('Old Pie')
  })

  it('keeps orders private to their owner', async () => {
    const alice = await makeUser()
    const bob = await makeUser()
    const placed = await api().post('/api/orders').set(alice.auth).send(orderBody([{ productId: menu.brownie._id, quantity: 1 }]))
    const peek = await api().get(`/api/orders/${placed.body.orderNumber}`).set(bob.auth)
    expect(peek.status).toBe(403)
  })

  it('lets customers cancel before the baker accepts', async () => {
    const { auth } = await makeUser()
    const placed = await api().post('/api/orders').set(auth).send(orderBody([{ productId: menu.brownie._id, quantity: 1 }]))
    const res = await api().post(`/api/orders/${placed.body.orderNumber}/cancel`).set(auth)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('cancelled')
  })
})

describe('coupons', () => {
  it('previews and applies a first-order coupon, then blocks reuse', async () => {
    const { auth } = await makeUser()
    const preview = await api().post('/api/coupons/validate').set(auth).send({ code: 'first10', subtotal: 1500 })
    expect(preview.body.discount).toBe(100) // 10% capped at ₹100

    const placed = await api().post('/api/orders').set(auth)
      .send(orderBody([{ productId: menu.brownie._id, quantity: 5 }], { couponCode: 'FIRST10' }))
    expect(placed.status).toBe(201)
    expect(placed.body.discount).toBe(40)
    expect(placed.body.total).toBe(360)

    const again = await api().post('/api/coupons/validate').set(auth).send({ code: 'FIRST10', subtotal: 1500 })
    expect(again.status).toBe(400)
  })

  it('enforces the minimum order', async () => {
    const { auth } = await makeUser()
    const res = await api().post('/api/coupons/validate').set(auth).send({ code: 'FIRST10', subtotal: 150 })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('at least')
  })

  it('a cancelled order gives the coupon back', async () => {
    const { auth } = await makeUser()
    const first = await api().post('/api/orders').set(auth)
      .send(orderBody([{ productId: menu.brownie._id, quantity: 4 }], { couponCode: 'FIRST10' }))
    await api().post(`/api/orders/${first.body.orderNumber}/cancel`).set(auth)
    const again = await api().post('/api/coupons/validate').set(auth).send({ code: 'FIRST10', subtotal: 400 })
    expect(again.status).toBe(200)
  })

  it('only the owner can manage coupons', async () => {
    const { auth } = await makeUser()
    const res = await api().post('/api/coupons').set(auth).send({ code: 'FREE', type: 'flat', value: 999 })
    expect(res.status).toBe(403)
  })
})

describe('menu', () => {
  it('shows "from" prices for items with sizes and hides unavailable items', async () => {
    const res = await api().get('/api/products')
    const cake = res.body.find(p => p.name === 'Celebration Cake')
    expect(cake.fromPrice).toBe(480)
    expect(cake.hasOptions).toBe(true)
    expect(res.body.some(p => p.name === 'Old Pie')).toBe(false)
  })

  it('meta lists time slots, occasions and delivery fee', async () => {
    const res = await api().get('/api/meta')
    expect(res.body.slots.later.map(s => s.id)).toEqual(['morning', 'afternoon', 'evening'])
    expect(res.body.occasions).toContain('Anniversary')
    expect(tomorrow() > res.body.today).toBe(true)
  })
})
