// The bakery's own photographs for the home page.
// Put the files in client/public/photos/ and write their paths here, e.g. '/photos/hero.jpg'.
// While a slot is null, the page shows the drawn bakes in its place.
// Product photos are set per product in "Manage menu" (or by the photo script), not here.

export const PHOTOS = {
  // A wide shot of several bakes together, top of the home page
  hero: null,
  // Celebration cakes you have made (first one gets the message preview)
  cakes: [null],
  // How an order is made: one photo per step, in order
  process: [null, null, null, null],
  // Packing or handing over an order
  visit: null,
}

export const PHOTO_ALT = {
  hero: 'Brownies, cookies and a celebration cake from Crave En on the kitchen counter',
  cakes: ['A celebration cake from Crave En'],
  process: [
    'Batter being mixed for an order',
    'A tray of bakes coming out of the oven',
    'A cake being finished by hand',
    'An order packed in a box, ready to go',
  ],
  visit: 'An order packed and ready for pickup',
}
