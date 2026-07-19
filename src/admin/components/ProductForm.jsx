import {
  availabilityOptions,
  badgeOptions,
  daysOfWeekOptions,
  generateOptionId,
  optionTypeOptions,
  statusOptions,
  validateImageLink,
} from '../utils/adminUtils.js'

function ProductForm({
  formRef,
  editingProduct,
  productNameEn,
  setProductNameEn,
  productNameAr,
  setProductNameAr,
  productPrice,
  setProductPrice,
  productCategory,
  setProductCategory,
  productOrder,
  setProductOrder,
  productVisible,
  setProductVisible,
  productImageUrl,
  setProductImageUrl,
  imgLoadError,
  setImgLoadError,
  previewImageUrl,
  categories,
  savingProduct,
  status,
  setStatus,
  availability,
  setAvailability,
  badges,
  setBadges,
  options,
  setOptions,
  schedule,
  setSchedule,
  priceSchedule,
  setPriceSchedule,
  onSubmit,
  onCancel,
}) {
  const imageValidation = validateImageLink(productImageUrl)
  const hasImage = Boolean(previewImageUrl)

  function toggleBadge(badge) {
    setBadges((prev) => (prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]))
  }

  function addOptionGroup() {
    setOptions((prev) => [
      ...prev,
      { id: generateOptionId(), name: '', type: 'single', choices: [] },
    ])
  }

  function updateOptionGroup(id, patch) {
    setOptions((prev) => prev.map((group) => (group.id === id ? { ...group, ...patch } : group)))
  }

  function removeOptionGroup(id) {
    setOptions((prev) => prev.filter((group) => group.id !== id))
  }

  function addChoice(groupId) {
    setOptions((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              choices: [
                ...(group.choices || []),
                { id: generateOptionId(), label: '', priceModifier: 0 },
              ],
            }
          : group,
      ),
    )
  }

  function updateChoice(groupId, choiceId, patch) {
    setOptions((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              choices: (group.choices || []).map((choice) =>
                choice.id === choiceId ? { ...choice, ...patch } : choice,
              ),
            }
          : group,
      ),
    )
  }

  function removeChoice(groupId, choiceId) {
    setOptions((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, choices: (group.choices || []).filter((c) => c.id !== choiceId) }
          : group,
      ),
    )
  }

  function toggleScheduleDay(day) {
    setSchedule((prev) => {
      const current = prev?.daysOfWeek || []
      const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
      return { ...(prev || {}), daysOfWeek: next }
    })
  }

  function addPriceRule() {
    setPriceSchedule((prev) => [
      ...prev,
      {
        id: generateOptionId(),
        label: '',
        price: productPrice,
        startDate: '',
        endDate: '',
        daysOfWeek: [],
        startTime: '',
        endTime: '',
        priority: prev.length,
      },
    ])
  }

  function updatePriceRule(id, patch) {
    setPriceSchedule((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
  }

  function removePriceRule(id) {
    setPriceSchedule((prev) => prev.filter((rule) => rule.id !== id))
  }

  return (
    <form className="adminProductForm" onSubmit={onSubmit} ref={formRef}>
      <fieldset disabled={savingProduct} className="adminFormFieldset">
        <h3>{editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>

        <div className="adminProductFormGrid">
          <label>
            الاسم بالإنجليزي
            <input
              type="text"
              value={productNameEn}
              onChange={(event) => setProductNameEn(event.target.value)}
              required
            />
          </label>

          <label>
            الاسم بالعربي
            <input
              type="text"
              value={productNameAr}
              onChange={(event) => setProductNameAr(event.target.value)}
              required
            />
          </label>

          <label>
            السعر الأساسي
            <input
              type="text"
              inputMode="decimal"
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              placeholder="1.500"
              required
            />
          </label>

          <label>
            القسم
            <select
              value={productCategory}
              onChange={(event) => setProductCategory(event.target.value)}
              required
            >
              <option value="">اختر القسم</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameAr} - {category.nameEn}
                </option>
              ))}
            </select>
            {categories.length === 0 && <small>لا توجد أقسام، أضف قسمًا أولًا</small>}
          </label>

          <label>
            الترتيب
            <input
              type="number"
              min="1"
              step="1"
              value={productOrder}
              onChange={(event) => setProductOrder(event.target.value)}
            />
          </label>

          <label>
            حالة التوفر
            <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
              {availabilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            حالة النشر
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="productVisibleLabel">
            <input
              type="checkbox"
              checked={productVisible}
              onChange={(event) => setProductVisible(event.target.checked)}
            />
            إظهار المنتج في المنيو
          </label>
        </div>

        <label className="adminImageUrlLabel">
          رابط صورة المنتج
          <input
            type="text"
            value={productImageUrl}
            onChange={(event) => {
              setProductImageUrl(event.target.value)
              setImgLoadError(false)
            }}
            placeholder="https://... أو رابط Google Drive"
          />
        </label>

        {!imageValidation.valid && <p className="adminError">{imageValidation.message}</p>}

        <div className="adminImagePreview">
          {hasImage && !imgLoadError ? (
            <img
              className="adminCurrentProductImage"
              src={previewImageUrl}
              alt="معاينة الصورة"
              loading="lazy"
              onError={() => setImgLoadError(true)}
            />
          ) : hasImage && imgLoadError ? (
            <div className="adminImagePlaceholder">تعذر تحميل الصورة</div>
          ) : (
            <div className="adminImagePlaceholder">لا توجد صورة</div>
          )}

          {productImageUrl.trim() && (
            <button
              type="button"
              className="clearImageButton"
              onClick={() => {
                setProductImageUrl('')
                setImgLoadError(false)
              }}
            >
              إزالة الصورة
            </button>
          )}
        </div>

        <div className="adminBadgesSection">
          <h4>الشارات</h4>
          <div className="adminBadgeChips">
            {badgeOptions.map((badge) => (
              <button
                type="button"
                key={badge}
                className={badges.includes(badge) ? 'adminBadgeChipActive' : 'adminBadgeChip'}
                onClick={() => toggleBadge(badge)}
                aria-pressed={badges.includes(badge)}
              >
                {badge}
              </button>
            ))}
          </div>
        </div>

        <div className="adminOptionsSection">
          <div className="adminProductsHeader">
            <h4>خيارات المنتج (الحجم، الإضافات...)</h4>
            <button type="button" onClick={addOptionGroup}>
              + إضافة مجموعة خيارات
            </button>
          </div>

          {options.map((group) => (
            <div className="adminOptionGroup" key={group.id}>
              <div className="adminOptionGroupHeader">
                <input
                  type="text"
                  placeholder="اسم المجموعة (مثال: الحجم)"
                  value={group.name}
                  onChange={(event) => updateOptionGroup(group.id, { name: event.target.value })}
                  aria-label="اسم مجموعة الخيارات"
                />

                <select
                  value={group.type || 'single'}
                  onChange={(event) => updateOptionGroup(group.id, { type: event.target.value })}
                  aria-label="نوع الاختيار"
                >
                  {optionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="deleteProductButton"
                  onClick={() => removeOptionGroup(group.id)}
                >
                  حذف المجموعة
                </button>
              </div>

              {(group.choices || []).map((choice) => (
                <div className="adminOptionChoiceRow" key={choice.id}>
                  <input
                    type="text"
                    placeholder="اسم الاختيار (مثال: كبير)"
                    value={choice.label}
                    onChange={(event) =>
                      updateChoice(group.id, choice.id, { label: event.target.value })
                    }
                    aria-label="اسم الاختيار"
                  />

                  <input
                    type="number"
                    step="0.001"
                    placeholder="فرق السعر"
                    value={choice.priceModifier}
                    onChange={(event) =>
                      updateChoice(group.id, choice.id, {
                        priceModifier: Number(event.target.value) || 0,
                      })
                    }
                    aria-label="فرق السعر"
                  />

                  <button type="button" onClick={() => removeChoice(group.id, choice.id)}>
                    حذف
                  </button>
                </div>
              ))}

              <button type="button" onClick={() => addChoice(group.id)}>
                + إضافة اختيار
              </button>
            </div>
          ))}
        </div>

        <div className="adminScheduleSection">
          <label className="productVisibleLabel">
            <input
              type="checkbox"
              checked={schedule?.enabled || false}
              onChange={(event) =>
                setSchedule((prev) => ({ ...(prev || {}), enabled: event.target.checked }))
              }
            />
            تفعيل جدولة ظهور المنتج
          </label>

          {schedule?.enabled && (
            <div className="adminSiteSettingsGrid">
              <label>
                من تاريخ
                <input
                  type="date"
                  value={schedule.startDate || ''}
                  onChange={(event) =>
                    setSchedule((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </label>

              <label>
                إلى تاريخ
                <input
                  type="date"
                  value={schedule.endDate || ''}
                  onChange={(event) =>
                    setSchedule((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </label>

              <label>
                من الساعة
                <input
                  type="time"
                  value={schedule.startTime || ''}
                  onChange={(event) =>
                    setSchedule((prev) => ({ ...prev, startTime: event.target.value }))
                  }
                />
              </label>

              <label>
                إلى الساعة
                <input
                  type="time"
                  value={schedule.endTime || ''}
                  onChange={(event) =>
                    setSchedule((prev) => ({ ...prev, endTime: event.target.value }))
                  }
                />
              </label>

              <small>يمكن أن يمتد الوقت لما بعد منتصف الليل، مثال: 22:00 إلى 02:00</small>

              <div className="adminDaysOfWeekRow">
                {daysOfWeekOptions.map((day) => (
                  <button
                    type="button"
                    key={day.value}
                    className={
                      (schedule.daysOfWeek || []).includes(day.value)
                        ? 'adminBadgeChipActive'
                        : 'adminBadgeChip'
                    }
                    onClick={() => toggleScheduleDay(day.value)}
                    aria-pressed={(schedule.daysOfWeek || []).includes(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <small>ترك كل الأيام بدون تحديد يعني الظهور كل أيام الأسبوع</small>
            </div>
          )}
        </div>

        <div className="adminPriceScheduleSection">
          <div className="adminProductsHeader">
            <h4>جدولة الأسعار</h4>
            <button type="button" onClick={addPriceRule}>
              + إضافة سعر مجدول
            </button>
          </div>

          {priceSchedule.map((rule) => (
            <div className="adminOptionGroup" key={rule.id}>
              <div className="adminSiteSettingsGrid">
                <label>
                  الاسم
                  <input
                    type="text"
                    placeholder="مثال: عرض نهاية الأسبوع"
                    value={rule.label}
                    onChange={(event) => updatePriceRule(rule.id, { label: event.target.value })}
                  />
                </label>

                <label>
                  السعر
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rule.price}
                    onChange={(event) => updatePriceRule(rule.id, { price: event.target.value })}
                  />
                </label>

                <label>
                  من تاريخ
                  <input
                    type="date"
                    value={rule.startDate}
                    onChange={(event) => updatePriceRule(rule.id, { startDate: event.target.value })}
                  />
                </label>

                <label>
                  إلى تاريخ
                  <input
                    type="date"
                    value={rule.endDate}
                    onChange={(event) => updatePriceRule(rule.id, { endDate: event.target.value })}
                  />
                </label>

                <label>
                  من الساعة
                  <input
                    type="time"
                    value={rule.startTime}
                    onChange={(event) => updatePriceRule(rule.id, { startTime: event.target.value })}
                  />
                </label>

                <label>
                  إلى الساعة
                  <input
                    type="time"
                    value={rule.endTime}
                    onChange={(event) => updatePriceRule(rule.id, { endTime: event.target.value })}
                  />
                </label>
              </div>

              <div className="adminDaysOfWeekRow">
                {daysOfWeekOptions.map((day) => (
                  <button
                    type="button"
                    key={day.value}
                    className={
                      (rule.daysOfWeek || []).includes(day.value) ? 'adminBadgeChipActive' : 'adminBadgeChip'
                    }
                    onClick={() =>
                      updatePriceRule(rule.id, {
                        daysOfWeek: (rule.daysOfWeek || []).includes(day.value)
                          ? rule.daysOfWeek.filter((d) => d !== day.value)
                          : [...(rule.daysOfWeek || []), day.value],
                      })
                    }
                    aria-pressed={(rule.daysOfWeek || []).includes(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="deleteProductButton"
                onClick={() => removePriceRule(rule.id)}
              >
                حذف هذا السعر المجدول
              </button>
            </div>
          ))}
        </div>

        <div className="adminProductFormButtons">
          <button type="submit" disabled={savingProduct}>
            {savingProduct ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </button>

          <button
            type="button"
            className="cancelProductButton"
            disabled={savingProduct}
            onClick={onCancel}
          >
            إلغاء
          </button>
        </div>
      </fieldset>
    </form>
  )
}

export default ProductForm