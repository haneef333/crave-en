import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import * as api from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { formatPrice } from '../../utils'

const EMPTY = {
  code: '', description: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: '',
  expiresAt: '', usageLimit: '', perUserLimit: 1, firstOrderOnly: false, active: true,
}

function describe(c) {
  const amount = c.type === 'percent' ? `${c.value}% off` : `${formatPrice(c.value)} off`
  const parts = [amount]
  if (c.maxDiscount) parts.push(`up to ${formatPrice(c.maxDiscount)}`)
  if (c.minOrder) parts.push(`on orders over ${formatPrice(c.minOrder)}`)
  if (c.firstOrderOnly) parts.push('first order only')
  return parts.join(', ')
}

export default function ManageCoupons() {
  const toast = useToast()
  const [coupons, setCoupons] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => api.getCoupons().then(setCoupons).catch(err => toast(api.errorMessage(err), 'bad'))
  useEffect(() => { load() }, [])

  function open(c) {
    setEditing(c || {})
    setForm(c ? { ...EMPTY, ...c, expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', maxDiscount: c.maxDiscount ?? '', usageLimit: c.usageLimit ?? '' } : EMPTY)
    setError('')
  }
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function save(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const body = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value),
      minOrder: Number(form.minOrder) || 0,
      maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      perUserLimit: Number(form.perUserLimit) || 1,
      expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59` : null,
    }
    try {
      if (editing?._id) await api.updateCoupon(editing._id, body)
      else await api.createCoupon(body)
      toast(editing?._id ? 'Coupon saved' : 'Coupon created')
      setEditing(null)
      load()
    } catch (err) {
      setError(api.errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggle(c) {
    await api.updateCoupon(c._id, { active: !c.active }).catch(err => toast(api.errorMessage(err), 'bad'))
    load()
  }

  async function remove(c) {
    await api.deleteCoupon(c._id).catch(err => toast(api.errorMessage(err), 'bad'))
    toast(`Deleted ${c.code}`)
    load()
  }

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Coupons</h1>
        <button type="button" className="btn btn-primary" onClick={() => open(null)}>New coupon</button>
      </div>
      <p className="muted">Customers enter these at checkout. The discount is checked again on the server when the order is placed.</p>

      <AnimatePresence>
        {editing && (
          <motion.form className="admin-form" onSubmit={save} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <h2>{editing._id ? `Edit ${editing.code}` : 'New coupon'}</h2>
            <div className="field-row field-row-4">
              <label className="field"><span>Code</span><input className="input" value={form.code} onChange={set('code')} required placeholder="DIWALI20" /></label>
              <label className="field">
                <span>Type</span>
                <select className="input" value={form.type} onChange={set('type')}>
                  <option value="percent">Percent off</option>
                  <option value="flat">Rupees off</option>
                </select>
              </label>
              <label className="field"><span>{form.type === 'percent' ? 'Percent' : 'Amount (₹)'}</span><input className="input" type="number" min="1" value={form.value} onChange={set('value')} required /></label>
              <label className="field"><span>Max discount (₹)</span><input className="input" type="number" min="0" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="No cap" /></label>
            </div>
            <div className="field-row field-row-4">
              <label className="field"><span>Minimum order (₹)</span><input className="input" type="number" min="0" value={form.minOrder} onChange={set('minOrder')} /></label>
              <label className="field"><span>Expires on</span><input className="input" type="date" value={form.expiresAt} onChange={set('expiresAt')} /></label>
              <label className="field"><span>Total uses</span><input className="input" type="number" min="1" value={form.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" /></label>
              <label className="field"><span>Uses per customer</span><input className="input" type="number" min="1" value={form.perUserLimit} onChange={set('perUserLimit')} /></label>
            </div>
            <label className="field"><span>Description shown at checkout</span><input className="input" value={form.description} onChange={set('description')} maxLength={120} placeholder="20% off for Diwali" /></label>
            <div className="check-row">
              <label><input type="checkbox" checked={form.firstOrderOnly} onChange={set('firstOrderOnly')} /> First order only</label>
              <label><input type="checkbox" checked={form.active} onChange={set('active')} /> Active</label>
            </div>
            {error && <p className="notice notice-bad" role="alert">{error}</p>}
            <div className="button-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save coupon'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {!coupons && <p className="muted">Loading…</p>}
      {coupons?.length === 0 && <div className="empty"><p>No coupons yet. Create one to run an offer.</p></div>}
      {coupons?.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>Offer</th><th>Used</th><th>Expires</th><th>Active</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c._id} className={c.active ? '' : 'is-hidden'}>
                  <td><strong>{c.code}</strong>{c.description && <div className="muted small">{c.description}</div>}</td>
                  <td>{describe(c)}</td>
                  <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}{c.totalDiscount ? <div className="muted small">{formatPrice(c.totalDiscount)} given</div> : null}</td>
                  <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}</td>
                  <td><input type="checkbox" checked={c.active} onChange={() => toggle(c)} aria-label={`${c.code} active`} /></td>
                  <td className="row-actions">
                    <button type="button" className="link-button" onClick={() => open(c)}>Edit</button>
                    <button type="button" className="link-button danger" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
