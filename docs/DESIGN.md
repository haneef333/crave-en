# Crave En design notes

This page explains why the shop looks and moves the way it does.

## The idea: a bakery signboard

Neighbourhood bakeries in Karnataka put up painted signboards: heavy slab lettering in green, yellow and red that you can read from across the road. Crave En uses the same confidence in a quiet, modern shop. The photographs of the bakes carry the colour. The interface around them stays plain.

## Colour

| Token | Hex | Where it's used |
| --- | --- | --- |
| `--paper` | `#F5F6F1` | Page ground: a cool flour white, so the bakes look warm against it |
| `--counter` | `#E8EAE1` | One step off the ground, like a steel counter: panels, summary, image wells |
| `--ink` | `#132A1D` | All text: a very dark leaf green instead of black |
| `--muted` | `#56635A` | Secondary text (5.9:1 on paper) |
| `--leaf` | `#1E5134` | The one dark band (footer), success states |
| `--turmeric` | `#F2B21B` | The main button, the cake section, the cart count |
| `--kumkum` | `#B42F27` | Errors and warnings only |

Turmeric is used in one big place, the celebration-cake section. Everywhere else it's only the main button.

## Type

- **Besley** (variable, 400 to 900) for headings, at 700 to 800 weight. It's a Clarendon-style slab serif, the letterform of painted shop signs.
- **Anek Kannada** (variable) for everything else. It was designed in India by Ek Type and covers both English and Kannada, so the shop can use Kannada text without a second font.
- Large headings get negative tracking. Body text is 17px with 1.55 line height. Prices use tabular figures so they don't jump while they count.

## Layout

- Square corners everywhere, as on a signboard. Photographs are never rounded, filtered or covered with text.
- One button style, a solid block. Primary: turmeric with ink text. Secondary: an ink outline.
- Home page: hero (headline and photo), today's bakes, celebration cakes (turmeric band), how we bake (scroll story), pickup and delivery, then the footer.

## Motion

Motion answers what the customer does, so it has to have a reason:

| Moment | What moves | Why |
| --- | --- | --- |
| First visit | The headline lines rise and the hero photo is revealed, once | Sets the tone, then stays out of the way |
| Card → quick view | The photo grows from the card into the sheet (shared element) | Shows where the sheet came from |
| Add to cart | The bake flies to the cart, the count rolls, a toast confirms | Confirms the action happened |
| Choosing options | The highlight slides to the new choice, the price counts to the new total | Shows what changed |
| Cake message | The plaque on the cake updates as you type | You see the cake before you order it |
| How we bake | Steps change and photos cross-fade as you scroll (the one scroll moment) | It's a real sequence, so it's told in order |
| Order tracking | The progress line fills when the baker updates the order (live) | Status changes without a refresh |

Rules from the design-engineering references used here:
- Custom curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for things appearing, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` for the cart drawer and sheets.
- Buttons press to `scale(0.97)`. Hover effects only on devices with a mouse.
- UI animations stay under 300 ms. Drawers and sheets get up to 500 ms.
- Only `transform` and `opacity` animate.
- Under "reduce motion", movement is removed and only fades remain. Nothing stays hidden.

Removed on purpose: floating sprinkles, bobbing bakes, mouse parallax, the scrolling ribbon and fade-ins on every section. They moved all the time without telling the customer anything.

## Where Magic UI ideas went

[Magic UI](https://magicui.design) is built for Tailwind, and this project uses plain CSS, so the effects that suit a bakery were rebuilt with Motion and CSS:
- **Text Animate / Blur Fade** became the hero headline rising out of a mask on the first visit.
- **Number Ticker** became the prices that count to the new total when you change size or flavour, and the rolling cart count.
- **Confetti** fires once when an order is placed.

The tech-style effects (beams, grids, meteors, particles, marquees) were left out. On a bakery they make the page look like a software site and pull attention away from the bakes.

## Photos

`client/src/photos.js` lists the home-page photo slots: hero, celebration cakes, the four "how your order is made" steps, and packing. Product photos are set per product in **Manage menu**. Shoot in daylight on a plain surface, square for products and landscape for the hero. Photos are never rounded, filtered or covered with text.
