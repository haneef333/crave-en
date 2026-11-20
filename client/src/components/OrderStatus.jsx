import { AnimatePresence, motion } from 'motion/react'
import { STATUS_LABELS } from '../config'
import { formatDateTime } from '../utils'

const TONE = {
  awaiting_confirmation: 'waiting',
  accepted: 'good',
  baking: 'good',
  ready: 'good',
  completed: 'done',
  declined: 'bad',
  cancelled: 'muted',
}

export function statusLabel(order) {
  return (STATUS_LABELS[order.status] || (() => order.status))(order.fulfilment)
}

// The badge pops when the status changes
export function StatusPill({ order }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={order.status}
        className={`status-pill status-${TONE[order.status] || 'muted'}`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      >
        {statusLabel(order)}
      </motion.span>
    </AnimatePresence>
  )
}

const STEPS = ['awaiting_confirmation', 'accepted', 'baking', 'ready', 'completed']

// A real sequence, so the steps are numbered. The line fills as the order moves along.
export function OrderProgress({ order }) {
  if (order.status === 'declined' || order.status === 'cancelled') return null
  const current = STEPS.indexOf(order.status)
  const when = Object.fromEntries(order.statusHistory.map(e => [e.status, e.at]))

  return (
    <ol className="progress">
      {STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        const label = step === 'awaiting_confirmation' ? 'Order placed' : STATUS_LABELS[step](order.fulfilment)
        return (
          <li key={step} className={`progress-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            {i < STEPS.length - 1 && <span className="progress-line"><span className="progress-fill" /></span>}
            <motion.span
              key={state}
              className="progress-dot"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15, delay: state === 'current' ? 0.35 : 0 }}
            >
              {state === 'done' ? '✓' : i + 1}
            </motion.span>
            <span className="progress-text">
              <span>{label}</span>
              {when[step] && <small>{formatDateTime(when[step])}</small>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
