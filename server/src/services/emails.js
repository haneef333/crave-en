// The emails the bakery sends. Each one has a plain-text and an HTML version.
import { siteUrl } from '../config/env.js'
import { celebrationLabel, variantLabel } from '../utils/pricing.js'
import { slotLabel } from '../utils/slots.js'
import { sendMail } from './mailer.js'

const BAKERY_NAME = process.env.BAKERY_NAME || 'Crave En'
const inr = n => `₹${Number(n || 0).toLocaleString('en-IN')}`
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#fff8f5;font-family:Arial,sans-serif;color:#3a1f17">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <div style="font-size:22px;font-weight:bold;margin-bottom:18px">${esc(BAKERY_NAME)}</div>
    <div style="background:#ffffff;border:2px solid #3a1f17;border-radius:18px;padding:22px">
      <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
      ${bodyHtml}
    </div>
  </div></body></html>`
}

function itemLines(order) {
  return order.items.map(i => {
    const variant = variantLabel(i.options)
    const extras = celebrationLabel(i.options)
    return `${i.quantity} × ${i.name}${variant ? ` (${variant})` : ''}${extras ? `\n    ${extras}` : ''}  ${inr(i.lineTotal)}`
  })
}

function itemsHtml(order) {
  const rows = order.items.map(i => {
    const variant = variantLabel(i.options)
    const extras = celebrationLabel(i.options)
    return `<tr><td style="padding:6px 0">${i.quantity} × ${esc(i.name)}${variant ? ` <span style="color:#6b4a3d">(${esc(variant)})</span>` : ''}${extras ? `<br><span style="color:#6b4a3d;font-size:13px">${esc(extras)}</span>` : ''}</td><td style="text-align:right;padding:6px 0">${inr(i.lineTotal)}</td></tr>`
  }).join('')
  const discount = order.discount ? `<tr><td style="color:#6b4a3d">Discount (${esc(order.couponCode)})</td><td style="text-align:right">−${inr(order.discount)}</td></tr>` : ''
  const delivery = `<tr><td style="color:#6b4a3d">Delivery</td><td style="text-align:right">${order.deliveryFee ? inr(order.deliveryFee) : 'Free'}</td></tr>`
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}${discount}${delivery}
    <tr><td style="padding-top:8px;font-weight:bold">Total</td><td style="text-align:right;padding-top:8px;font-weight:bold">${inr(order.total)}</td></tr></table>`
}

const orderLink = order => `${siteUrl()}/orders/${order.orderNumber}`
const button = (href, label) => `<p style="margin:20px 0 4px"><a href="${href}" style="background:#b8324b;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`

function when(order) {
  const date = new Date(`${order.neededBy}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${date}${order.timeSlot ? `, ${slotLabel(order.timeSlot).toLowerCase()}` : ''}`
}

export function sendOrderPlaced(order) {
  const subject = `We've got your order ${order.orderNumber}`
  const text = [
    `Hi ${order.customer.name},`,
    '',
    `Thanks for your order. The baker will check it and confirm soon.`,
    '',
    ...itemLines(order),
    order.discount ? `Discount (${order.couponCode}): -${inr(order.discount)}` : null,
    `Total: ${inr(order.total)}`,
    '',
    `For: ${when(order)} (${order.fulfilment})`,
    `Follow your order: ${orderLink(order)}`,
  ].filter(l => l !== null).join('\n')
  const html = layout('Thanks, your order is in', `
    <p>Hi ${esc(order.customer.name)}, the baker will check your order and confirm it soon.</p>
    ${itemsHtml(order)}
    <p style="margin-top:16px"><strong>For:</strong> ${esc(when(order))}, ${order.fulfilment === 'delivery' ? 'delivery' : 'pickup'}</p>
    ${button(orderLink(order), 'Follow your order')}`)
  return sendMail({ to: order.customer.email, subject, text, html })
}

const STATUS_COPY = {
  accepted: { subject: 'Your order is confirmed', line: 'Good news: the baker has confirmed your order and will start baking for your date.' },
  ready: { subject: 'Your order is ready', line: null },
  declined: { subject: 'About your order', line: null },
}

// Only the updates worth an email; "baking" and "completed" show on the order page
export function sendStatusUpdate(order) {
  const copy = STATUS_COPY[order.status]
  if (!copy) return Promise.resolve()
  let line = copy.line
  if (order.status === 'ready') line = order.fulfilment === 'delivery' ? 'Your order is out for delivery.' : 'Your order is ready to pick up.'
  if (order.status === 'declined') line = `Sorry, the baker couldn't take this order: ${order.declineReason || 'no reason given'}. Nothing was charged.`

  const subject = `${copy.subject} (${order.orderNumber})`
  const text = `Hi ${order.customer.name},\n\n${line}\n\n${itemLines(order).join('\n')}\n\nDetails: ${orderLink(order)}`
  const html = layout(copy.subject, `<p>Hi ${esc(order.customer.name)}, ${esc(line)}</p>${itemsHtml(order)}${button(orderLink(order), 'View your order')}`)
  return sendMail({ to: order.customer.email, subject, text, html })
}

export function sendPasswordReset(user, token) {
  const link = `${siteUrl()}/reset-password?token=${token}`
  const subject = `Reset your ${BAKERY_NAME} password`
  const text = `Hi ${user.name},\n\nUse this link to choose a new password. It works for 30 minutes.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`
  const html = layout('Reset your password', `<p>Hi ${esc(user.name)}, use the button below to choose a new password. The link works for 30 minutes.</p>${button(link, 'Choose a new password')}<p style="color:#6b4a3d;font-size:13px">If you didn't ask for this, you can ignore this email.</p>`)
  return sendMail({ to: user.email, subject, text, html })
}
