// The bakery's own photographs. The files live in client/public/photos/.
// While a slot is null, the page shows the drawn bakes in its place.

export const PHOTOS = {
  // Several bakes together, top of the home page
  hero: '/photos/home/hero.webp',
  // Celebration cakes (the first one gets the live message preview)
  cakes: ['/photos/home/cake.webp'],
  // How an order is made: one photo per step, in order
  process: [
    '/photos/home/step-1.webp',
    '/photos/home/step-2.webp',
    '/photos/home/step-3.webp',
    '/photos/home/step-4.webp',
  ],
  // An order at its celebration
  visit: '/photos/home/visit.webp',
}

export const PHOTO_ALT = {
  hero: 'Boxes of brownies, cookies, a biscoff cheesecake and chocolate chip loaves from Crave En',
  cakes: ['A blue and white birthday cake with sugar flowers'],
  process: [
    'A bento cake with a pink number 11, in its box',
    'A retirement cake decorated with a post box, calculator and "35 years of service"',
    'A freshly made hazelnut brownie tub, held up to the camera',
    'Boxes of hazelnut brownies and chocolate cupcakes, packed to go',
  ],
  visit: 'A cheesecake on a brownie cake with strawberries, set out at a party table',
}

// Photos for menu items, by product slug. A photo the owner uploads in
// "Manage menu" always wins; items without either show their drawing.
export const PRODUCT_PHOTOS = {
  'fudgy-chocolate-brownie': '/photos/menu/fudgy-chocolate-brownie.webp',
  'chocolate-fudge-squares': '/photos/menu/chocolate-fudge-squares.webp',
  'choco-chip-cookies': '/photos/menu/choco-chip-cookies.webp',
  'vanilla-celebration-cake': '/photos/menu/vanilla-celebration-cake.webp',
}
