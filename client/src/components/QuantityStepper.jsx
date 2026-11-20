import { RollingNumber } from './Motion'

export default function QuantityStepper({ value, onChange, min = 0, max = 50, label = 'item', small = false }) {
  return (
    <div className={`stepper${small ? ' stepper-small' : ''}`} role="group" aria-label={`Quantity of ${label}`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={value - 1 <= 0 ? `Remove ${label}` : `One less ${label}`}
      >
        −
      </button>
      <span aria-live="polite" className="stepper-value"><RollingNumber value={value} /></span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`One more ${label}`}
      >
        +
      </button>
    </div>
  )
}
