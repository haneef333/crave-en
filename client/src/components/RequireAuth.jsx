import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ children, admin = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  // Remember the page that was asked for. While a page fades out it re-renders
  // with the next page's URL, so reading location later would give the wrong page.
  const [from] = useState(location.pathname)

  if (loading) return <div className="container page"><p className="muted">Loading…</p></div>
  if (!user) return <Navigate to="/login" replace state={{ from }} />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  return children
}
