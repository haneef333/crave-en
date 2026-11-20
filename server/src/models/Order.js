import mongoose from 'mongoose'

export const ORDER_STATUSES = [
  'awaiting_confirmation', // placed by the customer, waiting for the baker
  'accepted', // baker accepted; ingredients deducted in the inventory app
  'baking',
  'ready', // ready for pickup / out for delivery
  'completed',
  'declined', // baker declined (e.g. not enough stock, date unavailable)
  'cancelled', // customer cancelled before the baker accepted
]

export const FINAL_STATUSES = ['completed', 'declined', 'cancelled']

// Which status changes the inventory app is allowed to make. Forward jumps are
// allowed so a missed update (e.g. "accepted") does not block a later one ("baking").
export const ALLOWED_TRANSITIONS = {
  awaiting_confirmation: ['accepted', 'baking', 'ready', 'completed', 'declined'],
  accepted: ['baking', 'ready', 'completed'],
  baking: ['ready', 'completed'],
  ready: ['completed'],
  completed: [],
  declined: [],
  cancelled: [],
}

const itemOptionsSchema = new mongoose.Schema(
  {
    size: String,
    flavour: String,
    eggless: Boolean,
    occasion: String,
    message: String,
    candles: Number,
    referencePhotoUrl: String,
  },
  { _id: false },
)

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, default: '' },
    category: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    recipeName: { type: String, required: true },
    unitLabel: { type: String, default: 'each' },
    options: { type: itemOptionsSchema, default: () => ({}) },
    recipeScale: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    items: { type: [orderItemSchema], validate: v => v.length > 0 },
    subtotal: { type: Number, required: true },
    couponCode: { type: String, default: '', index: true },
    discount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    fulfilment: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
    address: { type: String, default: '' },
    neededBy: { type: String, required: true }, // 'YYYY-MM-DD'
    timeSlot: { type: String, default: '' }, // 'morning' | 'afternoon' | 'evening'
    notes: { type: String, default: '', maxlength: 500 },
    paymentMethod: { type: String, enum: ['cash', 'upi'], default: 'cash' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },

    status: { type: String, enum: ORDER_STATUSES, default: 'awaiting_confirmation', index: true },
    statusHistory: [statusEventSchema],
    declineReason: { type: String, default: '' },

    // Delivery of this order to the Smart Inventory System
    inventorySync: {
      state: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
      attempts: { type: Number, default: 0 },
      lastError: { type: String, default: '' },
      lastAttemptAt: { type: Date },
      cancelPending: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
)

orderSchema.methods.setStatus = function setStatus(status, note = '') {
  this.status = status
  this.statusHistory.push({ status, note })
}

export default mongoose.model('Order', orderSchema)
