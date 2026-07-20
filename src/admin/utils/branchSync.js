import { getDoc, getDocs, setDoc } from 'firebase/firestore'
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

// Every syncable aspect and which document fields it touches. Aspects never
// overlap on purpose — "prices" and "images" are carved out of "products"/
// "categories" so an admin can push just a price update or just new photos
// across branches without disturbing anything else on the target.
export const syncAspectOptions = [
  { value: 'categories', labelAr: 'الأقسام (الاسم والترتيب والظهور)' },
  { value: 'products', labelAr: 'المنتجات (الاسم والترتيب والظهور والخيارات)' },
  { value: 'prices', labelAr: 'الأسعار فقط' },
  { value: 'images', labelAr: 'صور الأقسام والمنتجات فقط' },
  { value: 'theme', labelAr: 'المظهر (الخطوط والتخطيط)' },
  { value: 'homepageColors', labelAr: 'ألوان الصفحة الرئيسية' },
  { value: 'hero', labelAr: 'صورة الهيدر والشعار وإعداداتهما' },
  { value: 'homepageText', labelAr: 'نصوص الصفحة الرئيسية' },
  { value: 'contact', labelAr: 'بيانات التواصل' },
  { value: 'hours', labelAr: 'ساعات العمل' },
]

const CATEGORY_FIELDS = ['nameEn', 'nameAr', 'order', 'visible', 'icon', 'color']
const PRODUCT_FIELDS = ['nameEn', 'nameAr', 'order', 'visible', 'status', 'availability', 'badges', 'options', 'schedule']
const PRICE_FIELDS = ['price', 'priceSchedule']
const IMAGE_FIELDS = ['imageUrl', 'imageCrop']

const HERO_FIELDS = [
  'heroBackgroundUrl',
  'heroBackgroundColor',
  'heroScale',
  'heroOffsetX',
  'heroOffsetY',
  'heroCropRatio',
  'heroOverlayOpacity',
  'heroAlign',
  'heroPaddingScale',
  'logoUrl',
  'logoScale',
  'logoOffsetX',
  'logoOffsetY',
  'logoFit',
  'logoPosition',
  'logoSize',
  'logoSpacingTop',
  'logoSpacingSide',
]

const HOMEPAGE_COLOR_FIELDS = [
  'pageBackgroundColor',
  'primaryColor',
  'buttonColor',
  'buttonTextColor',
  'priceBackgroundColor',
  'priceTextColor',
  'headingColor',
  'textColor',
  'mutedTextColor',
  'navigationBackgroundColor',
  'footerBackgroundColor',
  'footerTextColor',
  'borderColor',
  'menuBackgroundColor',
  'accentColor',
]

const THEME_FIELDS = ['arabicFont', 'englishFont', 'buttonSize', 'textScale', 'sectionSpacingScale']

// currency/showPrices don't fit any other bucket cleanly, so they travel
// with the rest of the general homepage text/settings.
const HOMEPAGE_TEXT_FIELDS = [
  'siteNameEn',
  'siteNameAr',
  'welcomeEn',
  'welcomeAr',
  'descriptionEn',
  'descriptionAr',
  'footerText',
  'contactHeadingEn',
  'contactHeadingAr',
  'currency',
  'showPrices',
]

const HOURS_FIELDS = ['weeklyHours', 'heroHours']

function pickFields(data, fields) {
  const picked = {}
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      picked[field] = data[field]
    }
  })
  return JSON.parse(JSON.stringify(picked))
}

async function syncSettingsDoc(sourceRef, targetRef, fields) {
  const sourceSnap = await getDoc(sourceRef)
  if (!sourceSnap.exists()) return
  const patch = pickFields(sourceSnap.data(), fields)
  if (Object.keys(patch).length === 0) return
  await setDoc(targetRef, patch, { merge: true })
}

async function syncFullSettingsDoc(sourceRef, targetRef) {
  const sourceSnap = await getDoc(sourceRef)
  if (!sourceSnap.exists()) return
  await setDoc(targetRef, JSON.parse(JSON.stringify(sourceSnap.data())), { merge: true })
}

// Structural sync: creates the target category if missing, otherwise merges
// just the given fields — never overwrites fields outside the chosen scope.
async function syncCategoryStructure(sourceBranchId, targetBranchId, fields, { createIfMissing }) {
  const sourceSnap = await getDocs(categoriesCollectionRef(sourceBranchId))
  const operationBuilders = []

  for (const categoryDoc of sourceSnap.docs) {
    const sourceData = categoryDoc.data()
    // eslint-disable-next-line no-await-in-loop
    const targetSnap = await getDoc(categoryDocRef(targetBranchId, categoryDoc.id))

    if (!targetSnap.exists() && !createIfMissing) continue

    const patch = pickFields(sourceData, fields)
    if (Object.keys(patch).length === 0) continue

    operationBuilders.push((batch) => {
      batch.set(categoryDocRef(targetBranchId, categoryDoc.id), patch, { merge: true })
    })
  }

  if (operationBuilders.length > 0) {
    await runChunkedBatch(db, operationBuilders)
  }
}

