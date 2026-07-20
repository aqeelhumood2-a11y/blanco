import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // A hand-written service worker (src/sw.js) instead of the fully
      // generated one — this app needs specific runtime-caching rules for
      // Google Drive-hosted images and a real offline-fallback page, which
      // is simplest to express directly with workbox's building blocks.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false, // registered manually from src/pwa/registerSW.js
      registerType: 'prompt',
      devOptions: { enabled: false },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,jpeg,jpg,svg,ico,webmanifest}'],
      },
      includeAssets: ['favicon.jpeg', 'apple-touch-icon.png', 'icons.svg', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'BLANCO — Digital Menu',
        short_name: 'BLANCO',
        description: 'Browse the digital menu for BLANCO — drinks, food and more.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f1e8',
        theme_color: '#42171d',
        orientation: 'portrait',
        lang: 'en',
        categories: ['food', 'shopping'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
