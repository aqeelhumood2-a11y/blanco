import { useCallback, useMemo, useState } from 'react'
import { deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import {
  convertGoogleDriveLink,
  createUniqueId,
  nextOrderValue,
  normalizeImageCrop,
  pickNextCategoryColor,
  runChunkedBatch,
  validateOrderValue,
} from '../utils/adminUtils.js'
import {
  DEFAULT_BRANCH_ID,
  categoriesCollectionRef,
  categoryDocRef,
  productDocRef,
  productsCollectionRef,
} from '../utils/branchPaths.js'

function normalizeCategory(raw) {
  return {
    ...raw,
    visible: raw.visible !== false,
    icon: raw.icon || '',
    color: raw.color || '#582369',
    imageUrl: raw.imageUrl || '',
    imageCrop: normalizeImageCrop(raw.imageCrop),
  }
}

export function useCategories(branchId = DEFAULT_BRANCH_ID) {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState('')

  const loadCategories = useCallback(async () => {
    setLoadingProducts(true)
    setError('')

    try {
      const categoriesSnapshot = await getDocs(categoriesCollectionRef(branchId))

      const loadedCategories = categoriesSnapshot.docs
        .map((categoryDoc) => normalizeCategory({ id: categoryDoc.id, ...categoryDoc.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      const productSnapshots = await Promise.all(
        loadedCategories.map((category) =>
          getDocs(productsCollectionRef(branchId, category.id)),
        ),
      )

      const allProducts = []

      loadedCategories.forEach((category, index) => {
        productSnapshots[index].forEach((productDoc) => {
          allProducts.push({ id: productDoc.id, categoryId: category.id, ...productDoc.data() })
        })
      })

      setCategories(loadedCategories)
      setProducts(allProducts)
    } catch (err) {
      console.error(err)
      setError('صار خطأ أثناء تحميل الأقسام والمنتجات')
    } finally {
      setLoadingProducts(false)
    }
  }, [branchId])

  // Built once per products/categories change and reused everywhere,
  // instead of calling products.filter() per category card.
  const productCountByCategory = useMemo(() => {
    const map = {}
    products.forEach((product) => {
      map[product.categoryId] = (map[product.categoryId] || 0) + 1
    })
    return map
  }, [products])

  async function saveCategory({
    editingCategory,
    categoryNameEn,
    categoryNameAr,
    categoryOrder,
    categoryVisible,
    categoryIcon,
    categoryColor,
    categoryImageUrl,
    categoryImageCrop,
  }) {
    if (!categoryNameEn.trim()) throw new Error('اكتب اسم القسم بالإنجليزي')
    if (!categoryNameAr.trim()) throw new Error('اكتب اسم القسم بالعربي')

    const orderCheck = validateOrderValue(categoryOrder)
    if (!orderCheck.valid) throw new Error(orderCheck.message)

    const isNewCategory = !editingCategory
    const categoryId = editingCategory ? editingCategory.id : createUniqueId(categoryNameEn)
    const safeColor = categoryColor || pickNextCategoryColor(categories)

    const data = {
      nameEn: categoryNameEn.trim(),
      nameAr: categoryNameAr.trim(),
      order: Number(categoryOrder),
      visible: categoryVisible,
      icon: categoryIcon || '',
      color: safeColor,
      imageUrl: convertGoogleDriveLink((categoryImageUrl || '').trim()),
      imageCrop: normalizeImageCrop(categoryImageCrop),
    }

    await setDoc(categoryDocRef(branchId, categoryId), data, { merge: true })

    setCategories((prev) => {
      const next = isNewCategory
        ? [...prev, normalizeCategory({ id: categoryId, ...data })]
        : prev.map((category) =>
            category.id === categoryId ? normalizeCategory({ ...category, ...data }) : category,
          )

      return next.sort((a, b) => (a.order || 0) - (b.order || 0))
    })

    return isNewCategory
  }

  async function deleteCategory(category) {
    // Authoritative check against Firestore, not local state, since
    // subcollections are never auto-deleted and stale state could
    // otherwise let an orphaned products subcollection through.
    const liveProductsSnap = await getDocs(productsCollectionRef(branchId, category.id))

    if (!liveProductsSnap.empty) {
      throw new Error('لا يمكن حذف القسم لوجود منتجات بداخله، انقل المنتجات أولًا')
    }

    const previous = categories
    setCategories((prev) => prev.filter((item) => item.id !== category.id))

    try {
      await deleteDoc(categoryDocRef(branchId, category.id))
    } catch (err) {
      console.error(err)
      setCategories(previous)
      throw err
    }
  }

  async function toggleCategoryVisibility(category) {
    const nextVisible = category.visible === false
    const previous = categories

    setCategories((prev) =>
      prev.map((item) => (item.id === category.id ? { ...item, visible: nextVisible } : item)),
    )

    try {
      await setDoc(categoryDocRef(branchId, category.id), { visible: nextVisible }, { merge: true })
    } catch (err) {
      console.error(err)
      setCategories(previous)
      throw err
    }
  }

  async function duplicateCategory(category) {
    const newId = createUniqueId(category.nameEn)
    const safeColor = category.color || pickNextCategoryColor(categories)

    const categoryData = {
      nameEn: `${category.nameEn} (Copy)`,
      nameAr: `${category.nameAr} (نسخة)`,
      order: nextOrderValue(categories),
      visible: false,
      icon: category.icon || '',
      color: safeColor,
    }

    await setDoc(categoryDocRef(branchId, newId), categoryData)

    try {
      const liveProductsSnap = await getDocs(productsCollectionRef(branchId, category.id))

      const operationBuilders = liveProductsSnap.docs.map((productDoc) => (batch) => {
        const productData = productDoc.data()
        const duplicateId = createUniqueId(productData.nameEn || 'product')

        batch.set(productDocRef(branchId, newId, duplicateId), {
          ...productData,
          status: 'draft',
        })
      })

      await runChunkedBatch(db, operationBuilders)
    } catch (err) {
      console.error(err)
      // Roll back the partially-created category so nothing orphaned
      // is left behind if copying the products failed.
      await deleteDoc(categoryDocRef(branchId, newId)).catch((cleanupError) => {
        console.error(cleanupError)
      })
      throw new Error('تعذر نسخ منتجات القسم، تم التراجع عن العملية')
    }

    await loadCategories()
  }

  async function reorderCategories(orderedIds) {
    const allIdsExist = orderedIds.every((id) => categories.some((category) => category.id === id))

    if (!allIdsExist || orderedIds.length !== categories.length) {
      setError('تعذر حفظ ترتيب الأقسام، البيانات غير متطابقة')
      return
    }

    const previous = categories
    const optimistic = orderedIds.map((id, index) => {
      const found = categories.find((c) => c.id === id)
      return { ...found, order: index + 1 }
    })
    setCategories(optimistic)

    try {
      const operationBuilders = orderedIds.map((id, index) => (batch) => {
        batch.set(categoryDocRef(branchId, id), { order: index + 1 }, { merge: true })
      })

      await runChunkedBatch(db, operationBuilders)
    } catch (err) {
      console.error(err)
      setCategories(previous)
      setError('تعذر حفظ ترتيب الأقسام')
    }
  }

  async function moveProductsToCategory(sourceCategoryId, targetCategoryId) {
    if (sourceCategoryId === targetCategoryId) {
      throw new Error('اختر قسمًا مختلفًا عن القسم الحالي')
    }

    const targetExists = categories.some((category) => category.id === targetCategoryId)
    if (!targetExists) {
      throw new Error('القسم الهدف غير موجود')
    }

    const liveProductsSnap = await getDocs(productsCollectionRef(branchId, sourceCategoryId))

    const operationBuilders = []

    for (const productDoc of liveProductsSnap.docs) {
      const productData = productDoc.data()

      // eslint-disable-next-line no-await-in-loop
      const collisionSnap = await getDoc(
        productDocRef(branchId, targetCategoryId, productDoc.id),
      )

      const targetId = collisionSnap.exists()
        ? createUniqueId(productData.nameEn || 'product')
        : productDoc.id

      operationBuilders.push((batch) => {
        batch.set(productDocRef(branchId, targetCategoryId, targetId), productData)
        batch.delete(productDocRef(branchId, sourceCategoryId, productDoc.id))
      })
    }

    await runChunkedBatch(db, operationBuilders)
    await loadCategories()
  }

  return {
    categories,
    products,
    loadingProducts,
    error,
    setError,
    loadCategories,
    saveCategory,
    deleteCategory,
    toggleCategoryVisibility,
    duplicateCategory,
    reorderCategories,
    moveProductsToCategory,
    productCountByCategory,
  }
}
