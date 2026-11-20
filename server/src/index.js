import http from 'node:http'
import { env, warnAboutDevSecrets } from './config/env.js'
import { connectDB } from './config/db.js'
import { createApp } from './app.js'
import { startSyncWorker } from './services/inventoryClient.js'
import { initRealtime } from './services/realtime.js'

async function main() {
  warnAboutDevSecrets()
  await connectDB()
  const app = createApp()
  // Express and Socket.IO share one HTTP server (and one port)
  const server = http.createServer(app)
  initRealtime(server)
  server.listen(env.port, () => {
    console.log(`[api] storefront API on http://localhost:${env.port}`)
    console.log(`[api] sending orders to inventory app at ${env.inventoryApiUrl}`)
    if (!env.smtp.host) console.log('[mail] SMTP not set: emails will be printed here instead of sent')
    if (!env.cloudinaryUrl) console.log('[uploads] CLOUDINARY_URL not set: photos are saved in server/uploads')
  })
  if (env.inventorySyncEnabled) startSyncWorker()
}

main().catch(err => {
  console.error('[api] failed to start:', err.message)
  process.exit(1)
})
