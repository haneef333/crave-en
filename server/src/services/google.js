// Checks a "Sign in with Google" credential. The browser gets the credential
// from Google; we confirm with Google that it is genuine and meant for our app.
import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env.js'

let client = null

export async function verifyGoogleCredential(credential) {
  client ||= new OAuth2Client(env.googleClientId)
  const ticket = await client.verifyIdToken({ idToken: credential, audience: env.googleClientId })
  const p = ticket.getPayload()
  if (!p?.email || !p.email_verified) throw new Error('Google account email is not verified')
  return { googleId: p.sub, email: p.email.toLowerCase(), name: p.name || p.email.split('@')[0], avatarUrl: p.picture || '' }
}
