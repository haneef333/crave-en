// npm run seed
// Creates the owner (admin) account and a starter menu. Safe to run again:
// existing products (matched by name) and the admin account are left alone.
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import Coupon from './models/Coupon.js'
import Product from './models/Product.js'
import User from './models/User.js'

// recipeName must match a product_name in the inventory app's recipes table.
const MENU = [
  {
    name: 'Fudgy Chocolate Brownie',
    recipeName: 'Brownie',
    category: 'Brownies',
    price: 80,
    unitLabel: 'per piece',
    description: 'Dense, gooey centre with a crackly top. Made with real cocoa and plenty of butter.',
    tags: ['Bestseller'],
    isFeatured: true,
  },
  {
    name: 'Chocolate Fudge Squares',
    recipeName: 'Fudge',
    category: 'Brownies',
    price: 220,
    unitLabel: 'box of 8',
    description: 'Soft milk-and-cocoa fudge, cut into bite-sized squares. A good gift box.',
    tags: ['Eggless'],
  },
  {
    name: 'Choco Chip Cookies',
    recipeName: 'Cookies',
    category: 'Cookies',
    price: 180,
    unitLabel: 'box of 6',
    description: 'Crisp edges, chewy middles and a generous handful of chocolate chips in every cookie.',
    tags: ['Bestseller'],
    isFeatured: true,
    egglessExtra: 30,
  },
  {
    name: 'Vanilla Celebration Cake',
    recipeName: 'Cake',
    category: 'Cakes',
    price: 480,
    unitLabel: 'from 0.5 kg',
    description: 'Light sponge layered with buttercream, made for birthdays and anniversaries. Pick a size and flavour, and tell us what to write on top.',
    minNoticeDays: 1,
    tags: ['Personalised'],
    isFeatured: true,
    // The base recipe is for 1 kg, so 0.5 kg uses half of it
    sizes: [
      { label: '0.5 kg', price: 480, recipeScale: 0.5 },
      { label: '1 kg', price: 850, recipeScale: 1 },
      { label: '1.5 kg', price: 1250, recipeScale: 1.5 },
      { label: '2 kg', price: 1650, recipeScale: 2 },
    ],
    flavours: [
      { label: 'Vanilla', extra: 0 },
      { label: 'Chocolate', extra: 50 },
      { label: 'Butterscotch', extra: 60 },
      { label: 'Pineapple', extra: 40 },
      { label: 'Red velvet', extra: 120 },
    ],
    egglessExtra: 60,
    customizable: true,
  },
  {
    name: 'Victoria Sponge',
    recipeName: 'Victorian Sponge',
    category: 'Cakes',
    price: 650,
    unitLabel: 'from 750 g',
    description: 'Two buttery sponges sandwiched with fruit jam and a cream cheese layer. Lovely for anniversaries and tea parties.',
    minNoticeDays: 1,
    isFeatured: true,
    sizes: [
      { label: '750 g', price: 650, recipeScale: 1 },
      { label: '1.5 kg', price: 1200, recipeScale: 2 },
    ],
    egglessExtra: 50,
    customizable: true,
  },
  {
    name: 'Almond Bakewell Tart',
    recipeName: 'Bakewell',
    category: 'Pastries',
    price: 120,
    unitLabel: 'per slice',
    description: 'Shortcrust pastry, a layer of fruit filling and a soft almond frangipane on top.',
  },
  {
    name: 'Flaky Butter Pastry',
    recipeName: 'Pastry',
    category: 'Pastries',
    price: 90,
    unitLabel: 'per piece',
    description: 'Golden, layered and light. Best eaten warm on the day.',
  },
  {
    name: 'Medialuna',
    recipeName: 'Medialuna',
    category: 'Pastries',
    price: 70,
    unitLabel: 'per piece',
    description: 'A sweet Argentine-style croissant, brushed with syrup straight out of the oven.',
  },
  {
    name: 'Vanilla Muffin',
    recipeName: 'Muffin',
    category: 'Muffins & Scones',
    price: 70,
    unitLabel: 'per piece',
    description: 'Tall, soft and not too sweet. Great with tea.',
  },
  {
    name: 'Butter Scone',
    recipeName: 'Scone',
    category: 'Muffins & Scones',
    price: 60,
    unitLabel: 'per piece',
    description: 'Crumbly, buttery scones. Ask for jam on the side in your notes.',
  },
  {
    name: 'Soft Milk Bread',
    recipeName: 'Bread',
    category: 'Breads',
    price: 70,
    unitLabel: '400 g loaf',
    description: 'Everyday sandwich loaf with a soft crumb and a thin golden crust.',
  },
  {
    name: 'Farmhouse Loaf',
    recipeName: 'Farm House',
    category: 'Breads',
    price: 120,
    unitLabel: '500 g loaf',
    description: 'A hearty, rustic white loaf with a crackly top.',
  },
  {
    name: 'Classic Baguette',
    recipeName: 'Baguette',
    category: 'Breads',
    price: 90,
    unitLabel: 'per piece',
    description: 'Long, crusty and airy inside. Baked fresh on the morning of your order.',
  },
  {
    name: 'Bread Pudding',
    recipeName: 'Bread Pudding',
    category: 'Cakes',
    price: 150,
    unitLabel: 'per bowl',
    description: 'Warm custard bread pudding with a hint of cinnamon.',
  },
]

async function seed() {
  await connectDB()

  const email = (process.env.ADMIN_EMAIL || 'owner@bakery.local').toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'change-this-password'
  let admin = await User.findOne({ email })
  if (!admin) {
    admin = await User.create({
      name: process.env.ADMIN_NAME || 'Bakery Owner',
      email,
      password,
      role: 'admin',
    })
    console.log(`[seed] created owner account ${email} (password from ADMIN_PASSWORD)`)
  } else if (admin.role !== 'admin') {
    admin.role = 'admin'
    await admin.save()
    console.log(`[seed] promoted ${email} to owner`)
  } else {
    console.log(`[seed] owner account ${email} already exists`)
  }

  let created = 0
  let upgraded = 0
  for (const item of MENU) {
    const exists = await Product.findOne({ name: item.name })
    if (!exists) {
      await Product.create(item)
      created++
    } else if (!exists.hasOptions && (item.sizes || item.flavours || item.egglessExtra !== undefined || item.customizable)) {
      // Menus seeded before cake options existed get the new options added
      exists.set({
        sizes: item.sizes || [], flavours: item.flavours || [], egglessExtra: item.egglessExtra ?? null,
        customizable: Boolean(item.customizable), price: item.price, unitLabel: item.unitLabel,
        description: item.description, tags: item.tags || exists.tags,
      })
      await exists.save()
      upgraded++
    }
  }
  console.log(`[seed] added ${created} menu item(s), added cake options to ${upgraded}, ${MENU.length - created - upgraded} unchanged`)

  if (!(await Coupon.findOne({ code: 'FIRST10' }))) {
    await Coupon.create({
      code: 'FIRST10', description: '10% off your first order (up to ₹100)', type: 'percent',
      value: 10, maxDiscount: 100, minOrder: 200, firstOrderOnly: true,
    })
    console.log('[seed] created coupon FIRST10')
  }

  await mongoose.disconnect()
}

seed().catch(async err => {
  console.error('[seed] failed:', err)
  await mongoose.disconnect()
  process.exit(1)
})
