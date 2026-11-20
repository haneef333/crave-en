// "Continue with Google" using Google Identity Services. Only shown when the
// server has a GOOGLE_CLIENT_ID; otherwise this renders nothing.
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useMeta } from '../hooks/useBakeryData'

let scriptPromise = null
function loadGoogleScript() {
  scriptPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = resolve
    s.onerror = () => { scriptPromise = null; reject(new Error('Google sign-in could not load')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export default function GoogleButton({ onSuccess, onError }) {
  const meta = useMeta()
  const { loginWithGoogle } = useAuth()
  const holder = useRef(null)
  const [failed, setFailed] = useState(false)
  const clientId = meta?.googleClientId

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              await loginWithGoogle(credential)
              onSuccess?.()
            } catch (err) {
              onError?.(errorMessage(err, 'Google sign-in did not work. Try again.'))
            }
          },
        })
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with',
          width: Math.min(holder.current.offsetWidth || 360, 400),
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => { cancelled = true }
  }, [clientId, loginWithGoogle, onSuccess, onError])

  if (!clientId || failed) return null
  return (
    <div className="google-signin">
      <div ref={holder} className="google-button-holder" />
      <div className="or-divider"><span>or use your email</span></div>
    </div>
  )
}
