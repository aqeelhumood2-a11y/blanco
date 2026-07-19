function CategoryForm({
  formRef,
  editingCategory,
  categoryNameEn,
  setCategoryNameEn,
  categoryNameAr,
  setCategoryNameAr,
  categoryOrder,
  setCategoryOrder,
  categoryVisible,
  setCategoryVisible,
  categoryIcon,
  setCategoryIcon,
  categoryColor,
  setCategoryColor,
  savingCategory,
  onSubmit,
  onCancel,
}) {
  return (
    <form className="adminCategoryForm" onSubmit={onSubmit} ref={formRef}>
      <fieldset disabled={savingCategory} className="adminFormFieldset">
        <h3>{editingCategory ? 'تعديل القسم' : 'إضافة قسم جديد'}</h3>

        <div className="adminCategoryFormGrid">
          <label>
            الاسم بالإنجليزي
            <input
              type="text"
              value={categoryNameEn}
              onChange={(event) => setCategoryNameEn(event.target.value)}
              required
            />
          </label>

          <label>
            الاسم بالعربي
            <input
              type="text"
              value={categoryNameAr}
              onChange={(event) => setCategoryNameAr(event.target.value)}
              required
            />
          </label>

          <label>
            أيقونة القسم (رمز تعبيري)
            <input
              type="text"
              value={categoryIcon}
              onChange={(event) => setCategoryIcon(event.target.value)}
              placeholder="☕"
            />
          </label>

          <label>
            لون القسم
            <div className="adminColorInputRow">
              <input
                type="color"
                value={categoryColor || '#582369'}
                onChange={(event) => setCategoryColor(event.target.value)}
              />
              <span>{categoryColor || '#582369'}</span>
            </div>
          </label>

          <label>
            الترتيب
            <input
              type="number"
              min="1"
              step="1"
              value={categoryOrder}
              onChange={(event) => setCategoryOrder(event.target.value)}
            />
          </label>

          <label className="productVisibleLabel">
            <input
              type="checkbox"
              checked={categoryVisible}
              onChange={(event) => setCategoryVisible(event.target.checked)}
            />
            إظهار القسم في المنيو
          </label>
        </div>

        <div className="adminCategoryFormButtons">
          <button type="submit" disabled={savingCategory}>
            {savingCategory ? 'جاري الحفظ...' : 'حفظ القسم'}
          </button>

          <button
            type="button"
            className="cancelCategoryButton"
            disabled={savingCategory}
            onClick={onCancel}
          >
            إلغاء
          </button>
        </div>
      </fieldset>
    </form>
  )
}

export default CategoryForm