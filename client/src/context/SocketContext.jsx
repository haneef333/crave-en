// Live order updates with Socket.IO. Connects while you're logged in and
// tells any page that's listening when one of your orders changes.
import { createContext, useContext, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { tokenStore } from '../api/client'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { STATUS_LABELS } from '../config'

const SocketContext = createContext(null)

// In development Vite forwards /socket.io to the API; in production we connect
// to the API's own address.
const SOCKET_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') || undefined

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const listeners = useRef(new Set())

  useEffect(() => {
    if (!user) return
    const socket = io(SOCKET_URL, { auth: { token: tokenStore.get() }, transports: ['websocket', 'polling'] })

    socket.on('order:updated', order => {
      listeners.current.forEach(fn => fn(order))
      if (order.user === user.id) {
        const label = (STATUS_LABELS[order.status] || (() => order.status))(order.fulfilment)
        toast(`Order ${order.orderNumber}: ${label}`)
      }
    })
    return () => { socket.disconnect() }
  }, [user, toast])

  return <SocketContext.Provider value={listeners}>{children}</SocketContext.Provider>
}

// useOrderUpdates(order => ...) runs whenever one of your orders changes
export function useOrderUpdates(handler) {
  const listeners = useContext(SocketContext)
  const saved = useRef(handler)
  saved.current = handler
  useEffect(() => {
    if (!listeners) return
    const fn = order => saved.current(order)
    listeners.current.add(fn)
    return () => { listeners.current.delete(fn) }
  }, [listeners])
}
