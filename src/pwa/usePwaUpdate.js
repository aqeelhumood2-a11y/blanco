import { useRegisterSW } from 'virtual:pwa-register/react'

// Called unconditionally from the top of App() so the service worker
// registers as early as possible — including while Firestore is still
// loading (or unreachable), which is exactly when having an installed,
// cache-backed app shell matters most.
export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  function dismiss() {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return { needRefresh, offlineReady, updateServiceWorker, dismiss }
}
