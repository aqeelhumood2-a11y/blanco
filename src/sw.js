import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { offlineFallback } from 'workbox-recipes'

// A new service worker install normally sits "waiting" until every open
// tab of the old version closes. Since this app prompts the visitor
// ("update available") instead of silently reloading them, the page only
// asks this waiting worker to skipWaiting() once the visitor accepts —
// see src/pwa/registerSW.js, which posts this exact message.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

cleanupOutdatedCaches()

// __WB_MANIFEST is replaced at build time with every built asset (JS, CSS,
// the app shell HTML, icons, offline.html, ...) — this is the app's install
// cache, what makes it work offline at all.
precacheAndRoute(self.__WB_MANIFEST)

// Any navigation (/, /menu/:code, /admin, a deep link opened offline) tries
// the network first so visitors always get the live menu when they have a
// connection, and falls back to the cached app shell when they don't —
// client-side routing still works offline since index.html itself renders
// the whole app.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
)

// Google Fonts: the stylesheet is small and safe to revalidate on every
// visit, the actual font files never change once published so they're
// cached aggressively.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' }),
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 }),
    ],
  }),
)

// Google Drive-hosted product/category/hero/logo images: revalidate in the
// background but serve the cached copy instantly, so a repeat visit (or a
// flaky connection) doesn't have to refetch every menu photo.
registerRoute(
  ({ url }) => url.hostname.includes('drive.google.com') || url.hostname.includes('googleusercontent.com'),
  new StaleWhileRevalidate({
    cacheName: 'menu-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
)

// Last-resort fallback: a brand-new visitor with zero cache and no network
// gets a real branded offline page instead of the browser's default error
// screen. Firestore's own network calls are intentionally left uncached —
// the app's existing loading/error UI already handles a failed fetch, and
// caching live menu data risks silently showing stale prices/availability.
offlineFallback()
