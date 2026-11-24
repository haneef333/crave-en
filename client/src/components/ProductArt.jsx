import { useState } from 'react'
import { motion } from 'motion/react'
import { assetUrl } from '../utils'
import { PRODUCT_PHOTOS } from '../photos'

const INK = '#3a1f17'
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' }

export const PLATE_COLORS = {
  Cakes: '#fcefc7',
  Brownies: '#e8eae1',
  Cookies: '#dce8de',
  Breads: '#efe9d8',
  Pastries: '#fcefc7',
  'Muffins & Scones': '#e8eae1',
}

function Brownie() {
  return (
    <g>
      <rect x="44" y="86" width="112" height="36" rx="7" fill="#5b3222" {...S} />
      <rect x="60" y="52" width="88" height="36" rx="7" fill="#6e3d28" {...S} />
      <path d="M68 62 l10 6 l9 -5 l12 7 l10 -6 l12 5 l14 -4" fill="none" stroke="#a8693f" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 96 l12 5 l10 -4 l14 6 l12 -5 l14 5 l12 -4 l14 4" fill="none" stroke="#8c5235" strokeWidth="3" strokeLinecap="round" />
      <circle cx="128" cy="76" r="3" fill={INK} />
      <circle cx="80" cy="110" r="3" fill={INK} />
      <circle cx="132" cy="108" r="3" fill={INK} />
    </g>
  )
}

function Cookie() {
  const chips = [[86, 74], [110, 66], [122, 90], [96, 98], [76, 92], [104, 82]]
  return (
    <g>
      <circle cx="132" cy="70" r="30" fill="#c98e52" {...S} />
      <circle cx="98" cy="86" r="40" fill="#d9a066" {...S} />
      {chips.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="9" height="8" rx="3" fill={INK} transform={`rotate(${(x + y) % 40} ${x} ${y})`} />
      ))}
      <circle cx="140" cy="62" r="3.5" fill={INK} />
      <circle cx="146" cy="80" r="3" fill={INK} />
    </g>
  )
}

function Cake() {
  return (
    <g>
      <rect x="48" y="66" width="104" height="56" rx="8" fill="#f2d7a6" {...S} />
      <rect x="49.5" y="92" width="101" height="8" fill="#d9475f" />
      <path
        d="M48 76 C48 66 56 62 66 62 H134 C144 62 152 66 152 76 V80 c0 6 -8 6 -8 0 v-2 c0 8 -10 8 -10 0 c0 10 -12 10 -12 0 c0 6 -10 6 -10 0 c0 12 -12 12 -12 0 c0 6 -10 6 -10 0 c0 9 -12 9 -12 0 c0 5 -10 5 -10 0 Z"
        fill="#f6b8c4" {...S}
      />
      <path d="M100 36 v24" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M100 22 c6 6 5 12 0 14 c-5 -2 -6 -8 0 -14 Z" fill="#f3d27a" {...S} strokeWidth="2.5" />
      <circle cx="74" cy="60" r="7" fill="#d9475f" {...S} strokeWidth="2.5" />
      <circle cx="126" cy="60" r="7" fill="#d9475f" {...S} strokeWidth="2.5" />
    </g>
  )
}

