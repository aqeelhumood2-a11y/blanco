import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCategories } from './hooks/useCategories.js'
import { nextOrderValue, pickNextCategoryColor } from './utils/adminUtils.js'
import CategoryForm from './components/CategoryForm.jsx'

function SortableCategoryCard({
  category,
  count,
  dragEnabled,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: !dragEnabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    borderInlineStart: `4px solid ${category.color || '#582369'}`,
  }

  return (
    <article className="adminCategoryCard" style={style} ref={setNodeRef}>
      <div
        className="adminCategoryDragHandle"
        aria-label="سحب لإعادة ترتيب القسم"
        role="button"
        tabIndex={dragEnabled ? 0 : -1}
        {...(dragEnabled ? { ...attributes, ...listeners } : {})}
      >
        ⠿
      </div>

      <div>
        <h3>
          {category.icon ? `${category.icon} ` : ''}
          {category.nameEn}
        </h3>
        <p>{category.nameAr}</p>
        <small>
          الترتيب: {category.order || 1} · عدد المنتجات: {count}
        </small>
      </div>

      <div className="adminCategoryActions">
        <button
          type="button"
          className={category.visible === false ? 'productHiddenButton' : 'productVisibleButton'}
          onClick={() => onToggle(category)}
        >
          {category.visible === false ? 'مخفي' : 'ظاهر'}
        </button>

        <button type="button" onClick={() => onEdit(category)}>
          تعديل
        </button>

        <button type="button" onClick={() => onDuplicate(category)}>
          نسخ
        </button>

        {count > 0 && (
          <button type="button" onClick={() => onMove(category)}>
            نقل المنتجات
          </button>
        )}

        <button type="button" className="deleteCategoryButton" onClick={() => onDelete(category)}>
          حذف
        </button>
      </div>
    </article>
  )
}

