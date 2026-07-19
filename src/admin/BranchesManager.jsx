import { useEffect, useRef, useState } from 'react'
import { useBranches } from './hooks/useBranches.js'
import { branchStatusOptions, defaultSocialLinks } from './utils/branchPaths.js'

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

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [successMessage, setSuccessMessage] = useState('')
  const [creating, setCreating] = useState(false)

  const creatingLock = useRef(false)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateSocialField(field, value) {
    setForm((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [field]: value } }))
  }

  function openNewBranchForm() {
    setForm(emptyForm)
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

    try {
      await createBranch(form)
      setSuccessMessage('تم إنشاء الفرع بنجاح. منتجاته وإعداداته فارغة الآن — سيتم إضافة نسخ المنيو تلقائيًا من الفرع الرئيسي في تحديث قادم.')
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

          <button type="button" onClick={onBack}>
            الرجوع للوحة الرئيسية
          </button>
        </div>
      </div>

      {error && <div className="adminDashboardError">{error}</div>}
      {successMessage && <p className="uploadSuccess">{successMessage}</p>}

      {showForm && (
        <form className="adminBranchForm" onSubmit={handleCreateBranch}>
          <h3>فرع جديد</h3>

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
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default BranchesManager
