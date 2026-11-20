// Change these to the real bakery's details. Everything on the site reads from here.
export const BAKERY = {
  name: 'Crave En',
  tagline: 'Home bakery in Hosapete',
  intro:
    'Brownies, cookies, cakes and breads, baked in small batches in our home kitchen. Order a day ahead for cakes; most other bakes can be ready the same day.',
  city: 'Hosapete, Karnataka',
  cityLocal: 'ಹೊಸಪೇಟೆ', // Hosapete in Kannada, shown in the footer
  landmark: 'Basaveshwara Circle, Hosapete', // set large on the home page, linked to the map
  pickupAddress: 'Pickup from our home kitchen, near Basaveshwara Circle, Hosapete',
  phone: '+91 90000 00000',
  hours: 'Orders open 8 am – 8 pm, every day',
}

export const STATUS_LABELS = {
  awaiting_confirmation: () => 'Waiting for the baker',
  accepted: () => 'Confirmed',
  baking: () => 'In the oven',
  ready: f => (f === 'delivery' ? 'Out for delivery' : 'Ready for pickup'),
  completed: f => (f === 'delivery' ? 'Delivered' : 'Picked up'),
  declined: () => 'Declined',
  cancelled: () => 'Cancelled',
}

export const FINAL_STATUSES = ['completed', 'declined', 'cancelled']
