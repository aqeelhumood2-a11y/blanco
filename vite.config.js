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
      // No `manifest` option here on purpose. Menu and Admin are two
      // separate installable apps with their own manifest each
      // (public/manifest.webmanifest, public/admin-manifest.webmanifest),
      // both hand-written and linked explicitly from index.html/admin.html.
      // Letting this plugin generate+inject a manifest would inject the
      // *same* one into every HTML entry below, including admin.html —
      // exactly the bug this file exists to avoid.
      manifest: false,
    }),
  ],
  build: {
    rollupOptions: {
      // Two real, independent HTML entry points sharing the same React
      // bundle — App.jsx branches on window.location.pathname at runtime,
      // but the installable identity (manifest link, icon, title,
      // theme-color) each page presents has to be static markup, not
      // something JS rewrites after the fact, for iOS's Add to Home Screen
      // to pick it up reliably.
      input: {
        main: 'index.html',
        admin: 'admin.html',
      },
    },
  },
})