function Bread() {
  return (
    <g>
      <path d="M40 120 C36 70 66 54 100 54 C134 54 164 70 160 120 Z" fill="#c27b43" {...S} />
      <path d="M70 78 l14 22 M94 72 l14 24 M118 74 l14 22" stroke="#efc286" strokeWidth="5" strokeLinecap="round" />
      <path d="M48 120 h104" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Croissant() {
  return (
    <g>
      <path d="M34 116 C46 58 154 58 166 116 C146 100 128 98 100 98 C72 98 54 100 34 116 Z" fill="#d98b45" {...S} />
      <path d="M62 82 C66 90 68 96 70 100 M86 72 C88 82 90 90 90 98 M114 72 C112 82 110 90 110 98 M138 82 C134 90 132 96 130 100" fill="none" stroke="#9c5a2a" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 80 c8 -4 18 -6 26 -6" fill="none" stroke="#f0bb7a" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

function Muffin() {
  return (
    <g>
      <path d="M58 86 H142 L132 124 H68 Z" fill="#f6b8c4" {...S} />
      <path d="M76 88 l4 34 M92 88 l2 34 M108 88 l-2 34 M124 88 l-4 34" stroke="#d9475f" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 88 C44 62 70 42 100 44 C130 42 156 62 148 88 Z" fill="#ebc27e" {...S} />
      <circle cx="82" cy="66" r="2.5" fill="#fff8f0" />
      <circle cx="104" cy="58" r="2.5" fill="#fff8f0" />
      <circle cx="120" cy="72" r="2.5" fill="#fff8f0" />
      <circle cx="94" cy="76" r="2.5" fill="#fff8f0" />
    </g>
  )
}

function Sponge() {
  return (
    <g>
      <rect x="46" y="88" width="108" height="32" rx="10" fill="#efc98d" {...S} />
      <rect x="50" y="78" width="100" height="12" rx="6" fill="#fff4ec" {...S} strokeWidth="2.5" />
      <path d="M52 84 h96" stroke="#d9475f" strokeWidth="5" strokeLinecap="round" />
      <rect x="46" y="50" width="108" height="32" rx="10" fill="#efc98d" {...S} />
      {[[64, 58], [82, 54], [100, 60], [118, 55], [136, 59], [74, 66], [110, 67], [128, 66], [92, 66]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#fffdfb" />
      ))}
    </g>
  )
}

function FudgeSquares() {
  const squares = [[56, 84], [92, 84], [128, 84], [74, 54], [110, 54]]
  return (
    <g>
      {squares.map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x - 16} y={y} width="32" height="32" rx="6" fill="#8a5233" {...S} />
          <path d={`M${x - 9} ${y + 8} h10`} stroke="#c4875c" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

function Pudding() {
  return (
    <g>
      <path d="M54 76 c8 -14 20 -6 26 -12 c8 -10 22 -4 28 -10 c10 -6 22 4 30 10 c6 4 10 6 10 12 Z" fill="#e2a85e" {...S} />
      <rect x="74" y="60" width="16" height="14" rx="4" fill="#f0c47e" {...S} strokeWidth="2.5" transform="rotate(-12 82 67)" />
      <rect x="108" y="58" width="16" height="14" rx="4" fill="#f0c47e" {...S} strokeWidth="2.5" transform="rotate(10 116 65)" />
      <path d="M44 76 H156 C154 104 132 122 100 122 C68 122 46 104 44 76 Z" fill="#fffdfb" {...S} />
      <path d="M56 92 H144" stroke="#d9475f" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

function Baguette() {
  return (
    <g transform="rotate(-14 100 88)">
      <rect x="22" y="70" width="156" height="38" rx="19" fill="#c88645" {...S} />
      <path d="M48 80 l14 16 M78 78 l14 18 M108 78 l14 18 M138 80 l14 16" stroke="#f0c286" strokeWidth="5" strokeLinecap="round" />
    </g>
  )
}

function TinLoaf() {
  return (
    <g>
      <path d="M52 78 C52 52 80 46 100 46 C120 46 148 52 148 78 Z" fill="#d08a4c" {...S} />
      <rect x="52" y="74" width="96" height="48" rx="6" fill="#f4dcae" {...S} />
      <path d="M64 88 h18 M92 100 h20 M120 88 h14" stroke="#e2bf86" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Scone() {
  return (
    <g>
      <path d="M58 118 V84 C58 66 76 60 100 60 C124 60 142 66 142 84 V118 Z" fill="#e9c08a" {...S} />
      <path d="M60 88 C70 76 130 76 140 88" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M62 84 C66 70 80 64 100 64 C120 64 134 70 138 84 C120 78 80 78 62 84 Z" fill="#c98c4e" />
      <circle cx="84" cy="102" r="2.5" fill="#b2763f" />
      <circle cx="112" cy="106" r="2.5" fill="#b2763f" />
    </g>
  )
}

function TartSlice() {
  return (
    <g>
      <path d="M40 112 L150 112 L150 92 L40 104 Z" fill="#e7b979" {...S} />
      <path d="M40 104 L150 92 L150 80 L40 98 Z" fill="#d9475f" {...S} strokeWidth="2.5" />
      <path d="M40 98 L150 80 L150 64 C150 58 144 56 138 58 L40 92 Z" fill="#f7e2b8" {...S} />
      <path d="M150 112 V64" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {[[74, 84], [100, 76], [124, 68], [112, 82]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="6" ry="3" fill="#fffdfb" stroke="#c9a36a" strokeWidth="1.5" transform={`rotate(-18 ${x} ${y})`} />
      ))}
      <circle cx="140" cy="56" r="8" fill="#d9475f" {...S} strokeWidth="2.5" />
    </g>
  )
}

function Danish() {
  return (
    <g>
      <path d="M100 38 L152 84 L100 128 L48 84 Z" fill="#dd9a52" {...S} />
      <path d="M100 38 L116 70 L100 84 L84 70 Z M152 84 L118 96 L100 84 L118 72 Z M100 128 L84 96 L100 84 L116 96 Z M48 84 L82 72 L100 84 L82 96 Z" fill="#eab56e" stroke="#9c5a2a" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="100" cy="84" r="11" fill="#d9475f" {...S} strokeWidth="2.5" />
    </g>
  )
}

// Specific drawings for the starter menu's recipes; anything else falls back to its category
const ART_BY_RECIPE = {
  'Victorian Sponge': Sponge,
  Fudge: FudgeSquares,
  'Bread Pudding': Pudding,
  Baguette,
  Bread: TinLoaf,
  Scone,
  Bakewell: TartSlice,
  Pastry: Danish,
}

const ART = {
  Cakes: Cake,
  Brownies: Brownie,
  Cookies: Cookie,
  Breads: Bread,
  Pastries: Croissant,
  'Muffins & Scones': Muffin,
}

// layoutId lets the picture morph between the menu card and the product sheet.
// The picture to show for a product: the owner's upload, else the bakery's own photo of it
export function productPhoto(product) {
  if (product?.imageUrl) return assetUrl(product.imageUrl)
  return PRODUCT_PHOTOS[product?.slug] || null
}

export default function ProductArt({ product, className = '', eager = false, plate: plateOverride, layoutId, artRef, radius }) {
  const [imageFailed, setImageFailed] = useState(false)
  const plate = plateOverride || PLATE_COLORS[product.category] || '#f3d27a'
  const style = { background: plate, ...(radius !== undefined ? { borderRadius: radius } : {}) }
  const Wrapper = layoutId ? motion.div : 'div'
  const wrapperProps = layoutId ? { layoutId, transition: { type: 'spring', stiffness: 260, damping: 30 } } : {}

  const photo = productPhoto(product)
  if (photo && !imageFailed) {
    return (
      <Wrapper ref={artRef} className={`product-art ${className}`} style={style} {...wrapperProps}>
        <img
          src={photo}
          alt={product.name}
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setImageFailed(true)}
        />
      </Wrapper>
    )
  }

  const Art = ART_BY_RECIPE[product.recipeName] || ART[product.category] || Brownie
  return (
    <Wrapper ref={artRef} className={`product-art ${className}`} style={style} {...wrapperProps}>
      <svg viewBox="0 0 200 150" role="img" aria-label={product.name}>
        <ellipse cx="100" cy="124" rx="76" ry="11" fill="#fffdfb" opacity="0.75" />
        <Art />
      </svg>
    </Wrapper>
  )
}
