import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// In development, /api requests go to the Express server.
// In production, set VITE_API_URL (see src/api/client.js).
export default defineConfig({
  plugins: [
    react(),
    // Makes the site installable on phones ("Add to Home screen") and loads the
    // app shell instantly on repeat visits. Orders, prices and stock always come
    // fresh from the server: the service worker never caches /api.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Crave En Home Bakery',
        short_name: 'Crave En',
        description: 'Order brownies, cookies, cakes and breads from our home bakery.',
        theme_color: '#f5f6f1',
        background_color: '#f5f6f1',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/socket\.io\//],
        runtimeCaching: [
          {
            // Product photos: show the saved copy, refresh it in the background
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/') || url.hostname === 'res.cloudinary.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'product-photos', expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 3600 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174, // 5173 is used by the inventory app
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:5000', ws: true, changeOrigin: true },
    },
  },
})
