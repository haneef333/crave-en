import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { connectDB } from '../src/config/db.js'
import Coupon from '../src/models/Coupon.js'
import Product from '../src/models/Product.js'
import User from '../src/models/User.js'
import { signToken } from '../src/middleware/auth.js'
import { addDaysISO, todayISO } from '../src/utils/dates.js'

export const app = createApp()
export const api = () => request(app)
export const SECRET = 'test-integration-secret'
export const tomorrow = () => addDaysISO(todayISO(), 1)

export async function startDB() {
  if (mongoose.connection.readyState !== 1) await connectDB()
  await mongoose.connection.dropDatabase()
  await Promise.all(Object.values(mongoose.models).map(m => m.init())) // rebuild unique indexes
}

export async function stopDB() {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
}

let n = 0
export async function makeUser(overrides = {}) {
  n += 1
  const user = await User.create({ name: `Test User ${n}`, email: `user${n}-${Date.now()}@test.local`, password: 'secret12', phone: '9876543210', ...overrides })
  return { user, token: signToken(user), auth: { Authorization: `Bearer ${signToken(user)}` } }
}

export const makeAdmin = () => makeUser({ role: 'admin' })

export async function seedMenu() {
  const brownie = await Product.create({ name: 'Brownie', recipeName: 'Brownie', category: 'Brownies', price: 80, unitLabel: 'per piece' })
  const cake = await Product.create({
    name: 'Celebration Cake', recipeName: 'Cake', category: 'Cakes', price: 480, minNoticeDays: 1, customizable: true, egglessExtra: 60,
    sizes: [{ label: '0.5 kg', price: 480, recipeScale: 0.5 }, { label: '1 kg', price: 850, recipeScale: 1 }, { label: '2 kg', price: 1650, recipeScale: 2 }],
    flavours: [{ label: 'Vanilla', extra: 0 }, { label: 'Chocolate', extra: 50 }],
  })
  const hidden = await Product.create({ name: 'Old Pie', recipeName: 'Pie', category: 'Pastries', price: 100, isAvailable: false })
  await Coupon.create({ code: 'FIRST10', type: 'percent', value: 10, maxDiscount: 100, minOrder: 200, firstOrderOnly: true })
  await Coupon.create({ code: 'FLAT50', type: 'flat', value: 50, perUserLimit: 2 })
  return { brownie, cake, hidden }
}

// A valid order body for tomorrow's morning slot
export const orderBody = (items, extra = {}) => ({ items, phone: '9876543210', neededBy: tomorrow(), timeSlot: 'morning', ...extra })
