// The inventory app talking back to the storefront, reviews that depend on
// completed orders, live Socket.IO updates, and photo uploads.
import http from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { io as ioClient } from 'socket.io-client'
import { api, app, makeAdmin, makeUser, orderBody, SECRET, seedMenu, startDB, stopDB } from './helpers.js'
import { initRealtime } from '../src/services/realtime.js'
import { sentInTests } from '../src/services/mailer.js'

let menu
let server
let port
beforeAll(async () => {
  await startDB()
  menu = await seedMenu()
  server = http.createServer(app)
  initRealtime(server)
  await new Promise(resolve => server.listen(0, resolve))
  port = server.address().port
})
afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
  await stopDB()
})

const setStatus = (orderNumber, status, extra = {}) =>
  api().post('/api/integrations/inventory/order-status').set('x-integration-secret', SECRET).send({ external_id: orderNumber, status, ...extra })

async function placeOrder(auth) {
  const res = await api().post('/api/orders').set(auth).send(orderBody([{ productId: menu.brownie._id, quantity: 2 }]))
  return res.body
}

describe('status updates from the inventory app', () => {
  it('need the shared secret', async () => {
    const res = await api().post('/api/integrations/inventory/order-status').send({ external_id: 'x', status: 'accepted' })
    expect(res.status).toBe(401)
  })

  it('move orders forward, never backwards, and email the big moments', async () => {
    const { auth } = await makeUser()
    const order = await placeOrder(auth)
    sentInTests.length = 0
    expect((await setStatus(order.orderNumber, 'accepted')).status).toBe(200)
    expect((await setStatus(order.orderNumber, 'baking')).status).toBe(200)
    expect((await setStatus(order.orderNumber, 'accepted')).status).toBe(409)
    expect(sentInTests.map(m => m.subject).some(s => s.includes('confirmed'))).toBe(true)
  })

  it('a decline carries the baker’s reason to the customer', async () => {
    const { auth } = await makeUser()
    const order = await placeOrder(auth)
    await setStatus(order.orderNumber, 'declined', { note: 'Fully booked that day' })
    const res = await api().get(`/api/orders/${order.orderNumber}`).set(auth)
    expect(res.body.status).toBe('declined')
    expect(res.body.declineReason).toBe('Fully booked that day')
  })
})

describe('reviews', () => {
  it('only after the order is completed, one per customer, and update the average', async () => {
    const { auth } = await makeUser()
    const order = await placeOrder(auth)
    const early = await api().post('/api/reviews').set(auth).send({ productId: menu.brownie._id, rating: 5 })
    expect(early.status).toBe(403)

    await setStatus(order.orderNumber, 'completed')
    expect((await api().post('/api/reviews').set(auth).send({ productId: menu.brownie._id, rating: 2 })).status).toBe(201)
    expect((await api().post('/api/reviews').set(auth).send({ productId: menu.brownie._id, rating: 4, comment: 'Better' })).status).toBe(201)

    const reviews = await api().get(`/api/products/${menu.brownie._id}/reviews`)
    expect(reviews.body).toHaveLength(1)
    const products = await api().get('/api/products')
    expect(products.body.find(p => p.name === 'Brownie').ratingAvg).toBe(4)
  })

  it('the owner can delete any review', async () => {
    const { auth: adminAuth } = await makeAdmin()
    const [review] = (await api().get(`/api/products/${menu.brownie._id}/reviews`)).body
    expect((await api().delete(`/api/reviews/${review._id}`).set(adminAuth)).status).toBe(200)
  })
})

describe('live updates (Socket.IO)', () => {
  const connect = token => new Promise((resolve, reject) => {
    const socket = ioClient(`http://127.0.0.1:${port}`, { auth: { token }, transports: ['websocket'], reconnection: false })
    socket.on('connect', () => resolve(socket))
    socket.on('connect_error', reject)
  })

  it('refuses connections without a login', async () => {
    await expect(connect('not-a-token')).rejects.toThrow()
  })

  it('sends customers their own order updates, and only theirs', async () => {
    const alice = await makeUser()
    const bob = await makeUser()
    const order = await placeOrder(alice.auth)
    const aliceSocket = await connect(alice.token)
    const bobSocket = await connect(bob.token)
    let bobGotIt = false
    bobSocket.on('order:updated', () => { bobGotIt = true })

    const received = new Promise(resolve => aliceSocket.on('order:updated', resolve))
    await setStatus(order.orderNumber, 'accepted')
    const update = await received
    expect(update.orderNumber).toBe(order.orderNumber)
    expect(update.status).toBe('accepted')

    await new Promise(r => setTimeout(r, 200))
    expect(bobGotIt).toBe(false)
    aliceSocket.close()
    bobSocket.close()
  })
})

describe('photo uploads', () => {
  // The smallest valid PNG
  const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex')

  it('customers can upload a reference photo, and get a link they can use in an order', async () => {
    const { auth } = await makeUser()
    const up = await api().post('/api/uploads/reference').set(auth).attach('photo', PNG, { filename: 'design.png', contentType: 'image/png' })
    expect(up.status).toBe(201)
    expect(up.body.url).toMatch(/^\/uploads\/reference-[a-f0-9]{20}\.png$/)

    const res = await api().post('/api/orders').set(auth)
      .send(orderBody([{ productId: menu.cake._id, quantity: 1, options: { size: '1 kg', flavour: 'Vanilla', referencePhotoUrl: up.body.url } }]))
    expect(res.status).toBe(201)

    const file = await api().get(up.body.url)
    expect(file.status).toBe(200)
  })

  it('rejects files that are not really images', async () => {
    const { auth } = await makeUser()
    const res = await api().post('/api/uploads/reference').set(auth).attach('photo', Buffer.from('<?php evil(); ?>'), { filename: 'x.png', contentType: 'image/png' })
    expect(res.status).toBe(400)
  })

  it('only the owner can upload menu photos', async () => {
    const { auth } = await makeUser()
    const res = await api().post('/api/uploads/product').set(auth).attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' })
    expect(res.status).toBe(403)
  })
})
