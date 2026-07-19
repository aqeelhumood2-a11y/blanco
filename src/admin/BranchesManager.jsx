import { useEffect, useRef, useState } from 'react'
import { useBranches } from './hooks/useBranches.js'
import { useBranchSync } from './hooks/useBranchSync.js'
import { DEFAULT_BRANCH_ID, branchStatusOptions, defaultSocialLinks } from './utils/branchPaths.js'
import { syncAspectOptions } from './utils/branchSync.js'
import { generateBranchQrDataUrl, getBranchMenuUrl } from './utils/branchQr.js'

const emptyForm = {
  nameEn: '',
  nameAr: '',
  code: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  mapsLink: '',
  socialLinks: defaultSocialLinks(),
}

function BranchesManager({ onBack, currentBranchId, onSwitchBranch }) {
  const { branches, loadingBranches, error, setError, loadBranches, createBranch, setBranchStatus, deleteBranch } =
    useBranches()
  const { syncing, syncMessage, syncError, setSyncMessage, setSyncError, runSync } = useBranchSync()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [successMessage, setSuccessMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [cloneMode, setCloneMode] = useState('default')
  const [cloneSourceId, setCloneSourceId] = useState('')

  const [qrOpenFor, setQrOpenFor] = useState(null)
  const [qrDataUrls, setQrDataUrls] = useState({})
  const [copiedFor, setCopiedFor] = useState(null)

  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [syncSourceId, setSyncSourceId] = useState(currentBranchId)
  const [syncAspects, setSyncAspects] = useState([])
  const [syncTargetIds, setSyncTargetIds] = useState([])

  const creatingLock = useRef(false)
  const syncingLock = useRef(false)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    setSyncSourceId(currentBranchId)
  }, [currentBranchId])

  async function toggleQrPanel(branch) {
    if (qrOpenFor === branch.id) {
      setQrOpenFor(null)
      return
    }

    setQrOpenFor(branch.id)

    if (!qrDataUrls[branch.id]) {
      try {
        const dataUrl = await generateBranchQrDataUrl(branch.code)
        setQrDataUrls((prev) => ({ ...prev, [branch.id]: dataUrl }))
      } catch (err) {
        console.error(err)
      }
    }
  }

  async function copyBranchUrl(branch) {
    const url = getBranchMenuUrl(branch.code)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedFor(branch.id)
      setTimeout(() => setCopiedFor((prev) => (prev === branch.id ? null : prev)), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  function downloadBranchQr(branch) {
    const dataUrl = qrDataUrls[branch.id]
    if (!dataUrl) return

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `blanco-menu-${branch.code}-qr.png`
    link.click()
  }

  function toggleSyncAspect(value) {
    setSyncAspects((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  function toggleSyncTarget(id) {
    setSyncTargetIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function selectAllSyncTargets() {
    setSyncTargetIds(branches.filter((b) => b.id !== syncSourceId).map((b) => b.id))
  }

  async function handleRunSync() {
    if (syncingLock.current) return

    const targetNames = branches
      .filter((b) => syncTargetIds.includes(b.id))
      .map((b) => b.nameAr || b.nameEn)
      .join('، ')

    const confirmed = window.confirm(
      `سيتم استبدال العناصر المحددة في الفروع التالية ببيانات الفرع المصدر: ${targetNames}. هل تريد المتابعة؟`,
    )
    if (!confirmed) return

    syncingLock.current = true
    try {
      await runSync({ sourceBranchId: syncSourceId, targetBranchIds: syncTargetIds, aspects: syncAspects })
    } catch {
      // error message already surfaced via syncError
    } finally {
      syncingLock.current = false
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateSocialField(field, value) {
    setForm((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [field]: value } }))
  }

  function openNewBranchForm() {
    setForm(emptyForm)
    setCloneMode('default')
    setCloneSourceId('')
    setError('')
    setSuccessMessage('')
    setShowForm(true)
  }

  async function handleCreateBranch(event) {
    event.preventDefault()
    if (creatingLock.current) return
    creatingLock.current = true

    setCreating(true)
    setError('')
    setSuccessMessage('')

    const sourceId = cloneMode === 'other' ? cloneSourceId : DEFAULT_BRANCH_ID

    if (cloneMode === 'other' && !sourceId) {
      setError('اختر الفرع الذي تريد النسخ منه')
      creatingLock.current = false
      setCreating(false)
      return
    }

    const sourceBranch = branches.find((branch) => branch.id === sourceId)

    try {
      await createBranch(form, sourceId)
      setSuccessMessage(
        `تم إنشاء الفرع بنجاح، مع نسخ كامل المنيو والإعدادات من "${sourceBranch?.nameAr || sourceBranch?.nameEn || 'الفرع الرئيسي'}". الفرع الجديد مستقل تمامًا — أي تعديل عليه لن يؤثر على الفرع المصدر.`,
      )
      setForm(emptyForm)
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'صار خطأ أثناء إنشاء الفرع')
    } finally {
      creatingLock.current = false
      setCreating(false)
    }
  }

  async function handleDelete(branch) {
    const confirmed = window.confirm(
      `هل تريد حذف فرع "${branch.nameAr || branch.nameEn}"؟ سيتم حذف كل منتجاته وأقسامه وإعداداته نهائيًا.`,
    )
    if (!confirmed) return

    try {
      await deleteBranch(branch)
    } catch (err) {
      setError(err.message || 'تعذر حذف الفرع')
    }
  }

  return (
    <section className="adminBranchesSection">
      <div className="adminCategoriesHeader">
        <div>
          <h2>إدارة الفروع</h2>
          <p>كل فرع له منتجاته وأقسامه وألوانه وساعاته وبيانات التواصل الخاصة به بشكل مستقل تمامًا.</p>
        </div>

        <div className="adminProductsHeaderButtons">
          <button type="button" onClick={openNewBranchForm}>
            + إضافة فرع جديد
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSyncPanel((prev) => !prev)
              setSyncMessage('')
              setSyncError('')
            }}
          >
            أدوات المزامنة
          </button>

          <button type="button" onClick={onBack}>
            الرجوع للوحة الرئيسية
          </button>
        </div>
      </div>

      {error && <div className="adminDashboardError">{error}</div>}
      {successMessage && <p className="uploadSuccess">{successMessage}</p>}

      {showSyncPanel && (
        <div className="adminBranchSyncPanel">
          <h3>مزامنة بين الفروع</h3>
          <p className="adminBranchCloneHint">
            اختر العناصر التي تريد نسخها من فرع المصدر إلى فرع أو أكثر — يتم استبدال هذه العناصر فقط في الفروع
            الهدف، وكل شيء آخر يبقى كما هو.
          </p>

          {syncError && <div className="adminDashboardError">{syncError}</div>}
          {syncMessage && <p className="uploadSuccess">{syncMessage}</p>}

          <label className="adminSyncSourceLabel">
            فرع المصدر
            <select value={syncSourceId} onChange={(e) => setSyncSourceId(e.target.value)}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.nameAr || branch.nameEn}
                </option>
              ))}
            </select>
          </label>

          <div className="adminSyncAspectsGrid">
            {syncAspectOptions.map((option) => (
              <label key={option.value} className="adminSyncAspectOption">
                <input
                  type="checkbox"
                  checked={syncAspects.includes(option.value)}
                  onChange={() => toggleSyncAspect(option.value)}
                />
                {option.labelAr}
              </label>
            ))}
          </div>

          <p className="adminBranchCloneTitle">مزامنة إلى:</p>
          <div className="adminSyncTargetsGrid">
            {branches
              .filter((branch) => branch.id !== syncSourceId)
              .map((branch) => (
                <label key={branch.id} className="adminSyncAspectOption">
                  <input
                    type="checkbox"
                    checked={syncTargetIds.includes(branch.id)}
                    onChange={() => toggleSyncTarget(branch.id)}
                  />
                  {branch.nameAr || branch.nameEn}
                </label>
              ))}
          </div>

          <div className="adminProductsHeaderButtons">
            <button type="button" onClick={selectAllSyncTargets}>
              تحديد كل الفروع
            </button>
            <button type="button" onClick={handleRunSync} disabled={syncing}>
              {syncing ? 'جاري المزامنة...' : 'تنفيذ المزامنة'}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form className="adminBranchForm" onSubmit={handleCreateBranch}>
          <h3>فرع جديد</h3>

          <div className="adminBranchCloneSection">
            <p className="adminBranchCloneTitle">نسخ المنيو والإعدادات من:</p>

            <label className="adminBranchCloneOption">
              <input
                type="radio"
                name="cloneMode"
                checked={cloneMode === 'default'}
                onChange={() => {
                  setCloneMode('default')
                  setCloneSourceId('')
                }}
              />
              الفرع الرئيسي (Default Branch)
            </label>

            <label className="adminBranchCloneOption">
              <input
                type="radio"
                name="cloneMode"
                checked={cloneMode === 'other'}
                onChange={() => setCloneMode('other')}
              />
              فرع آخر موجود بالفعل
            </label>

            {cloneMode === 'other' && (
              <select
                value={cloneSourceId}
                onChange={(e) => setCloneSourceId(e.target.value)}
                required
              >
                <option value="">اختر الفرع...</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nameAr || branch.nameEn}
                  </option>
                ))}
              </select>
            )}

            <p className="adminBranchCloneHint">
              سيتم نسخ الأقسام والمنتجات (بأسعارها وصورها وترتيبها وظهورها) والمظهر والشعار وصورة الهيدر
              وساعات العمل وبيانات التواصل نسخًا كاملاً ومستقلاً — تعديل الفرع الجديد لن يغيّر شيئًا في الفرع المصدر.
            </p>
          </div>

          <div className="adminBranchFormGrid">
            <label>
              اسم الفرع (إنجليزي)
              <input value={form.nameEn} onChange={(e) => updateField('nameEn', e.target.value)} required />
            </label>

            <label>
              اسم الفرع (عربي)
              <input value={form.nameAr} onChange={(e) => updateField('nameAr', e.target.value)} required dir="rtl" />
            </label>

            <label>
              رمز الفرع (يظهر في رابط المنيو: /menu/الرمز)
              <input
                value={form.code}
                onChange={(e) => updateField('code', e.target.value)}
                placeholder="seef"
                required
              />
            </label>

            <label>
              العنوان
              <input value={form.address} onChange={(e) => updateField('address', e.target.value)} dir="rtl" />
            </label>

            <label>
              الهاتف
              <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </label>

            <label>
              واتساب
              <input value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} />
            </label>

            <label>
              البريد الإلكتروني
              <input value={form.email} onChange={(e) => updateField('email', e.target.value)} type="email" />
            </label>

            <label>
              رابط خرائط قوقل
              <input value={form.mapsLink} onChange={(e) => updateField('mapsLink', e.target.value)} />
            </label>

            <label>
              إنستقرام
              <input
                value={form.socialLinks.instagram}
                onChange={(e) => updateSocialField('instagram', e.target.value)}
              />
            </label>

            <label>
              فيسبوك
              <input
                value={form.socialLinks.facebook}
                onChange={(e) => updateSocialField('facebook', e.target.value)}
              />
            </label>

            <label>
              تيك توك
              <input
                value={form.socialLinks.tiktok}
                onChange={(e) => updateSocialField('tiktok', e.target.value)}
              />
            </label>

            <label>
              سناب شات
              <input
                value={form.socialLinks.snapchat}
                onChange={(e) => updateSocialField('snapchat', e.target.value)}
              />
            </label>

            <label>
              اكس (تويتر)
              <input
                value={form.socialLinks.twitter}
                onChange={(e) => updateSocialField('twitter', e.target.value)}
              />
            </label>
          </div>

          <div className="adminProductsHeaderButtons">
            <button type="submit" disabled={creating}>
              {creating ? 'جاري الإنشاء...' : 'إنشاء الفرع'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      {loadingBranches ? (
        <p>جاري تحميل الفروع...</p>
      ) : (
        <div className="adminBranchesList">
          {branches.map((branch) => (
            <article
              key={branch.id}
              className={`adminBranchCard${branch.id === currentBranchId ? ' adminBranchCardActive' : ''}`}
            >
              <div>
                <h3>
                  {branch.nameAr || branch.nameEn}
                  {branch.isDefault && <span className="adminBranchDefaultTag">الفرع الرئيسي</span>}
                  {branch.id === currentBranchId && (
                    <span className="adminBranchCurrentTag">قيد الإدارة الآن</span>
                  )}
                </h3>
                <p>{branch.nameEn}</p>
                <small>
                  الرابط: /menu/{branch.code} · الحالة:{' '}
                  {branchStatusOptions.find((option) => option.value === branch.status)?.labelAr || branch.status}
                </small>
                {branch.address && <small>{branch.address}</small>}
                {branch.phone && <small>هاتف: {branch.phone}</small>}
              </div>

              <div className="adminCategoryActions">
                <button type="button" onClick={() => onSwitchBranch(branch)}>
                  {branch.id === currentBranchId ? 'قيد الإدارة' : 'التبديل لهذا الفرع'}
                </button>

                <button type="button" onClick={() => toggleQrPanel(branch)}>
                  {qrOpenFor === branch.id ? 'إخفاء الرابط وQR' : 'الرابط ورمز QR'}
                </button>

                {!branch.isDefault && (
                  <select
                    value={branch.status}
                    onChange={(e) => setBranchStatus(branch.id, e.target.value)}
                  >
                    {branchStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.labelAr}
                      </option>
                    ))}
                  </select>
                )}

                {!branch.isDefault && (
                  <button type="button" className="deleteCategoryButton" onClick={() => handleDelete(branch)}>
                    حذف
                  </button>
                )}
              </div>

              {qrOpenFor === branch.id && (
                <div className="adminBranchQrPanel">
                  <div className="adminBranchQrUrlRow">
                    <input type="text" readOnly value={getBranchMenuUrl(branch.code)} />
                    <button type="button" onClick={() => copyBranchUrl(branch)}>
                      {copiedFor === branch.id ? 'تم النسخ ✓' : 'نسخ الرابط'}
                    </button>
                    <a href={getBranchMenuUrl(branch.code)} target="_blank" rel="noreferrer">
                      فتح المنيو
                    </a>
                  </div>

                  {qrDataUrls[branch.id] ? (
                    <div className="adminBranchQrImageRow">
                      <img src={qrDataUrls[branch.id]} alt={`QR ${branch.nameAr || branch.nameEn}`} width={140} height={140} />
                      <button type="button" onClick={() => downloadBranchQr(branch)}>
                        تحميل QR
                      </button>
                    </div>
                  ) : (
                    <p>جاري توليد رمز QR...</p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default BranchesManager