async function syncProductStructure(sourceBranchId, targetBranchId, fields, { createIfMissing }) {
  const sourceCategoriesSnap = await getDocs(categoriesCollectionRef(sourceBranchId))
  const operationBuilders = []

  for (const categoryDoc of sourceCategoriesSnap.docs) {
    // eslint-disable-next-line no-await-in-loop
    const targetCategorySnap = await getDoc(categoryDocRef(targetBranchId, categoryDoc.id))

    if (!targetCategorySnap.exists() && createIfMissing) {
      // Products syncing into a category the target doesn't have yet would
      // otherwise be orphaned (invisible in the admin) — create a minimal
      // shell so they show up under a real category.
      const categoryData = categoryDoc.data()
      operationBuilders.push((batch) => {
        batch.set(
          categoryDocRef(targetBranchId, categoryDoc.id),
          pickFields(categoryData, ['nameEn', 'nameAr', 'order', 'visible']),
          { merge: true },
        )
      })
    } else if (!targetCategorySnap.exists()) {
      continue
    }

    // eslint-disable-next-line no-await-in-loop
    const sourceProductsSnap = await getDocs(productsCollectionRef(sourceBranchId, categoryDoc.id))

    for (const productDoc of sourceProductsSnap.docs) {
      const sourceData = productDoc.data()
      // eslint-disable-next-line no-await-in-loop
      const targetProductSnap = await getDoc(productDocRef(targetBranchId, categoryDoc.id, productDoc.id))

      if (!targetProductSnap.exists() && !createIfMissing) continue

      const patch = pickFields(sourceData, fields)
      if (Object.keys(patch).length === 0) continue

      operationBuilders.push((batch) => {
        batch.set(productDocRef(targetBranchId, categoryDoc.id, productDoc.id), patch, { merge: true })
      })
    }
  }

  if (operationBuilders.length > 0) {
    await runChunkedBatch(db, operationBuilders)
  }
}

async function syncOneTarget(sourceBranchId, targetBranchId, aspects) {
  const aspectSet = new Set(aspects)

  if (aspectSet.has('categories')) {
    await syncCategoryStructure(sourceBranchId, targetBranchId, CATEGORY_FIELDS, { createIfMissing: true })
  }
  if (aspectSet.has('products')) {
    await syncProductStructure(sourceBranchId, targetBranchId, PRODUCT_FIELDS, { createIfMissing: true })
  }
  if (aspectSet.has('prices')) {
    await syncProductStructure(sourceBranchId, targetBranchId, PRICE_FIELDS, { createIfMissing: false })
  }
  if (aspectSet.has('images')) {
    await syncCategoryStructure(sourceBranchId, targetBranchId, IMAGE_FIELDS, { createIfMissing: false })
    await syncProductStructure(sourceBranchId, targetBranchId, IMAGE_FIELDS, { createIfMissing: false })
  }
  if (aspectSet.has('theme')) {
    await syncSettingsDoc(themeSettingsDocRef(sourceBranchId), themeSettingsDocRef(targetBranchId), THEME_FIELDS)
  }
  if (aspectSet.has('homepageColors')) {
    await syncSettingsDoc(
      themeSettingsDocRef(sourceBranchId),
      themeSettingsDocRef(targetBranchId),
      HOMEPAGE_COLOR_FIELDS,
    )
  }
  if (aspectSet.has('hero')) {
    await syncSettingsDoc(themeSettingsDocRef(sourceBranchId), themeSettingsDocRef(targetBranchId), HERO_FIELDS)
  }
  if (aspectSet.has('homepageText')) {
    await syncSettingsDoc(
      siteSettingsDocRef(sourceBranchId),
      siteSettingsDocRef(targetBranchId),
      HOMEPAGE_TEXT_FIELDS,
    )
  }
  if (aspectSet.has('hours')) {
    await syncSettingsDoc(siteSettingsDocRef(sourceBranchId), siteSettingsDocRef(targetBranchId), HOURS_FIELDS)
  }
  if (aspectSet.has('contact')) {
    await syncFullSettingsDoc(contactSettingsDocRef(sourceBranchId), contactSettingsDocRef(targetBranchId))
  }
}

// Runs the chosen aspects from one source branch into every target branch,
// skipping the source itself if it's accidentally included as a target.
// Returns the list of branch ids actually synced.
export async function syncBranchAspects({ sourceBranchId, targetBranchIds, aspects }) {
  const synced = []

  for (const targetBranchId of targetBranchIds) {
    if (targetBranchId === sourceBranchId) continue
    // eslint-disable-next-line no-await-in-loop
    await syncOneTarget(sourceBranchId, targetBranchId, aspects)
    synced.push(targetBranchId)
  }

  return synced
}
