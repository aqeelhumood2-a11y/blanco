import { useEffect, useState } from 'react'

// Browsers that support installable PWAs fire `beforeinstallprompt` instead
// of showing their own install UI automatically — capturing it is the only
// way to offer an in-app "Install" button at all (iOS Safari never fires
// this event; it only supports "Add to Home Screen" from its share sheet,
// which no web API can trigger, so this button simply never appears there).
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!deferredPrompt || installed) return null

  return (
    <button type="button" className="installAppButton" onClick={handleInstallClick}>
      تثبيت التطبيق | Install App
    </button>
  )
}

export default InstallPrompt
