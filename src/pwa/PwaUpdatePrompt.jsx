// registerType: 'prompt' (vite.config.js) means a new build never force-
// reloads a visitor mid-session — it waits until they click "update" here.
// State comes from usePwaUpdate(), called once at the top of App() so
// registration itself doesn't depend on which page/loading state renders.
function PwaUpdatePrompt({ needRefresh, offlineReady, updateServiceWorker, dismiss }) {
  if (!needRefresh && !offlineReady) return null

  return (
    <div className="pwaToast" role="status">
      <p>
        {needRefresh
          ? 'يتوفر تحديث جديد للموقع | A new version is available'
          : 'التطبيق جاهز للعمل بدون إنترنت الآن | Ready to work offline'}
      </p>
      <div className="pwaToastActions">
        {needRefresh && (
          <button type="button" onClick={() => updateServiceWorker(true)}>
            تحديث الآن | Update
          </button>
        )}
        <button type="button" className="pwaToastDismiss" onClick={dismiss}>
          إغلاق | Close
        </button>
      </div>
    </div>
  )
}

export default PwaUpdatePrompt
