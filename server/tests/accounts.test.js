import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, app, makeUser, startDB, stopDB } from './helpers.js'
import { sentInTests } from '../src/services/mailer.js'
import User from '../src/models/User.js'

beforeAll(startDB)
afterAll(stopDB)

describe('email and password', () => {
  it('registers, logs in and rejects a wrong password', async () => {
    const reg = await api().post('/api/auth/register').send({ name: 'Asha', email: 'asha@test.local', password: 'secret12' })
    expect(reg.status).toBe(201)
    expect(reg.body.token).toBeTruthy()
    const ok = await api().post('/api/auth/login').send({ email: 'ASHA@test.local', password: 'secret12' })
    expect(ok.status).toBe(200)
    const bad = await api().post('/api/auth/login').send({ email: 'asha@test.local', password: 'nope1234' })
    expect(bad.status).toBe(401)
  })

  it('never stores the plain password', async () => {
    const user = await User.findOne({ email: 'asha@test.local' }).select('+password')
    expect(user.password).not.toBe('secret12')
    expect(user.password.startsWith('$2')).toBe(true)
  })

  it('refuses a duplicate email', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Asha 2', email: 'asha@test.local', password: 'secret12' })
    expect(res.status).toBe(409)
  })
})

describe('forgot and reset password', () => {
  it('answers the same for unknown emails (no account fishing)', async () => {
    const res = await api().post('/api/auth/forgot').send({ email: 'nobody@test.local' })
    expect(res.status).toBe(200)
  })

  it('emails a one-time link that resets the password', async () => {
    const { user } = await makeUser({ email: 'forgetful@test.local' })
    sentInTests.length = 0
    await api().post('/api/auth/forgot').send({ email: user.email })
    const mail = sentInTests.find(m => m.to === user.email)
    const token = mail.text.match(/token=([a-f0-9]{64})/)[1]

    const reset = await api().post('/api/auth/reset').send({ token, password: 'brandnew1' })
    expect(reset.status).toBe(200)
    const reuse = await api().post('/api/auth/reset').send({ token, password: 'again1234' })
    expect(reuse.status).toBe(400)
    const login = await api().post('/api/auth/login').send({ email: user.email, password: 'brandnew1' })
    expect(login.status).toBe(200)
  })
})

describe('Google sign-in', () => {
  it('creates an account from a verified Google profile', async () => {
    app.locals.verifyGoogle = async () => ({ googleId: 'g-123', email: 'gina@gmail.com', name: 'Gina', avatarUrl: '' })
    const res = await api().post('/api/auth/google').send({ credential: 'fake-but-accepted-by-stub' })
    expect(res.status).toBe(200)
    expect(res.body.user.usesGoogle).toBe(true)
    // A Google-only account can't log in with a password it never set
    const pw = await api().post('/api/auth/login').send({ email: 'gina@gmail.com', password: 'whatever1' })
    expect(pw.status).toBe(401)
    expect(pw.body.message).toMatch(/Google/)
  })

  it('links Google to an existing account with the same email', async () => {
    await makeUser({ email: 'existing@gmail.com' })
    app.locals.verifyGoogle = async () => ({ googleId: 'g-456', email: 'existing@gmail.com', name: 'Existing', avatarUrl: '' })
    const res = await api().post('/api/auth/google').send({ credential: 'x' })
    expect(res.status).toBe(200)
    expect(await User.countDocuments({ email: 'existing@gmail.com' })).toBe(1)
  })

  it('rejects a credential Google does not confirm', async () => {
    app.locals.verifyGoogle = async () => { throw new Error('bad token') }
    const res = await api().post('/api/auth/google').send({ credential: 'forged' })
    expect(res.status).toBe(401)
    delete app.locals.verifyGoogle
  })
})
