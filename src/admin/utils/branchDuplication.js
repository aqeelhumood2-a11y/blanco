import { deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { runChunkedBatch } from './adminUtils.js'
import {
  categoriesCollectionRef,
  categoryDocRef,
  contactSettingsDocRef,
  productDocRef,
  productsCollectionRef,
  siteSettingsDocRef,
  themeSettingsDocRef,
} from './branchPaths.js'

// Firestore documents never hold live references to one another — writing
// a document always stores an independent copy of the payload. This just
// adds an explicit belt-and-braces guarantee: strip every value down to
// plain JSON before it's written, so no nested object (imageCrop, weekly
// hours, social links, ...) can ever end up shared between two branches'
// in-memory data, even transiently during the copy itself.
function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

// Copies every category, every product inside it, and the site/theme/contact
// settings documents from one branch into another — a true, field-agnostic
// clone (whatever fields exist on the source document, including ones added
// after this code was written, get copied) rather than a hand-picked subset.
// Once this finishes the two branches share nothing: editing either one
// never touches the other.
export async function duplicateBranchContent(sourceBranchId, targetBranchId) {
  const settingsCopies = [
    [siteSettingsDocRef(sourceBranchId), siteSettingsDocRef(targetBranchId)],
    [themeSettingsDocRef(sourceBranchId), themeSettingsDocRef(targetBranchId)],
    [contactSettingsDocRef(sourceBranchId), contactSettingsDocRef(targetBranchId)],
  ]

  for (const [sourceRef, targetRef] of settingsCopies) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await getDoc(sourceRef)
    if (snap.exists()) {
      // eslint-disable-next-line no-await-in-loop
      await setDoc(targetRef, deepClone(snap.data()))
    }
  }

  const categoriesSnap = await getDocs(categoriesCollectionRef(sourceBranchId))
  const operationBuilders = []

  for (const categoryDoc of categoriesSnap.docs) {
    const categoryData = deepClone(categoryDoc.data())
    operationBuilders.push((batch) => {
      batch.set(categoryDocRef(targetBranchId, categoryDoc.id), categoryData)
    })

    // eslint-disable-next-line no-await-in-loop
    const productsSnap = await getDocs(productsCollectionRef(sourceBranchId, categoryDoc.id))
    productsSnap.docs.forEach((productDoc) => {
      const productData = deepClone(productDoc.data())
      operationBuilders.push((batch) => {
        batch.set(productDocRef(targetBranchId, categoryDoc.id, productDoc.id), productData)
      })
    })
  }

  if (operationBuilders.length > 0) {
    await runChunkedBatch(db, operationBuilders)
  }
}

// Deletes every category/product/settings document that belongs to a branch
// (never touches the branch metadata doc itself, and never touches any
// other branch). Shared by "delete branch" and by the rollback path when a
// clone fails partway through.
export async function deleteBranchContent(branchId) {
  const categoriesSnap = await getDocs(categoriesCollectionRef(branchId))

  const operationBuilders = []
  for (const categoryDoc of categoriesSnap.docs) {
    // eslint-disable-next-line no-await-in-loop
    const productsSnap = await getDocs(productsCollectionRef(branchId, categoryDoc.id))
    productsSnap.docs.forEach((productDoc) => {
      operationBuilders.push((batch) => batch.delete(productDoc.ref))
    })
    operationBuilders.push((batch) => batch.delete(categoryDoc.ref))
  }

  if (operationBuilders.length > 0) {
    await runChunkedBatch(db, operationBuilders)
  }

  await deleteDoc(siteSettingsDocRef(branchId)).catch(() => {})
  await deleteDoc(themeSettingsDocRef(branchId)).catch(() => {})
  await deleteDoc(contactSettingsDocRef(branchId)).catch(() => {})
}
