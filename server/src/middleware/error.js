import mongoose from 'mongoose'
import { HttpError } from '../utils/httpError.js'

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, details: err.details })
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ message: details[0] || 'Invalid data.', details })
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}.` })
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value'
    const message = field === 'email'
      ? 'An account with this email already exists.'
      : `That ${field} is already in use.`
    return res.status(409).json({ message })
  }

  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photos must be smaller than 5 MB.' : 'Upload one photo at a time.'
    return res.status(400).json({ message })
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON.' })
  }

  // Errors from Express itself (e.g. a missing uploaded file) carry their own status
  const status = err?.status || err?.statusCode
  if (status && status < 500) {
    return res.status(status).json({ message: status === 404 ? 'Not found.' : err.message })
  }

  console.error(err)
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' })
}
