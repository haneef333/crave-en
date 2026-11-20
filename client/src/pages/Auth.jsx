import { useCallback, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { errorMessage, forgotPassword } from '../api/client'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton'

function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Captured once: see the note in RequireAuth about pages re-rendering while they fade out
  const [from] = useState(() => location.state?.from || '/')

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Hooks must all run before any early return
  const onGoogleSuccess = useCallback(() => navigate(from, { replace: true }), [navigate, from])

  if (user) return <Navigate to={from} replace />

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isRegister) await register(form)
      else await login({ email: form.email, password: form.password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="container page auth-page">
      <h1>{isRegister ? 'Create your account' : 'Log in'}</h1>
      <p className="muted">
        {isRegister
          ? 'You need an account to place orders and follow them as they’re baked.'
          : from === '/checkout' ? 'Log in to place your order. Your cart is saved.' : 'Welcome back.'}
      </p>
      <GoogleButton onSuccess={onGoogleSuccess} onError={setError} />
      <form onSubmit={submit} className="auth-form">
        {isRegister && (
          <label className="field">
            <span>Name</span>
            <input className="input" value={form.name} onChange={set('name')} required autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        {isRegister && (
          <label className="field">
            <span>Phone</span>
            <input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" />
          </label>
        )}
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={isRegister ? 6 : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          {isRegister && <small className="muted">At least 6 characters</small>}
          {!isRegister && <Link to="/forgot-password" className="text-link small forgot-link">Forgot password?</Link>}
        </label>
        {error && <p className="notice notice-bad" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'One moment…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>
      <p className="auth-switch">
        {isRegister ? 'Already have an account? ' : 'New here? '}
        <Link to={isRegister ? '/login' : '/register'} state={{ from }} className="text-link">
          {isRegister ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </div>
  )
}

export const Login = () => <AuthPage mode="login" />
export const Register = () => <AuthPage mode="register" />

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container page auth-page">
      <h1>Reset your password</h1>
      {sent ? (
        <>
          <p className="notice notice-good">If <strong>{email}</strong> has an account, we’ve emailed a link to reset the password. It works for 30 minutes.</p>
          <p className="muted small">Can’t find it? Check your spam folder, or <button type="button" className="link-button" onClick={() => setSent(false)}>try again</button>.</p>
        </>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <p className="muted">Enter the email you signed up with and we’ll send you a link to choose a new password.</p>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {error && <p className="notice notice-bad" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <p className="auth-switch"><Link to="/login" className="text-link">Back to log in</Link></p>
    </div>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { resetAndLogin } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      await resetAndLogin(token, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="container page auth-page">
      <h1>Choose a new password</h1>
      {!token ? (
        <p className="notice notice-bad">This link is incomplete. <Link to="/forgot-password" className="text-link">Request a new one</Link>.</p>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span>New password</span>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            <small className="muted">At least 6 characters</small>
          </label>
          {error && <p className="notice notice-bad" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Saving…' : 'Save and log in'}</button>
        </form>
      )}
    </div>
  )
}
