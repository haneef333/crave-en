import { useEffect, useState } from 'react'
import * as api from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useMeta } from '../../hooks/useBakeryData'
import { assetUrl, formatPrice } from '../../utils'

const EMPTY = {
  name: '', recipeName: '', category: 'Brownies', price: '', unitLabel: 'per piece',
  minNoticeDays: 0, description: '', imageUrl: '', tags: '', isAvailable: true, isFeatured: false,
  sizes: [], flavours: [], egglessExtra: '', customizable: false,
}

function toForm(p) {
  return {
    ...EMPTY, ...p, tags: (p.tags || []).join(', '), price: String(p.price),
    sizes: p.sizes || [], flavours: p.flavours || [], egglessExtra: p.egglessExtra ?? '',
  }
}

export default function ManageMenu() {
  const meta = useMeta()
  const toast = useToast()
  const [products, setProducts] = useState(null)
  const [recipes, setRecipes] = useState(null)
  const [recipesError, setRecipesError] = useState('')
  const [editing, setEditing] = useState(null) // null = closed, {} = new, product = edit
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = () => api.getAllProducts().then(setProducts).catch(err => setError(api.errorMessage(err)))
  useEffect(() => {
    load()
    api.getRecipeNames()
      .then(setRecipes)
      .catch(err => setRecipesError(api.errorMessage(err, 'Could not load recipe names from the inventory app.')))
  }, [])

  function open(product) {
    setEditing(product || {})
    setForm(product ? toForm(product) : EMPTY)
    setError('')
  }

  const set = field => e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = {
      ...form,
      price: Number(form.price),
      minNoticeDays: Number(form.minNoticeDays),
      sizes: form.sizes.filter(x => x.label.trim()).map(x => ({ label: x.label.trim(), price: Number(x.price) || 0, recipeScale: Number(x.recipeScale) || 1 })),
      flavours: form.flavours.filter(x => x.label.trim()).map(x => ({ label: x.label.trim(), extra: Number(x.extra) || 0 })),
      egglessExtra: form.egglessExtra === '' ? null : Number(form.egglessExtra),
    }
    try {
      if (editing?._id) await api.updateProduct(editing._id, body)
      else await api.createProduct(body)
      toast(editing?._id ? 'Changes saved' : 'Item added to the menu')
      setEditing(null)
      load()
    } catch (err) {
      setError(api.errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggle(product, field) {
    try {
      await api.updateProduct(product._id, { [field]: !product[field] })
      load()
    } catch (err) {
      toast(api.errorMessage(err), 'bad')
    }
  }

  async function remove(product) {
    try {
      await api.deleteProduct(product._id)
      toast(`Deleted ${product.name}`)
      setConfirmDelete(null)
      load()
    } catch (err) {
      toast(api.errorMessage(err), 'bad')
    }
  }

  const recipeUnknown = recipes && form.recipeName && !recipes.includes(form.recipeName)

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Manage menu</h1>
        <button type="button" className="btn btn-primary" onClick={() => open(null)}>Add an item</button>
      </div>
      <p className="muted">
        Each item is linked to a recipe in the inventory app. When you accept an order there, that recipe’s ingredients are taken out of stock.
      </p>
      {recipesError && <p className="notice">{recipesError} You can still type recipe names by hand.</p>}

      {editing && (
        <form className="admin-form" onSubmit={save}>
          <h2>{editing._id ? `Edit ${editing.name}` : 'New menu item'}</h2>
          <div className="field-row">
            <label className="field">
              <span>Name on the menu</span>
              <input className="input" value={form.name} onChange={set('name')} required />
            </label>
            <label className="field">
              <span>Recipe in the inventory app</span>
              <input className="input" value={form.recipeName} onChange={set('recipeName')} list="recipe-names" required />
              <datalist id="recipe-names">{recipes?.map(r => <option key={r} value={r} />)}</datalist>
              {recipeUnknown && <small className="warn">No recipe with this name yet. Add it on the inventory app’s Recipes page, or orders can’t be accepted.</small>}
            </label>
          </div>
          <div className="field-row field-row-4">
            <label className="field">
              <span>Category</span>
              <select className="input" value={form.category} onChange={set('category')}>
                {meta?.categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Price (₹)</span>
              <input className="input" type="number" min="0" step="1" value={form.price} onChange={set('price')} required />
            </label>
            <label className="field">
              <span>Sold as</span>
              <input className="input" value={form.unitLabel} onChange={set('unitLabel')} placeholder="per piece, box of 6, 1 kg" />
            </label>
            <label className="field">
              <span>Days of notice</span>
              <input className="input" type="number" min="0" max="14" value={form.minNoticeDays} onChange={set('minNoticeDays')} />
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea className="input" rows={3} value={form.description} onChange={set('description')} maxLength={600} />
          </label>
          <div className="field-row">
            <PhotoField value={form.imageUrl} onChange={url => setForm(f => ({ ...f, imageUrl: url }))} />
            <label className="field">
              <span>Tags, separated by commas</span>
              <input className="input" value={form.tags} onChange={set('tags')} placeholder="Eggless, Bestseller" />
            </label>
          </div>
          <OptionsEditor form={form} setForm={setForm} />

          <div className="check-row">
            <label><input type="checkbox" checked={form.isAvailable} onChange={set('isAvailable')} /> Show on the menu</label>
            <label><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Feature on the home page</label>
          </div>
          {error && <p className="notice notice-bad" role="alert">{error}</p>}
          <div className="button-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing._id ? 'Save changes' : 'Add to menu'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!products && <p className="muted">Loading…</p>}
      {products && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th><th>Recipe</th><th>Price</th><th>On menu</th><th>Featured</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} className={p.isAvailable ? '' : 'is-hidden'}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="muted small">{p.category}, {p.unitLabel}</div>
                  </td>
                  <td>
                    {p.recipeName}
                    {recipes && !recipes.includes(p.recipeName) && <div className="warn small">Recipe missing</div>}
                  </td>
                  <td>{formatPrice(p.price)}</td>
                  <td><input type="checkbox" checked={p.isAvailable} onChange={() => toggle(p, 'isAvailable')} aria-label={`Show ${p.name} on the menu`} /></td>
                  <td><input type="checkbox" checked={p.isFeatured} onChange={() => toggle(p, 'isFeatured')} aria-label={`Feature ${p.name}`} /></td>
                  <td className="row-actions">
                    <button type="button" className="link-button" onClick={() => open(p)}>Edit</button>
                    {confirmDelete === p._id ? (
                      <>
                        <button type="button" className="link-button danger" onClick={() => remove(p)}>Confirm delete</button>
                        <button type="button" className="link-button" onClick={() => setConfirmDelete(null)}>Keep</button>
                      </>
                    ) : (
                      <button type="button" className="link-button danger" onClick={() => setConfirmDelete(p._id)}>Delete</button>
                    )}
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

// Upload a photo from the phone or computer (or paste a link)
function PhotoField({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    try {
      onChange(await api.uploadProductPhoto(file))
    } catch (err) {
      setError(api.errorMessage(err, 'The photo could not be uploaded.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="field">
      <span className="field-label">Photo</span>
      <div className="photo-field">
        {value ? <img src={assetUrl(value)} alt="" className="photo-thumb" /> : <div className="photo-thumb photo-empty">No photo</div>}
        <div>
          <label className="btn btn-ghost btn-small">
            {busy ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden disabled={busy} />
          </label>
          {value && <button type="button" className="link-button danger" onClick={() => onChange('')}>Remove</button>}
          <input className="input input-small" type="url" value={value} onChange={e => onChange(e.target.value)} placeholder="…or paste a photo link" />
          {error && <small className="warn">{error}</small>}
        </div>
      </div>
    </div>
  )
}

// Sizes, flavours, eggless and celebration options
function OptionsEditor({ form, setForm }) {
  const update = (list, i, key, value) => setForm(f => ({ ...f, [list]: f[list].map((row, j) => (j === i ? { ...row, [key]: value } : row)) }))
  const addRow = (list, row) => setForm(f => ({ ...f, [list]: [...f[list], row] }))
  const removeRow = (list, i) => setForm(f => ({ ...f, [list]: f[list].filter((_, j) => j !== i) }))

  return (
    <details className="options-editor" open={form.sizes.length > 0 || form.flavours.length > 0 || form.customizable}>
      <summary>Options: sizes, flavours, eggless, celebration details</summary>

      <h3>Sizes</h3>
      <p className="muted small">When you add sizes, the customer picks one and its price replaces the price above. “Recipe amount” tells the inventory app how much to deduct: 2 means twice the recipe.</p>
      {form.sizes.map((row, i) => (
        <div className="option-row" key={i}>
          <input className="input" value={row.label} onChange={e => update('sizes', i, 'label', e.target.value)} placeholder="1 kg" aria-label="Size name" />
          <input className="input" type="number" min="0" value={row.price} onChange={e => update('sizes', i, 'price', e.target.value)} placeholder="Price ₹" aria-label="Size price" />
          <input className="input" type="number" min="0.1" step="0.1" value={row.recipeScale} onChange={e => update('sizes', i, 'recipeScale', e.target.value)} aria-label="Recipe amount" title="Recipe amount" />
          <button type="button" className="link-button danger" onClick={() => removeRow('sizes', i)}>Remove</button>
        </div>
      ))}
      <button type="button" className="link-button" onClick={() => addRow('sizes', { label: '', price: '', recipeScale: 1 })}>Add a size</button>

      <h3>Flavours</h3>
      {form.flavours.map((row, i) => (
        <div className="option-row" key={i}>
          <input className="input" value={row.label} onChange={e => update('flavours', i, 'label', e.target.value)} placeholder="Chocolate" aria-label="Flavour name" />
          <input className="input" type="number" min="0" value={row.extra} onChange={e => update('flavours', i, 'extra', e.target.value)} placeholder="Extra ₹" aria-label="Extra price" />
          <button type="button" className="link-button danger" onClick={() => removeRow('flavours', i)}>Remove</button>
        </div>
      ))}
      <button type="button" className="link-button" onClick={() => addRow('flavours', { label: '', extra: 0 })}>Add a flavour</button>

      <div className="field-row">
        <label className="field">
          <span>Eggless extra charge (₹)</span>
          <input className="input" type="number" min="0" value={form.egglessExtra} onChange={e => setForm(f => ({ ...f, egglessExtra: e.target.value }))} placeholder="Leave empty if not offered" />
        </label>
        <label className="check-row" style={{ alignSelf: 'end' }}>
          <input type="checkbox" checked={form.customizable} onChange={e => setForm(f => ({ ...f, customizable: e.target.checked }))} />
          Celebration details (occasion, message, candles, reference photo)
        </label>
      </div>
    </details>
  )
}