function CategoriesManager({ onBack }) {
  const {
    categories,
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
  } = useCategories()

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [categoryNameEn, setCategoryNameEn] = useState('')
  const [categoryNameAr, setCategoryNameAr] = useState('')
  const [categoryOrder, setCategoryOrder] = useState(1)
  const [categoryVisible, setCategoryVisible] = useState(true)
  const [categoryIcon, setCategoryIcon] = useState('')
  const [categoryColor, setCategoryColor] = useState('#582369')
  const [savingCategory, setSavingCategory] = useState(false)
  const [categorySuccessMessage, setCategorySuccessMessage] = useState('')

  const [moveSourceCategory, setMoveSourceCategory] = useState(null)
  const [moveTargetId, setMoveTargetId] = useState('')
  const [movingProducts, setMovingProducts] = useState(false)

  const categoryFormRef = useRef(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // See ProductsManager for why this needs to be a ref, not just savingCategory state.
  const savingCategoryLock = useRef(false)
  const movingProductsLock = useRef(false)

  const dragEnabled = categories.length > 1

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (showCategoryForm && categoryFormRef.current) {
      categoryFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showCategoryForm])

  function resetCategoryForm() {
    setEditingCategory(null)
    setCategoryNameEn('')
    setCategoryNameAr('')
    setCategoryOrder(nextOrderValue(categories))
    setCategoryVisible(true)
    setCategoryIcon('')
    setCategoryColor(pickNextCategoryColor(categories))
  }

  function openNewCategory() {
    resetCategoryForm()
    setShowCategoryForm(true)
    setError('')
    setCategorySuccessMessage('')
  }

  function openEditCategory(category) {
    setEditingCategory(category)
    setCategoryNameEn(category.nameEn || '')
    setCategoryNameAr(category.nameAr || '')
    setCategoryOrder(category.order || 1)
    setCategoryVisible(category.visible !== false)
    setCategoryIcon(category.icon || '')
    setCategoryColor(category.color || pickNextCategoryColor(categories))
    setShowCategoryForm(true)
    setError('')
    setCategorySuccessMessage('')
  }

  async function handleSaveCategory(event) {
    event.preventDefault()
    if (savingCategoryLock.current) return
    savingCategoryLock.current = true

    setSavingCategory(true)
    setError('')
    setCategorySuccessMessage('')

    try {
      const isNewCategory = await saveCategory({
        editingCategory,
        categoryNameEn,
        categoryNameAr,
        categoryOrder,
        categoryVisible,
        categoryIcon,
        categoryColor,
      })

      setShowCategoryForm(false)
      resetCategoryForm()

      setCategorySuccessMessage(isNewCategory ? 'تمت إضافة القسم بنجاح' : 'تم تحديث القسم بنجاح')
    } catch (saveError) {
      console.error(saveError)
      setError(saveError.message || 'صار خطأ أثناء حفظ القسم')
    } finally {
      savingCategoryLock.current = false
      setSavingCategory(false)
    }
  }

  async function handleDeleteCategory(category) {
    const quickCount = productCountByCategory[category.id] || 0

    if (quickCount > 0) {
      setError('لا يمكن حذف القسم لوجود منتجات بداخله، انقل المنتجات أولًا')
      setCategorySuccessMessage('')
      return
    }

    const confirmed = window.confirm(`هل أنت متأكد من حذف قسم ${category.nameAr}؟`)
    if (!confirmed) return

    setError('')
    setCategorySuccessMessage('')

    try {
      await deleteCategory(category)
      setCategorySuccessMessage('تم حذف القسم بنجاح')
    } catch (deleteError) {
      console.error(deleteError)
      setError(deleteError.message || 'تعذر حذف القسم')
    }
  }

  async function handleToggleVisibility(category) {
    setError('')
    setCategorySuccessMessage('')

    try {
      await toggleCategoryVisibility(category)
      setCategorySuccessMessage('تم تغيير حالة ظهور القسم')
    } catch (visibilityError) {
      console.error(visibilityError)
      setError('تعذر تغيير حالة القسم')
    }
  }

  async function handleDuplicateCategory(category) {
    setError('')
    setCategorySuccessMessage('')

    try {
      await duplicateCategory(category)
      setCategorySuccessMessage('تم نسخ القسم بنجاح')
    } catch (duplicateError) {
      console.error(duplicateError)
      setError(duplicateError.message || 'تعذر نسخ القسم')
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (!dragEnabled) return

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(categories, oldIndex, newIndex)
    await reorderCategories(reordered.map((c) => c.id))
  }

  async function handleConfirmMove() {
    if (!moveTargetId || !moveSourceCategory || movingProductsLock.current) return
    movingProductsLock.current = true

    setError('')
    setMovingProducts(true)

    try {
      await moveProductsToCategory(moveSourceCategory.id, moveTargetId)
      setCategorySuccessMessage('تم نقل المنتجات بنجاح')
      setMoveSourceCategory(null)
      setMoveTargetId('')
    } catch (moveError) {
      console.error(moveError)
      setError(moveError.message || 'تعذر نقل المنتجات')
    } finally {
      movingProductsLock.current = false
      setMovingProducts(false)
    }
  }

  return (
    <section className="adminCategoriesSection">
      <div className="adminCategoriesHeader">
        <div>
          <h2>إدارة الأقسام</h2>
          <p>إضافة وتعديل وحذف الأقسام، اسحب لإعادة الترتيب.</p>
        </div>

        <div className="adminProductsHeaderButtons">
          <button type="button" onClick={openNewCategory}>
            + إضافة قسم
          </button>

          <button type="button" onClick={onBack}>
            الرجوع للوحة الرئيسية
          </button>
        </div>
      </div>

      {error && <div className="adminDashboardError">{error}</div>}
      {categorySuccessMessage && <p className="uploadSuccess">{categorySuccessMessage}</p>}

      {showCategoryForm && (
        <CategoryForm
          formRef={categoryFormRef}
          editingCategory={editingCategory}
          categoryNameEn={categoryNameEn}
          setCategoryNameEn={setCategoryNameEn}
          categoryNameAr={categoryNameAr}
          setCategoryNameAr={setCategoryNameAr}
          categoryOrder={categoryOrder}
          setCategoryOrder={setCategoryOrder}
          categoryVisible={categoryVisible}
          setCategoryVisible={setCategoryVisible}
          categoryIcon={categoryIcon}
          setCategoryIcon={setCategoryIcon}
          categoryColor={categoryColor}
          setCategoryColor={setCategoryColor}
          savingCategory={savingCategory}
          onSubmit={handleSaveCategory}
          onCancel={() => {
            setShowCategoryForm(false)
            resetCategoryForm()
          }}
        />
      )}

      {moveSourceCategory && (
        <div className="adminMoveProductsPanel">
          <p>
            نقل جميع منتجات <strong>{moveSourceCategory.nameAr}</strong> إلى:
          </p>

          <label htmlFor="moveTargetCategorySelect" className="srOnlyLabel">
            القسم الهدف
          </label>

          <select
            id="moveTargetCategorySelect"
            value={moveTargetId}
            onChange={(event) => setMoveTargetId(event.target.value)}
            disabled={movingProducts}
          >
            <option value="">اختر القسم الهدف</option>
            {categories
              .filter((c) => c.id !== moveSourceCategory.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr} - {c.nameEn}
                </option>
              ))}
          </select>

          <button type="button" onClick={handleConfirmMove} disabled={!moveTargetId || movingProducts}>
            {movingProducts ? 'جاري النقل...' : 'تأكيد النقل'}
          </button>

          <button
            type="button"
            className="cancelCategoryButton"
            disabled={movingProducts}
            onClick={() => {
              setMoveSourceCategory(null)
              setMoveTargetId('')
            }}
          >
            إلغاء
          </button>
        </div>
      )}

      <div className="adminCategoriesList">
        {loadingProducts ? (
          <p>جاري تحميل الأقسام...</p>
        ) : categories.length === 0 ? (
          <p>لا توجد أقسام حتى الآن</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {categories.map((category) => (
                <SortableCategoryCard
                  key={category.id}
                  category={category}
                  count={productCountByCategory[category.id] || 0}
                  dragEnabled={dragEnabled}
                  onToggle={handleToggleVisibility}
                  onEdit={openEditCategory}
                  onDelete={handleDeleteCategory}
                  onDuplicate={handleDuplicateCategory}
                  onMove={setMoveSourceCategory}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  )
}

export default CategoriesManager