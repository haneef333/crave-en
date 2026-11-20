import { Router } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { saveImage } from '../services/storage.js'
import { badRequest } from '../utils/httpError.js'

const router = Router()

// Files are kept in memory just long enough to check and store them
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

const customerUploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many uploads. Try again in a while.' },
})

// POST /api/uploads/product — owner adds a menu photo (form field "photo")
router.post('/product', requireAuth, requireAdmin, upload.single('photo'), async (req, res) => {
  if (!req.file) throw badRequest('Choose a photo to upload.')
  res.status(201).json({ url: await saveImage(req.file, 'product') })
})

// POST /api/uploads/reference — customer shares a cake design they like
router.post('/reference', requireAuth, customerUploadLimit, upload.single('photo'), async (req, res) => {
  if (!req.file) throw badRequest('Choose a photo to upload.')
  res.status(201).json({ url: await saveImage(req.file, 'reference') })
})

export default router
