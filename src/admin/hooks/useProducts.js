import { useCallback, useState } from 'react'
import { deleteDoc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'
import {
  convertGoogleDriveLink,
  createUniqueId,
  generateOptionId,
  nextOrderValue,
  normalizeImageCrop,
  normalizePriceRule,
  normalizeSchedule,
  runChunkedBatch,
  validateOptionGroups,
  validateOrderValue,
  validatePriceSchedule,
  validatePriceValue,
  validateSchedule,
} from '../utils/adminUtils.js'
import {
  DEFAULT_BRANCH_ID,
  categoriesCollectionRef,
  productDocRef,
  productsCollectionRef,
} from '../utils/branchPaths.js'

function normalizeOptionGroup(raw) {
  return {
    id: raw?.id || generateOptionId(),
    name: raw?.name || '',
    type: raw?.type === 'multiple' ? 'multiple' : 'single',
    choices: Array.isArray(raw?.choices)
      ? raw.choices.map((choice) => ({
          id: choice?.id || generateOptionId(),
          label: choice?.label || '',
          priceModifier: Number(choice?.priceModifier) || 0,
        }))
      : [],
  }
}

function normalizeProduct(raw) {
  return {
    ...raw,
    status: raw.status === 'draft' ? 'draft' : 'published',
    availability: raw.availability ?? (raw.visible === false ? 'hidden' : 'available'),
    visible: raw.visible !== false,
    badges: Array.isArray(raw.badges) ? raw.badges : [],
    options: Array.isArray(raw.options) ? raw.options.map(normalizeOptionGroup) : [],
    schedule: normalizeSchedule(raw.schedule),
    priceSchedule: Array.isArray(raw.priceSchedule)
      ? raw.priceSchedule.map((rule, index) => normalizePriceRule(rule, index))
      : [],
    // Missing on any product saved before per-image cropping existed —
    // normalizes to the safe "uncropped" default.
    imageCrop: normalizeImageCrop(raw.imageCrop),
  }
}

// Whitelist exactly the fields that belong in a Firestore product document.
// Never lets UI-only fields (id, categoryId, categoryNameEn, categoryNameAr)
// leak into storage.
function stripProductForFirestore(values) {
  const {
    nameEn,
    nameAr,
    price,
    order,
    visible,
    imageUrl,
    imageCrop,
    status,
    availability,
    badges,
    options,
    schedule,
    priceSchedule,
  } = values

  return {
    nameEn,
    nameAr,
    price,
    order,
    visible,
    imageUrl,
    imageCrop: normalizeImageCrop(imageCrop),
    status,
    availability,
    badges,
    options,
    schedule,
    priceSchedule,
  }
}

export function useProducts(branchId = DEFAULT_BRANCH_ID) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState('')

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true)
    setError('')

    try {
      const categoriesSnapshot = await getDocs(categoriesCollectionRef(branchId))

      const loadedCategories = categoriesSnapshot.docs
        .map((categoryDoc) => ({ id: categoryDoc.id, ...categoryDoc.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      // Build the category order lookup once instead of calling .find()
      // inside the product sort comparator.
      const categoryOrderMap = {}
      loadedCategories.forEach((category) => {
        categoryOrderMap[category.id] = category.order || 0
      })

      const productSnapshots = await Promise.all(
        loadedCategories.map((category) =>
          getDocs(productsCollectionRef(branchId, category.id)),
        ),
      )

      const allProducts = []

      loadedCategories.forEach((category, index) => {
        productSnapshots[index].forEach((productDoc) => {
          allProducts.push(
            normalizeProduct({
              id: productDoc.id,
              categoryId: category.id,
              categoryNameEn: category.nameEn,
              categoryNameAr: category.nameAr,
              ...productDoc.data(),
            }),
          )
        })
      })

      allProducts.sort((a, b) => {
        const orderA = categoryOrderMap[a.categoryId] || 0
        const orderB = categoryOrderMap[b.categoryId] || 0

        if (orderA !== orderB) return orderA - orderB

        return (a.order || 0) - (b.order || 0)
      })

      setCategories(loadedCategories)
      setProducts(allProducts)
    } catch (err) {
      console.error(err)
      setError('صار خطأ أثناء تحميل المنتجات')
    } finally {
      setLoadingProducts(false)
    }
  }, [branchId])

  async function saveProduct(values) {
    const {
      editingProduct,
      productNameEn,
      productNameAr,
      productPrice,
      productCategory,
      productOrder,
      productVisible,
      productImageUrl,
      productImageCrop,
      status,
      availability,
      badges,
      options,
      schedule,
      priceSchedule,
    } = values

    if (!productNameEn.trim()) throw new Error('اكتب اسم المنتج بالإنجليزي')
    if (!productNameAr.trim()) throw new Error('اكتب اسم المنتج بالعربي')

    const priceCheck = validatePriceValue(productPrice)
    if (!priceCheck.valid) throw new Error(priceCheck.message)

    const orderCheck = validateOrderValue(productOrder)
    if (!orderCheck.valid) throw new Error(orderCheck.message)

    if (!productCategory) throw new Error('اختر القسم')

    const optionsCheck = validateOptionGroups(options)
    if (!optionsCheck.valid) throw new Error(optionsCheck.message)

    const scheduleCheck = validateSchedule(schedule)
    if (!scheduleCheck.valid) throw new Error(scheduleCheck.message)

    const priceScheduleCheck = validatePriceSchedule(priceSchedule)
    if (!priceScheduleCheck.valid) throw new Error(priceScheduleCheck.message)

    const isNewProduct = !editingProduct
    const isMovingCategory = editingProduct && editingProduct.categoryId !== productCategory

    const finalImageUrl = convertGoogleDriveLink(productImageUrl.trim())

    const normalizedValues = stripProductForFirestore({
      nameEn: productNameEn.trim(),
      nameAr: productNameAr.trim(),
      price: productPrice.trim(),
      order: Number(productOrder),
      visible: productVisible,
      imageUrl: finalImageUrl,
      imageCrop: productImageCrop,
      status,
      availability,
      badges,
      options,
      schedule: normalizeSchedule(schedule),
      priceSchedule,
    })

    const targetCategoryInfo = categories.find((category) => category.id === productCategory)

    if (isNewProduct) {
      const newId = createUniqueId(productNameEn)

      await setDoc(productDocRef(branchId, productCategory, newId), normalizedValues)

      const savedProduct = normalizeProduct({
        id: newId,
        categoryId: productCategory,
        categoryNameEn: targetCategoryInfo?.nameEn,
        categoryNameAr: targetCategoryInfo?.nameAr,
        ...normalizedValues,
      })

      setProducts((prev) => [...prev, savedProduct])

      return true
    }

    if (!isMovingCategory) {
      await setDoc(
        productDocRef(branchId, editingProduct.categoryId, editingProduct.id),
        normalizedValues,
        { merge: true },
      )

      setProducts((prev) =>
        prev.map((product) =>
          product.id === editingProduct.id && product.categoryId === editingProduct.categoryId
            ? normalizeProduct({ ...product, ...normalizedValues })
            : product,
        ),
      )

      return false
    }

    // Moving to a different category: detect ID collisions and write
    // the create + delete atomically in a single batch.
    let targetId = editingProduct.id

    const collisionSnap = await getDoc(productDocRef(branchId, productCategory, targetId))

    if (collisionSnap.exists()) {
      targetId = createUniqueId(productNameEn)
    }

    const batch = writeBatch(db)
    batch.set(productDocRef(branchId, productCategory, targetId), normalizedValues)
    batch.delete(productDocRef(branchId, editingProduct.categoryId, editingProduct.id))
    await batch.commit()

    const movedProduct = normalizeProduct({
      id: targetId,
      categoryId: productCategory,
      categoryNameEn: targetCategoryInfo?.nameEn,
      categoryNameAr: targetCategoryInfo?.nameAr,
      ...normalizedValues,
    })

    setProducts((prev) =>
      prev
        .filter(
          (product) =>
            !(product.id === editingProduct.id && product.categoryId === editingProduct.categoryId),
        )
        .concat(movedProduct),
    )

    return false
  }

  async function deleteProduct(product) {
    const previous = products

    setProducts((prev) =>
      prev.filter((item) => !(item.id === product.id && item.categoryId === product.categoryId)),
    )

    try {
      await deleteDoc(productDocRef(branchId, product.categoryId, product.id))
    } catch (err) {
      console.error(err)
      setProducts(previous)
      throw err
    }
  }

  async function toggleProductVisibility(product) {
    // Only touches `visible` — never overwrites `availability`, so an
    // Out of Stock product stays Out of Stock after hide/show.
    const nextVisible = product.visible === false
    const previous = products

    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id && item.categoryId === product.categoryId
          ? { ...item, visible: nextVisible }
          : item,
      ),
    )

    try {
      await setDoc(
        productDocRef(branchId, product.categoryId, product.id),
        { visible: nextVisible },
        { merge: true },
      )
    } catch (err) {
      console.error(err)
      setProducts(previous)
      throw err
    }
  }

  async function duplicateProduct(product) {
    const { id: _id, categoryId: _categoryId, categoryNameEn: _categoryNameEn, categoryNameAr: _categoryNameAr, ...rest } = product

    const siblingProducts = products.filter((item) => item.categoryId === product.categoryId)
    const newId = createUniqueId(product.nameEn)

    const duplicateData = stripProductForFirestore({
      ...rest,
      order: nextOrderValue(siblingProducts),
      status: 'draft',
    })

    await setDoc(productDocRef(branchId, product.categoryId, newId), duplicateData)
    await loadProducts()
  }

  async function reorderProductsInCategory(categoryId, orderedIds) {
    const productsInCategory = products.filter((product) => product.categoryId === categoryId)

    const allIdsExist = orderedIds.every((id) =>
      productsInCategory.some((product) => product.id === id),
    )

    if (!allIdsExist || orderedIds.length !== productsInCategory.length) {
      setError('تعذر حفظ ترتيب المنتجات، البيانات غير متطابقة')
      return
    }

    const previous = products
    const optimistic = products.map((product) => {
      if (product.categoryId !== categoryId) return product
      const newOrder = orderedIds.indexOf(product.id) + 1
      return newOrder > 0 ? { ...product, order: newOrder } : product
    })
    setProducts(optimistic)

    try {
      const operationBuilders = orderedIds.map((productId, index) => (batch) => {
        batch.set(
          productDocRef(branchId, categoryId, productId),
          { order: index + 1 },
          { merge: true },
        )
      })

      await runChunkedBatch(db, operationBuilders)
    } catch (err) {
      console.error(err)
      setProducts(previous)
      setError('تعذر حفظ ترتيب المنتجات')
    }
  }

  async function bulkDeleteProducts(selectedProducts) {
    const operationBuilders = selectedProducts.map((product) => (batch) => {
      batch.delete(productDocRef(branchId, product.categoryId, product.id))
    })

    await runChunkedBatch(db, operationBuilders)
    await loadProducts()
  }

  async function bulkUpdateVisibility(selectedProducts, visible) {
    const operationBuilders = selectedProducts.map((product) => (batch) => {
      batch.set(
        productDocRef(branchId, product.categoryId, product.id),
        { visible },
        { merge: true },
      )
    })

    await runChunkedBatch(db, operationBuilders)
    await loadProducts()
  }

  async function bulkUpdateCategory(selectedProducts, newCategoryId) {
    const targetExists = categories.some((category) => category.id === newCategoryId)
    if (!targetExists) {
      throw new Error('القسم الهدف غير موجود')
    }

    const relevantProducts = selectedProducts.filter(
      (product) => product.categoryId !== newCategoryId,
    )

    const operationBuilders = []

    for (const product of relevantProducts) {
      const { id, categoryId: _categoryId, categoryNameEn: _categoryNameEn, categoryNameAr: _categoryNameAr, ...rest } = product

      // eslint-disable-next-line no-await-in-loop
      const collisionSnap = await getDoc(productDocRef(branchId, newCategoryId, id))
      const targetId = collisionSnap.exists() ? createUniqueId(product.nameEn) : id

      operationBuilders.push((batch) => {
        batch.set(productDocRef(branchId, newCategoryId, targetId), rest)
        batch.delete(productDocRef(branchId, categoryId, id))
      })
    }

    await runChunkedBatch(db, operationBuilders)
    await loadProducts()
  }

  async function bulkUpdateBadges(selectedProducts, badgesToAdd) {
    const operationBuilders = selectedProducts.map((product) => (batch) => {
      const merged = Array.from(new Set([...(product.badges || []), ...badgesToAdd]))
      batch.set(
        productDocRef(branchId, product.categoryId, product.id),
        { badges: merged },
        { merge: true },
      )
    })

    await runChunkedBatch(db, operationBuilders)
    await loadProducts()
  }

  return {
    products,
    categories,
    loadingProducts,
    error,
    setError,
    loadProducts,
    saveProduct,
    deleteProduct,
    toggleProductVisibility,
    duplicateProduct,
    reorderProductsInCategory,
    bulkDeleteProducts,
    bulkUpdateVisibility,
    bulkUpdateCategory,
    bulkUpdateBadges,
  }
}
