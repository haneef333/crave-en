// The choices for a customizable item: size, flavour, eggless, and for
// celebration cakes the occasion, message, candles and a reference photo.
import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import QuantityStepper from './QuantityStepper'
import { errorMessage, uploadReferencePhoto } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useMeta } from '../hooks/useBakeryData'
import { formatPrice } from '../utils'

function Segment({ legend, children }) {
  return (
    <fieldset className="opt-group">
      <legend>{legend}</legend>
      <div className="opt-row">{children}</div>
    </fieldset>
  )
}

function OptionButton({ selected, onClick, children, layoutGroup }) {
  return (
    <button type="button" className={`opt${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      {selected && <motion.span layoutId={layoutGroup} className="opt-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      <span className="opt-label">{children}</span>
    </button>
  )
}

function ReferencePhoto({ value, onChange }) {
  const { user } = useAuth()
  const location = useLocation()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <p className="muted small">
        <Link to="/login" state={{ from: location.pathname + location.search }} className="text-link">Log in</Link> to upload a photo of a design you like.
      </p>
    )
  }

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Photos must be smaller than 5 MB.'); return }
    setBusy(true); setError('')
    try {
      onChange(await uploadReferencePhoto(file))
    } catch (err) {
      setError(errorMessage(err, 'The photo could not be uploaded. Try another one.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ref-photo">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden />
      <AnimatePresence mode="wait">
        {value ? (
          <motion.div key="has" className="ref-photo-preview" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <img src={value} alt="Your reference design" />
            <div>
              <p className="small">The baker will use this as a guide.</p>
              <button type="button" className="link-button" onClick={() => inputRef.current?.click()}>Change photo</button>{' '}
              <button type="button" className="link-button danger" onClick={() => onChange('')}>Remove</button>
            </div>
          </motion.div>
        ) : (
          <motion.button key="add" type="button" className="btn btn-ghost btn-small" onClick={() => inputRef.current?.click()} disabled={busy}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {busy ? 'Uploading…' : 'Upload a design you like'}
          </motion.button>
        )}
      </AnimatePresence>
      {error && <p className="warn small">{error}</p>}
    </div>
  )
}

export default function ProductOptions({ product, options, onChange }) {
  const meta = useMeta()
  const set = (key, value) => onChange({ ...options, [key]: value })
  const messageMax = meta?.messageMax || 40
  const candlesMax = meta?.candlesMax || 20

  return (
    <div className="product-options">
      {product.sizes?.length > 0 && (
        <Segment legend="Size">
          {product.sizes.map(s => (
            <OptionButton key={s.label} selected={options.size === s.label} onClick={() => set('size', s.label)} layoutGroup={`size-${product._id}`}>
              <strong>{s.label}</strong>
              <small>{formatPrice(s.price)}</small>
            </OptionButton>
          ))}
        </Segment>
      )}

      {product.flavours?.length > 0 && (
        <Segment legend="Flavour">
          {product.flavours.map(f => (
            <OptionButton key={f.label} selected={options.flavour === f.label} onClick={() => set('flavour', f.label)} layoutGroup={`flavour-${product._id}`}>
              {f.label}{f.extra ? <small> +{formatPrice(f.extra)}</small> : null}
            </OptionButton>
          ))}
        </Segment>
      )}

      {product.egglessExtra != null && (
        <label className="switch-row">
          <input type="checkbox" className="switch" checked={Boolean(options.eggless)} onChange={e => set('eggless', e.target.checked)} />
          <span>Make it eggless {product.egglessExtra ? <span className="muted">(+{formatPrice(product.egglessExtra)})</span> : null}</span>
        </label>
      )}

      {product.customizable && (
        <div className="celebration-fields">
          <Segment legend="What’s the occasion?">
            {(meta?.occasions || []).map(o => (
              <OptionButton key={o} selected={options.occasion === o} onClick={() => set('occasion', options.occasion === o ? '' : o)} layoutGroup={`occasion-${product._id}`}>
                {o}
              </OptionButton>
            ))}
          </Segment>

          <label className="field">
            <span>Message on the cake <span className="muted">(optional)</span></span>
            <input
              className="input"
              value={options.message || ''}
              maxLength={messageMax}
              onChange={e => set('message', e.target.value)}
              placeholder={options.occasion === 'Anniversary' ? 'Happy 10th Anniversary' : 'Happy Birthday Sana'}
            />
            <small className="muted">{(options.message || '').length}/{messageMax}</small>
          </label>

          <div className="field">
            <span className="field-label">Candles</span>
            <QuantityStepper value={options.candles || 0} onChange={v => set('candles', v)} min={0} max={candlesMax} label="candles" small />
          </div>

          <div className="field">
            <span className="field-label">Reference photo <span className="muted">(optional)</span></span>
            <ReferencePhoto value={options.referencePhotoUrl || ''} onChange={url => set('referencePhotoUrl', url)} />
          </div>
        </div>
      )}
    </div>
  )
}
