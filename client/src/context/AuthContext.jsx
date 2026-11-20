import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(api.tokenStore.get()))

  // Restore the session on page load
  useEffect(() => {
    if (!api.tokenStore.get()) return
    api.getMe()
      .then(setUser)
      .catch(() => api.tokenStore.set(null))
      .finally(() => setLoading(false))
  }, [])

  const handleAuth = useCallback(({ token, user: u }) => {
    api.tokenStore.set(token)
    setUser(u)
    return u
  }, [])

  const login = useCallback(creds => api.login(creds).then(handleAuth), [handleAuth])
  const loginWithGoogle = useCallback(credential => api.googleLogin(credential).then(handleAuth), [handleAuth])
  // After a password reset the server logs you straight in
  const resetAndLogin = useCallback((token, password) => api.resetPassword(token, password).then(handleAuth), [handleAuth])
  const register = useCallback(details => api.register(details).then(handleAuth), [handleAuth])
  const logout = useCallback(() => {
    api.tokenStore.set(null)
    setUser(null)
  }, [])
  const refresh = useCallback(() => api.getMe().then(setUser).catch(() => {}), [])

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, loginWithGoogle, resetAndLogin, register, logout, refresh }),
    [user, loading, login, loginWithGoogle, resetAndLogin, register, logout, refresh],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
