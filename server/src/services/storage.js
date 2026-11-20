// Saves uploaded photos. With CLOUDINARY_URL set, photos go to Cloudinary
// (needed on Render, whose disk is wiped on every deploy). Without it, they're
// saved in server/uploads and served by Express, which is fine for local use.
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'
import { badRequest } from '../utils/httpError.js'

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads')
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const ALLOWED_TYPES = Object.keys(EXT)

let cloudinary = null
let cloudName = ''
async function getCloudinary() {
  if (!env.cloudinaryUrl) return null
  if (!cloudinary) {
    const mod = await import('cloudinary')
    cloudinary = mod.v2
    cloudinary.config({ secure: true }) // reads CLOUDINARY_URL from the environment
    cloudName = cloudinary.config().cloud_name
  }
  return cloudinary
}

// Check a file really is the image type it claims to be (looks at the first bytes)
function looksLikeImage(buffer, mimetype) {
  const b = buffer.subarray(0, 12)
  if (mimetype === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (mimetype === 'image/png') return b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG'
  if (mimetype === 'image/webp') return b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
  return false
}

export async function saveImage(file, folder) {
  if (!ALLOWED_TYPES.includes(file.mimetype) || !looksLikeImage(file.buffer, file.mimetype)) {
    throw badRequest('Upload a JPG, PNG or WebP photo.')
  }

  const cld = await getCloudinary()
  if (cld) {
    const result = await new Promise((resolve, reject) => {
      cld.uploader
        .upload_stream({ folder: `bakery/${folder}`, resource_type: 'image', transformation: [{ width: 1600, height: 1600, crop: 'limit' }] }, (err, res) => (err ? reject(err) : resolve(res)))
        .end(file.buffer)
    })
    return result.secure_url
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const name = `${folder}-${crypto.randomBytes(10).toString('hex')}.${EXT[file.mimetype]}`
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer)
  return `/uploads/${name}`
}

// Only accept photo links that point at files we stored ourselves
export function isOwnUpload(url) {
  if (/^\/uploads\/[a-z]+-[a-f0-9]{20}\.(jpg|png|webp)$/.test(url)) return true
  if (env.cloudinaryUrl) {
    const name = cloudName || (env.cloudinaryUrl.split('@')[1] || '')
    return url.startsWith(`https://res.cloudinary.com/${name}/image/upload/`)
  }
  return false
}

// Turn "/uploads/x.jpg" into a full link other apps (the inventory app, emails) can open
export const absoluteUrl = url => (url && url.startsWith('/') ? `${env.publicUrl}${url}` : url)
