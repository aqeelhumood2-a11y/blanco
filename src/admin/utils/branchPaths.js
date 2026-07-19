import { collection, doc } from 'firebase/firestore'
import { db } from '../../firebase.js'

// The very first branch this project ever had. Its content lives at the
// original flat collection paths (categories/, siteSettings/main, ...) so
// nothing needs to be migrated — every document created before branch
// support existed keeps working exactly as before, forever.
export const DEFAULT_BRANCH_ID = 'main'

export function isDefaultBranch(branchId) {
  return !branchId || branchId === DEFAULT_BRANCH_ID
}

export function categoriesCollectionRef(branchId) {
  return isDefaultBranch(branchId)
    ? collection(db, 'categories')
    : collection(db, 'branches', branchId, 'categories')
}

export function categoryDocRef(branchId, categoryId) {
  return isDefaultBranch(branchId)
    ? doc(db, 'categories', categoryId)
    : doc(db, 'branches', branchId, 'categories', categoryId)
}

export function productsCollectionRef(branchId, categoryId) {
  return isDefaultBranch(branchId)
    ? collection(db, 'categories', categoryId, 'products')
    : collection(db, 'branches', branchId, 'categories', categoryId, 'products')
}

export function productDocRef(branchId, categoryId, productId) {
  return isDefaultBranch(branchId)
    ? doc(db, 'categories', categoryId, 'products', productId)
    : doc(db, 'branches', branchId, 'categories', categoryId, 'products', productId)
}

export function siteSettingsDocRef(branchId) {
  return isDefaultBranch(branchId)
    ? doc(db, 'siteSettings', 'main')
    : doc(db, 'branches', branchId, 'settings', 'site')
}

export function themeSettingsDocRef(branchId) {
  return isDefaultBranch(branchId)
    ? doc(db, 'themeSettings', 'main')
    : doc(db, 'branches', branchId, 'settings', 'theme')
}

export function contactSettingsDocRef(branchId) {
  return isDefaultBranch(branchId)
    ? doc(db, 'contactSettings', 'main')
    : doc(db, 'branches', branchId, 'settings', 'contact')
}

// Branch metadata (name, code/slug, address, phone, social links, status)
// always lives at a single top-level collection regardless of which branch
// it describes — including the default branch, so it can be renamed/edited
// like any other branch from the Branch Management screen.
export function branchesCollectionRef() {
  return collection(db, 'branches')
}

export function branchDocRef(branchId) {
  return doc(db, 'branches', branchId)
}

export const branchStatusOptions = [
  { value: 'active', labelAr: 'نشط', labelEn: 'Active' },
  { value: 'hidden', labelAr: 'مخفي', labelEn: 'Hidden' },
  { value: 'archived', labelAr: 'مؤرشف', labelEn: 'Archived' },
  { value: 'disabled', labelAr: 'معطّل', labelEn: 'Disabled' },
]

export function defaultSocialLinks() {
  return { instagram: '', facebook: '', tiktok: '', snapchat: '', twitter: '' }
}

// The default branch never needs a real Firestore document to function —
// this is what the Branch Management screen shows for it until the admin
// actually edits its metadata (name/address/phone/...), at which point
// `branches/main` gets created like any other branch document.
export function defaultBranchMeta() {
  return {
    id: DEFAULT_BRANCH_ID,
    nameEn: 'Main Branch',
    nameAr: 'الفرع الرئيسي',
    code: DEFAULT_BRANCH_ID,
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    mapsLink: '',
    socialLinks: defaultSocialLinks(),
    status: 'active',
    order: 0,
    isDefault: true,
  }
}

export function normalizeBranch(raw) {
  return {
    id: raw.id,
    nameEn: raw.nameEn || '',
    nameAr: raw.nameAr || '',
    code: raw.code || raw.id,
    address: raw.address || '',
    phone: raw.phone || '',
    whatsapp: raw.whatsapp || '',
    email: raw.email || '',
    mapsLink: raw.mapsLink || '',
    socialLinks: { ...defaultSocialLinks(), ...(raw.socialLinks || {}) },
    status: raw.status || 'active',
    order: typeof raw.order === 'number' ? raw.order : 0,
    isDefault: raw.id === DEFAULT_BRANCH_ID,
  }
}

// URL-safe slug: lowercase letters, numbers and hyphens only, matching the
// /menu/:code routing pattern. `main` is reserved for the default branch.
export function slugifyBranchCode(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
}

export function validateBranchForm({ nameEn, nameAr, code }, existingBranches = []) {
  if (!nameEn?.trim()) return { valid: false, message: 'اكتب اسم الفرع بالإنجليزي' }
  if (!nameAr?.trim()) return { valid: false, message: 'اكتب اسم الفرع بالعربي' }

  const safeCode = slugifyBranchCode(code)
  if (!safeCode) return { valid: false, message: 'اكتب رمز فرع صالح (حروف إنجليزية وأرقام فقط)' }

  const codeTaken = existingBranches.some((branch) => branch.code === safeCode)
  if (codeTaken) return { valid: false, message: 'رمز الفرع مستخدم بالفعل، اختر رمزًا آخر' }

  return { valid: true, code: safeCode }
}
