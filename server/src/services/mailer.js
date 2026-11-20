// Sends emails with Nodemailer. Without SMTP settings, emails are printed in
// the server terminal instead, so everything still works while developing.
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transport = null
function getTransport() {
  if (!env.smtp.host) return null
  transport ||= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  })
  return transport
}

export const sentInTests = [] // tests read this to check what would have been sent

export async function sendMail({ to, subject, text, html }) {
  if (env.isTest) {
    sentInTests.push({ to, subject, text })
    return
  }
  const t = getTransport()
  if (!t) {
    console.log(`\n[mail] (not sent: SMTP not configured)\n  To: ${to}\n  Subject: ${subject}\n  ${text.split('\n').join('\n  ')}\n`)
    return
  }
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, text, html })
  } catch (err) {
    // An email problem should never break placing an order
    console.error(`[mail] could not send "${subject}" to ${to}:`, err.message)
  }
}
