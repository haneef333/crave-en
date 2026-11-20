import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage, getMyOrders } from '../api/client'
import { StatusPill } from '../components/OrderStatus'
import { FINAL_STATUSES } from '../config'
import { formatDate, formatPrice } from '../utils'
import { useOrderUpdates } from '../context/SocketContext'
import { useReorder } from '../hooks/useReorder'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = () => getMyOrders()
      .then(list => { if (alive) { setOrders(list); setError('') } })
      .catch(err => alive && setError(errorMessage(err)))
    load()
    const t = setInterval(load, 60000) // backup in case the live connection drops
    return () => { alive = false; clearInterval(t) }
  }, [])

  // Live: replace an order in the list as soon as it changes
  useOrderUpdates(updated => setOrders(list => list?.map(o => (o._id === updated._id ? updated : o)) || list))

  const open = orders?.filter(o => !FINAL_STATUSES.includes(o.status)) || []
  const past = orders?.filter(o => FINAL_STATUSES.includes(o.status)) || []

  return (
    <div className="container page narrow">
      <h1>My orders</h1>
      {error && <p className="notice notice-bad">{error}</p>}
      {!orders && !error && <p className="muted">Loading your orders…</p>}
      {orders?.length === 0 && (
        <div className="empty">
          <p>You haven’t ordered anything yet.</p>
          <Link to="/menu" className="btn btn-primary">Browse the menu</Link>
        </div>
      )}
      {open.length > 0 && <OrderList title="In progress" orders={open} />}
      {past.length > 0 && <OrderList title="Past orders" orders={past} />}
    </div>
  )
}

function OrderList({ title, orders }) {
  const reorder = useReorder()
  return (
    <section className="order-list-section">
      <h2>{title}</h2>
      <ul className="order-list">
        {orders.map(o => (
          <li key={o._id}>
            <Link to={`/orders/${o.orderNumber}`} className="order-row">
              <div className="order-row-main">
                <span className="order-row-items">
                  {o.items.map(i => `${i.quantity} × ${i.name}`).join(', ')}
                </span>
                <span className="muted small">
                  For {formatDate(o.neededBy)}, {o.fulfilment === 'delivery' ? 'delivery' : 'pickup'}. Order {o.orderNumber}
                </span>
              </div>
              <div className="order-row-side">
                <StatusPill order={o} />
                <span className="order-row-total">{formatPrice(o.total)}</span>
              </div>
            </Link>
            {FINAL_STATUSES.includes(o.status) && (
              <button type="button" className="link-button order-again" onClick={() => reorder(o)}>Order again</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
