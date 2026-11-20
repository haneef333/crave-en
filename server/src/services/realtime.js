// Live updates with Socket.IO. Customers join a room for their own account,
// so they only ever receive their own orders. The owner joins "admins".
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'

let io = null

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrls },
  })

  // Check the login token sent when the browser connects
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Not logged in'))
      const payload = jwt.verify(token, env.jwtSecret)
      const user = await User.findById(payload.sub)
      if (!user) return next(new Error('Not logged in'))
      socket.data.user = { id: user._id.toString(), role: user.role }
      next()
    } catch {
      next(new Error('Not logged in'))
    }
  })

  io.on('connection', socket => {
    const { id, role } = socket.data.user
    socket.join(`user:${id}`)
    if (role === 'admin') socket.join('admins')
  })

  return io
}

// Called whenever an order's status changes
export function emitOrderUpdate(order) {
  if (!io) return
  const payload = order.toJSON ? order.toJSON() : order
  io.to(`user:${order.user.toString()}`).to('admins').emit('order:updated', payload)
}

export function emitNewOrder(order) {
  if (!io) return
  io.to('admins').emit('order:created', order.toJSON ? order.toJSON() : order)
}
