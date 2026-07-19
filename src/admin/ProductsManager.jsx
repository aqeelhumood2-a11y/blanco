import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useProducts } from './hooks/useProducts.js'
import {
  availabilityOptions,
  badgeOptions,
  convertGoogleDriveLink,
  nextOrderValue,
} from './utils/adminUtils.js'
import ProductForm from './components/ProductForm.jsx'

function rowKey(product) {
  return `${product.categoryId}-${product.id}`
}

function SortableProductRow({
  product,
  currency,
  hasImageError,
  dragEnabled,
  onImageError,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleVisibility,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowKey(product),
    disabled: !dragEnabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style}>
      <td
        className="adminDragHandleCell"
        aria-label="سحب لإعادة ترتيب المنتج"
        role="button"
        tabIndex={dragEnabled ? 0 : -1}
        {...(dragEnabled ? { ...attributes, ...listeners } : {})}
      >
        ⠿
      </td>

      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(product)}
          aria-label={`تحديد ${product.nameAr || product.nameEn}`}
        />
      </td>

      <td>
        {product.imageUrl && !hasImageError ? (
          <img
            className="adminProductImage"
            src={convertGoogleDriveLink(product.imageUrl)}
            alt={product.nameAr}
            loading="lazy"
            onError={onImageError}
          />
        ) : product.imageUrl && hasImageError ? (
          <span className="adminImageUnavailable">صورة غير متاحة</span>
        ) : (
          <span>بدون صورة</span>
        )}
      </td>

      <td>
        <strong>{product.nameAr}</strong>
        <small>{product.nameEn}</small>
        {product.status === 'draft' && <small className="adminDraftTag">مسودة</small>}
        {product.badges?.length > 0 && (
          <div className="adminRowBadges">
            {product.badges.map((badge) => (
              <span className="adminBadgeChipSmall" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        )}
      </td>

      <td>
        <strong>{product.categoryNameAr}</strong>
        <small>{product.categoryNameEn}</small>
      </td>

      <td>
        {product.price} {currency}
      </td>

      <td>
        <button
          type="button"
          className={product.visible === false ? 'productHiddenButton' : 'productVisibleButton'}
          onClick={() => onToggleVisibility(product)}
        >
          {product.visible === false ? 'مخفي' : 'ظاهر'}
        </button>
      </td>

      <td>
        <div className="adminProductActions">
          <button type="button" onClick={() => onEdit(product)}>
            تعديل
          </button>

          <button type="button" onClick={() => onDuplicate(product)}>
            نسخ
          </button>

          <button type="button" className="deleteProductButton" onClick={() => onDelete(product)}>
            حذف
          </button>
        </div>
      </td>
    </tr>
  )
}

function ProductsManager({ onBack, currency }) {
  const {
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
  } = useProducts()

  const [imageErrorIds, setImageErrorIds] = useState({})
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const [productNameEn, setProductNameEn] = useState('')
  const [productNameAr, setProductNameAr] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productCategory, setProductCategoryState] = useState('')
  const [productOrder, setProductOrder] = useState(1)
  const [productVisible, setProductVisible] = useState(true)
  const [productImageUrl, setProductImageUrl] = useState('')
  const [imgLoadError, setImgLoadError] = useState(false)
  const [status, setStatus] = useState('published')
  const [availability, setAvailability] = useState('available')
  const [badges, setBadges] = useState([])
  const [options, setOptions] = useState([])
  const [schedule, setSchedule] = useState({
    enabled: false,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
  })
  const [priceSchedule, setPriceSchedule] = useState([])

  const [savingProduct, setSavingProduct] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('')
  const [filterBadge, setFilterBadge] = useState('')
  const [productSuccessMessage, setProductSuccessMessage] = useState('')

  const [selectedKeys, setSelectedKeys] = useState([])
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('')
  const [bulkBadgeTarget, setBulkBadgeTarget] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const productFormRef = useRef(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Synchronous locks against duplicate submissions: React state guards
  // (savingProduct/bulkProcessing) are batched and can't be trusted to stop
  // two clicks that land in the same tick before a re-render disables the
  // button — a ref updates immediately, so it does.
  const savingProductLock = useRef(false)
  const bulkActionLock = useRef(false)

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (showProductForm && productFormRef.current) {
      productFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showProductForm])

  function resetProductForm() {
    const defaultCategoryId = categories[0]?.id || ''
    const siblingProducts = products.filter((p) => p.categoryId === defaultCategoryId)

    setEditingProduct(null)
    setProductNameEn('')
    setProductNameAr('')
    setProductPrice('')
    setProductCategoryState(defaultCategoryId)
    setProductOrder(nextOrderValue(siblingProducts))
    setProductVisible(true)
    setProductImageUrl('')
    setImgLoadError(false)
    setStatus('published')
    setAvailability('available')
    setBadges([])
    setOptions([])
    setSchedule({
      enabled: false,
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
    })
    setPriceSchedule([])
  }

  function handleProductCategoryChange(categoryId) {
    setProductCategoryState(categoryId)

    if (!editingProduct) {
      const siblingProducts = products.filter((p) => p.categoryId === categoryId)
      setProductOrder(nextOrderValue(siblingProducts))
    }
  }

  function openNewProduct() {
    resetProductForm()
    setShowProductForm(true)
    setError('')
    setProductSuccessMessage('')
  }

  function openEditProduct(product) {
    setEditingProduct(product)
    setProductNameEn(product.nameEn || '')
    setProductNameAr(product.nameAr || '')
    setProductPrice(product.price || '')
    setProductCategoryState(product.categoryId || '')
    setProductOrder(product.order || 1)
    setProductVisible(product.visible !== false)
    setProductImageUrl(product.imageUrl || '')
    setImgLoadError(false)
    setStatus(product.status || 'published')
    setAvailability(product.availability || 'available')
    setBadges(product.badges || [])
    setOptions(product.options || [])
    setSchedule(
      product.schedule || {
        enabled: false,
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        daysOfWeek: [],
      },
    )
    setPriceSchedule(product.priceSchedule || [])
    setShowProductForm(true)
    setError('')
    setProductSuccessMessage('')
  }

  async function handleSaveProduct(event) {
    event.preventDefault()
    if (savingProductLock.current) return
    savingProductLock.current = true

    setSavingProduct(true)
    setError('')
    setProductSuccessMessage('')

    try {
      const isNewProduct = await saveProduct({
        editingProduct,
        productNameEn,
        productNameAr,
        productPrice,
        productCategory,
        productOrder,
        productVisible,
        productImageUrl,
        status,
        availability,
        badges,
        options,
        schedule,
        priceSchedule,
      })

      if (editingProduct) {
        // Clear any stale broken-image flag so a corrected image URL is retried
        // instead of continuing to show "unavailable" from the previous value.
        setImageErrorIds((prev) => {
          const next = { ...prev }
          delete next[rowKey(editingProduct)]
          return next
        })
      }

      setShowProductForm(false)
      resetProductForm()

      setProductSuccessMessage(isNewProduct ? 'تمت إضافة المنتج بنجاح' : 'تم تحديث المنتج بنجاح')
    } catch (saveError) {
      console.error(saveError)
      setError(saveError.message || 'صار خطأ أثناء حفظ المنتج')
    } finally {
      savingProductLock.current = false
      setSavingProduct(false)
    }
  }

  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(`هل أنت متأكد من حذف ${product.nameAr || product.nameEn}؟`)
    if (!confirmed) return

    setError('')
    setProductSuccessMessage('')

    try {
      await deleteProduct(product)
      setImageErrorIds((prev) => {
        const next = { ...prev }
        delete next[rowKey(product)]
        return next
      })
      setProductSuccessMessage('تم حذف المنتج بنجاح')
    } catch (deleteError) {
      console.error(deleteError)
      setError('تعذر حذف المنتج')
    }
  }

  async function handleToggleVisibility(product) {
    setError('')
    setProductSuccessMessage('')

    try {
      await toggleProductVisibility(product)
      setProductSuccessMessage('تم تغيير حالة ظهور المنتج')
    } catch (visibilityError) {
      console.error(visibilityError)
      setError('تعذر تغيير حالة المنتج')
    }
  }

  async function handleDuplicateProduct(product) {
    setError('')
    setProductSuccessMessage('')

    try {
      await duplicateProduct(product)
      setProductSuccessMessage('تم نسخ المنتج كمسودة')
    } catch (duplicateError) {
      console.error(duplicateError)
      setError('تعذر نسخ المنتج')
    }
  }

  const filteredProducts = useMemo(() => {
    const word = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        !word ||
        product.nameEn?.toLowerCase().includes(word) ||
        product.nameAr?.includes(search.trim()) ||
        product.categoryNameEn?.toLowerCase().includes(word) ||
        product.categoryNameAr?.includes(search.trim())

      const matchesCategory = !filterCategory || product.categoryId === filterCategory
      const matchesAvailability = !filterAvailability || product.availability === filterAvailability
      const matchesBadge = !filterBadge || (product.badges || []).includes(filterBadge)

      return matchesSearch && matchesCategory && matchesAvailability && matchesBadge
    })
  }, [products, search, filterCategory, filterAvailability, filterBadge])

  // Prune any selected keys that fall outside the currently filtered
  // results — fixes stale selections carrying over across filters/reloads.
  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((key) => filteredProducts.some((p) => rowKey(p) === key)))
  }, [filteredProducts])

  const selectedProducts = products.filter((p) => selectedKeys.includes(rowKey(p)))

  function toggleSelect(product) {
    const key = rowKey(product)
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function toggleSelectAll() {
    const allSelected =
      filteredProducts.length > 0 && filteredProducts.every((p) => selectedKeys.includes(rowKey(p)))

    setSelectedKeys(allSelected ? [] : filteredProducts.map(rowKey))
  }

  async function handleBulkDelete() {
    if (selectedProducts.length === 0 || bulkActionLock.current) return
    const confirmed = window.confirm(`حذف ${selectedProducts.length} منتج نهائيًا؟`)
    if (!confirmed) return
    bulkActionLock.current = true

    setError('')
    setProductSuccessMessage('')
    setBulkProcessing(true)

    try {
      await bulkDeleteProducts(selectedProducts)
      setSelectedKeys([])
      setProductSuccessMessage('تم حذف المنتجات المحددة')
    } catch (bulkError) {
      console.error(bulkError)
      setError('تعذر حذف المنتجات المحددة')
    } finally {
      bulkActionLock.current = false
      setBulkProcessing(false)
    }
  }

  async function handleBulkVisibility(visible) {
    if (selectedProducts.length === 0 || bulkActionLock.current) return
    bulkActionLock.current = true

    setError('')
    setProductSuccessMessage('')
    setBulkProcessing(true)

    try {
      await bulkUpdateVisibility(selectedProducts, visible)
      setSelectedKeys([])
      setProductSuccessMessage('تم تحديث حالة الظهور للمنتجات المحددة')
    } catch (bulkError) {
      console.error(bulkError)
      setError('تعذر تحديث المنتجات المحددة')
    } finally {
      bulkActionLock.current = false
      setBulkProcessing(false)
    }
  }

  async function handleBulkCategoryChange() {
    if (!bulkCategoryTarget || selectedProducts.length === 0 || bulkActionLock.current) return
    bulkActionLock.current = true

    setError('')
    setProductSuccessMessage('')
    setBulkProcessing(true)

    try {
      await bulkUpdateCategory(selectedProducts, bulkCategoryTarget)
      setSelectedKeys([])
      setBulkCategoryTarget('')
      setProductSuccessMessage('تم نقل المنتجات المحددة إلى القسم الجديد')
    } catch (bulkError) {
      console.error(bulkError)
      setError(bulkError.message || 'تعذر نقل المنتجات المحددة')
    } finally {
      bulkActionLock.current = false
      setBulkProcessing(false)
    }
  }

  async function handleBulkBadgeChange() {
    if (!bulkBadgeTarget || selectedProducts.length === 0 || bulkActionLock.current) return
    bulkActionLock.current = true

    setError('')
    setProductSuccessMessage('')
    setBulkProcessing(true)

    try {
      await bulkUpdateBadges(selectedProducts, [bulkBadgeTarget])
      setSelectedKeys([])
      setBulkBadgeTarget('')
      setProductSuccessMessage('تمت إضافة الشارة للمنتجات المحددة')
    } catch (bulkError) {
      console.error(bulkError)
      setError('تعذر تحديث الشارات')
    } finally {
      bulkActionLock.current = false
      setBulkProcessing(false)
    }
  }

  const dragEnabled = Boolean(filterCategory)

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    if (!dragEnabled) {
      setError('اختر قسمًا واحدًا من الفلتر لتفعيل السحب وإعادة الترتيب')
      return
    }

    const currentList = filteredProducts
    const oldIndex = currentList.findIndex((p) => rowKey(p) === active.id)
    const newIndex = currentList.findIndex((p) => rowKey(p) === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(currentList, oldIndex, newIndex)
    const categoryId = reordered[0].categoryId
    const sameCategory = reordered.every((p) => p.categoryId === categoryId)

    if (!sameCategory) return

    await reorderProductsInCategory(categoryId, reordered.map((p) => p.id))
  }

  const previewImageUrl = convertGoogleDriveLink(productImageUrl.trim())

  return (
    <section className="adminProductsSection">
      <div className="adminProductsHeader">
        <div>
          <h2>إدارة المنتجات</h2>
          <p>إضافة وتعديل وحذف المنتجات، اسحب لإعادة الترتيب داخل نفس القسم.</p>
        </div>

        <div className="adminProductsHeaderButtons">
          <button type="button" onClick={openNewProduct}>
            + إضافة منتج
          </button>

          <button type="button" onClick={onBack}>
            الرجوع للوحة الرئيسية
          </button>
        </div>
      </div>

      {error && <div className="adminDashboardError">{error}</div>}
      {productSuccessMessage && <p className="uploadSuccess">{productSuccessMessage}</p>}

      <div className="adminFiltersRow">
        <label htmlFor="productSearchInput" className="srOnlyLabel">
          ابحث عن منتج
        </label>
        <input
          id="productSearchInput"
          className="adminProductSearch"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث عن منتج..."
        />

        <label htmlFor="filterCategorySelect" className="srOnlyLabel">
          فلترة حسب القسم
        </label>
        <select
          id="filterCategorySelect"
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
        >
          <option value="">كل الأقسام</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameAr}
            </option>
          ))}
        </select>

        <label htmlFor="filterAvailabilitySelect" className="srOnlyLabel">
          فلترة حسب التوفر
        </label>
        <select
          id="filterAvailabilitySelect"
          value={filterAvailability}
          onChange={(event) => setFilterAvailability(event.target.value)}
        >
          <option value="">كل حالات التوفر</option>
          {availabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label htmlFor="filterBadgeSelect" className="srOnlyLabel">
          فلترة حسب الشارة
        </label>
        <select
          id="filterBadgeSelect"
          value={filterBadge}
          onChange={(event) => setFilterBadge(event.target.value)}
        >
          <option value="">كل الشارات</option>
          {badgeOptions.map((badge) => (
            <option key={badge} value={badge}>
              {badge}
            </option>
          ))}
        </select>
      </div>

      {!dragEnabled && (
        <p className="adminHintText">اختر قسمًا محددًا من الفلتر لتفعيل السحب وإعادة الترتيب.</p>
      )}

      {selectedKeys.length > 0 && (
        <div className="adminBulkToolbar">
          <span>{selectedKeys.length} منتج محدد</span>

          <button type="button" onClick={() => handleBulkVisibility(true)} disabled={bulkProcessing}>
            إظهار
          </button>
          <button type="button" onClick={() => handleBulkVisibility(false)} disabled={bulkProcessing}>
            إخفاء
          </button>
          <button
            type="button"
            className="deleteProductButton"
            onClick={handleBulkDelete}
            disabled={bulkProcessing}
          >
            حذف
          </button>

          <label htmlFor="bulkCategorySelect" className="srOnlyLabel">
            نقل إلى قسم
          </label>
          <select
            id="bulkCategorySelect"
            value={bulkCategoryTarget}
            onChange={(event) => setBulkCategoryTarget(event.target.value)}
            disabled={bulkProcessing}
          >
            <option value="">نقل إلى قسم...</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameAr}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkCategoryChange}
            disabled={!bulkCategoryTarget || bulkProcessing}
          >
            تطبيق النقل
          </button>

          <label htmlFor="bulkBadgeSelect" className="srOnlyLabel">
            إضافة شارة
          </label>
          <select
            id="bulkBadgeSelect"
            value={bulkBadgeTarget}
            onChange={(event) => setBulkBadgeTarget(event.target.value)}
            disabled={bulkProcessing}
          >
            <option value="">إضافة شارة...</option>
            {badgeOptions.map((badge) => (
              <option key={badge} value={badge}>
                {badge}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkBadgeChange}
            disabled={!bulkBadgeTarget || bulkProcessing}
          >
            تطبيق الشارة
          </button>

          <button type="button" onClick={() => setSelectedKeys([])} disabled={bulkProcessing}>
            إلغاء التحديد
          </button>
        </div>
      )}

      {showProductForm && (
        <ProductForm
          formRef={productFormRef}
          editingProduct={editingProduct}
          productNameEn={productNameEn}
          setProductNameEn={setProductNameEn}
          productNameAr={productNameAr}
          setProductNameAr={setProductNameAr}
          productPrice={productPrice}
          setProductPrice={setProductPrice}
          productCategory={productCategory}
          setProductCategory={handleProductCategoryChange}
          productOrder={productOrder}
          setProductOrder={setProductOrder}
          productVisible={productVisible}
          setProductVisible={setProductVisible}
          productImageUrl={productImageUrl}
          setProductImageUrl={setProductImageUrl}
          imgLoadError={imgLoadError}
          setImgLoadError={setImgLoadError}
          previewImageUrl={previewImageUrl}
          categories={categories}
          savingProduct={savingProduct}
          status={status}
          setStatus={setStatus}
          availability={availability}
          setAvailability={setAvailability}
          badges={badges}
          setBadges={setBadges}
          options={options}
          setOptions={setOptions}
          schedule={schedule}
          setSchedule={setSchedule}
          priceSchedule={priceSchedule}
          setPriceSchedule={setPriceSchedule}
          onSubmit={handleSaveProduct}
          onCancel={() => {
            setShowProductForm(false)
            resetProductForm()
          }}
        />
      )}

      {loadingProducts ? (
        <p>جاري تحميل المنتجات...</p>
      ) : (
        <div className="adminProductsTableWrapper">
          {filteredProducts.length === 0 ? (
            <p>لا توجد منتجات مطابقة</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="adminProductsTable">
                <thead>
                  <tr>
                    <th></th>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          filteredProducts.length > 0 &&
                          filteredProducts.every((p) => selectedKeys.includes(rowKey(p)))
                        }
                        onChange={toggleSelectAll}
                        aria-label="تحديد كل المنتجات الظاهرة"
                      />
                    </th>
                    <th>الصورة</th>
                    <th>المنتج</th>
                    <th>القسم</th>
                    <th>السعر</th>
                    <th>الحالة</th>
                    <th>التحكم</th>
                  </tr>
                </thead>

                <tbody>
                  <SortableContext items={filteredProducts.map(rowKey)} strategy={verticalListSortingStrategy}>
                    {filteredProducts.map((product) => {
                      const key = rowKey(product)
                      return (
                        <SortableProductRow
                          key={key}
                          product={product}
                          currency={currency}
                          hasImageError={imageErrorIds[key]}
                          dragEnabled={dragEnabled}
                          onImageError={() =>
                            setImageErrorIds((prev) => ({ ...prev, [key]: true }))
                          }
                          isSelected={selectedKeys.includes(key)}
                          onToggleSelect={toggleSelect}
                          onEdit={openEditProduct}
                          onDuplicate={handleDuplicateProduct}
                          onDelete={handleDeleteProduct}
                          onToggleVisibility={handleToggleVisibility}
                        />
                      )
                    })}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          )}
        </div>
      )}
    </section>
  )
}

export default ProductsManager