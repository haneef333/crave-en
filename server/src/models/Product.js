import mongoose from 'mongoose'

export const CATEGORIES = ['Cakes', 'Brownies', 'Cookies', 'Breads', 'Pastries', 'Muffins & Scones']

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, unique: true, index: true },
    // Must match a product_name in the inventory app's recipes table,
    // so an accepted order can deduct the right ingredients.
    recipeName: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, trim: true, default: '', maxlength: 600 },
    price: { type: Number, required: true, min: 0 },
    unitLabel: { type: String, trim: true, default: 'each' },
    imageUrl: { type: String, trim: true, default: '' },
    // Days of notice the baker needs (e.g. 1 for a celebration cake)
    minNoticeDays: { type: Number, min: 0, max: 14, default: 0 },
    tags: [{ type: String, trim: true }],
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },

    // --- Options (mostly for cakes) ---
    // When sizes are set, the chosen size decides the price. recipeScale tells the
    // inventory app how much of the recipe to use (2 kg = 2 × the 1 kg recipe).
    sizes: [{
      _id: false,
      label: { type: String, required: true, trim: true },
      price: { type: Number, required: true, min: 0 },
      recipeScale: { type: Number, default: 1, min: 0.1, max: 10 },
    }],
    flavours: [{
      _id: false,
      label: { type: String, required: true, trim: true },
      extra: { type: Number, default: 0, min: 0 },
    }],
    egglessExtra: { type: Number, min: 0, default: null }, // null = not offered
    // Occasion, message on the cake, candles and a reference photo
    customizable: { type: Boolean, default: false },

    // Kept up to date when reviews are added or removed
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

// "From ₹480" on the menu when an item comes in several sizes
productSchema.virtual('fromPrice').get(function fromPrice() {
  return this.sizes?.length ? Math.min(...this.sizes.map(s => s.price)) : this.price
})
productSchema.virtual('hasOptions').get(function hasOptions() {
  return Boolean(this.sizes?.length || this.flavours?.length || this.egglessExtra !== null || this.customizable)
})

productSchema.pre('validate', function setSlug() {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name)
  }
})

export default mongoose.model('Product', productSchema)
