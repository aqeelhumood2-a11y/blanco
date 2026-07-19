import { useCallback, useState } from 'react'
import { deleteDoc, getDocs, setDoc } from 'firebase/firestore'
import { deleteBranchContent, duplicateBranchContent } from '../utils/branchDuplication.js'
import {
  DEFAULT_BRANCH_ID,
  branchDocRef,
  branchesCollectionRef,
  defaultBranchMeta,
  normalizeBranch,
  validateBranchForm,
} from '../utils/branchPaths.js'

export function useBranches() {
  const [branches, setBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [error, setError] = useState('')

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true)
    setError('')

    try {
      const snapshot = await getDocs(branchesCollectionRef())
      const loaded = snapshot.docs.map((branchDoc) =>
        normalizeBranch({ id: branchDoc.id, ...branchDoc.data() }),
      )

      // The default branch always exists and always shows up here, even
      // before its metadata document has ever been written — its content
      // already lives at the original flat collections regardless.
      const hasDefault = loaded.some((branch) => branch.id === DEFAULT_BRANCH_ID)
      const withDefault = hasDefault ? loaded : [defaultBranchMeta(), ...loaded]

      withDefault.sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
        return (a.order || 0) - (b.order || 0)
      })

      setBranches(withDefault)
      return withDefault
    } catch (err) {
      console.error(err)
      setError('صار خطأ أثناء تحميل الفروع')
      return []
    } finally {
      setLoadingBranches(false)
    }
  }, [])

  // cloneSourceBranchId: which branch's full menu/settings to duplicate into
  // the new one ('main' or any other existing branch id). The clone runs
  // right after the branch document is created; if it fails partway, the
  // partially-written branch (metadata + any copied content) is rolled back
  // so no half-created branch is ever left behind.
  async function createBranch(formValues, cloneSourceBranchId) {
    const check = validateBranchForm(formValues, branches)
    if (!check.valid) throw new Error(check.message)

    const newId = check.code

    const data = {
      nameEn: formValues.nameEn.trim(),
      nameAr: formValues.nameAr.trim(),
      code: newId,
      address: formValues.address?.trim() || '',
      phone: formValues.phone?.trim() || '',
      whatsapp: formValues.whatsapp?.trim() || '',
      email: formValues.email?.trim() || '',
      mapsLink: formValues.mapsLink?.trim() || '',
      socialLinks: {
        instagram: formValues.socialLinks?.instagram?.trim() || '',
        facebook: formValues.socialLinks?.facebook?.trim() || '',
        tiktok: formValues.socialLinks?.tiktok?.trim() || '',
        snapchat: formValues.socialLinks?.snapchat?.trim() || '',
        twitter: formValues.socialLinks?.twitter?.trim() || '',
      },
      status: 'active',
      order: branches.length,
    }

    await setDoc(branchDocRef(newId), data)

    try {
      await duplicateBranchContent(cloneSourceBranchId || DEFAULT_BRANCH_ID, newId)
    } catch (err) {
      console.error(err)
      // Roll back the partially-cloned branch so nothing half-created is
      // left behind — the admin sees a clean failure and can retry.
      await deleteBranchContent(newId).catch((cleanupError) => console.error(cleanupError))
      await deleteDoc(branchDocRef(newId)).catch((cleanupError) => console.error(cleanupError))
      throw new Error('تعذر نسخ محتوى الفرع، تم التراجع عن إنشاء الفرع بالكامل')
    }

    const created = normalizeBranch({ id: newId, ...data })
    setBranches((prev) => [...prev, created])

    return created
  }

  async function updateBranch(branchId, patch) {
    const previous = branches
    setBranches((prev) =>
      prev.map((branch) => (branch.id === branchId ? { ...branch, ...patch } : branch)),
    )

    try {
      await setDoc(branchDocRef(branchId), patch, { merge: true })
    } catch (err) {
      console.error(err)
      setBranches(previous)
      throw err
    }
  }

  async function setBranchStatus(branchId, status) {
    await updateBranch(branchId, { status })
  }

  async function deleteBranch(branch) {
    if (branch.isDefault || branch.id === DEFAULT_BRANCH_ID) {
      throw new Error('لا يمكن حذف الفرع الرئيسي')
    }

    const previous = branches
    setBranches((prev) => prev.filter((item) => item.id !== branch.id))

    try {
      // Best-effort cleanup of the branch's own content so deleting it
      // doesn't leave orphaned categories/products/settings behind —
      // this never touches any other branch's data.
      await deleteBranchContent(branch.id)
      await deleteDoc(branchDocRef(branch.id))
    } catch (err) {
      console.error(err)
      setBranches(previous)
      throw err
    }
  }

  return {
    branches,
    loadingBranches,
    error,
    setError,
    loadBranches,
    createBranch,
    updateBranch,
    setBranchStatus,
    deleteBranch,
  }
}
