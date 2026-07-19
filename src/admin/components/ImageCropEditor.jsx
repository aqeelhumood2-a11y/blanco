import { useRef } from 'react'
import {
  IMAGE_SCALE_MAX,
  IMAGE_SCALE_MIN,
  clampImageOffset,
  normalizeImageCrop,
} from '../utils/adminUtils.js'

const FRAME_SIZES = {
  square: { width: 200, height: 200 },
  wide: { width: 280, height: 120 },
  standard: { width: 260, height: 146 },
  tall: { width: 200, height: 266 },
}

// A real manual crop editor: drag the image inside a visible bounded frame
// to reposition it, zoom with the slider, optionally switch fit mode. Every
// caller owns its own `value` ({scale, offsetX, offsetY}) — nothing here is
// shared/global, so each image (logo, hero, a specific product, a specific
// category) keeps an independent crop.
function ImageCropEditor({
  imageUrl,
  value,
  onChange,
  onReset,
  shape = 'square',
  fit = 'cover',
  onFitChange,
  onImageError,
  emptyLabel = 'لا توجد صورة',
}) {
  const crop = normalizeImageCrop(value)
  const frameRef = useRef(null)
  const dragState = useRef(null)

  const frameSize = FRAME_SIZES[shape] || FRAME_SIZES.square

  function updateCrop(patch) {
    onChange({ ...crop, ...patch })
  }

  function handlePointerDown(event) {
    if (!imageUrl) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: crop.offsetX,
      startOffsetY: crop.offsetY,
    }
  }

  function handlePointerMove(event) {
    if (!dragState.current || !frameRef.current) return

    const rect = frameRef.current.getBoundingClientRect()
    const dxPercent = ((event.clientX - dragState.current.startX) / rect.width) * 100
    const dyPercent = ((event.clientY - dragState.current.startY) / rect.height) * 100

    // Dragging right/down should pan the image right/down (follow the
    // cursor), which means the visible crop window moves left/up —
    // i.e. object-position decreases.
    updateCrop({
      offsetX: clampImageOffset(dragState.current.startOffsetX - dxPercent),
      offsetY: clampImageOffset(dragState.current.startOffsetY - dyPercent),
    })
  }

  function handlePointerUp(event) {
    if (dragState.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragState.current = null
  }

  return (
    <div className="adminImageCropEditor">
      <div
        className="adminCropFrame"
        ref={frameRef}
        style={{ width: frameSize.width, height: frameSize.height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imageUrl ? (
          <img
            className="adminCropFrameImage"
            src={imageUrl}
            alt=""
            draggable={false}
            style={{
              objectFit: fit,
              objectPosition: `${crop.offsetX}% ${crop.offsetY}%`,
              transform: `scale(${crop.scale})`,
            }}
            onError={onImageError}
          />
        ) : (
          <div className="adminCropFrameEmpty">{emptyLabel}</div>
        )}
        {imageUrl && <div className="adminCropFrameHint">اسحب للتحريك</div>}
      </div>

      {imageUrl && (
        <div className="adminCropControls">
          {onFitChange && (
            <label>
              طريقة العرض
              <select value={fit} onChange={(event) => onFitChange(event.target.value)}>
                <option value="contain">احتواء كامل (بدون قص)</option>
                <option value="cover">تعبئة الإطار (قص عند الحاجة)</option>
              </select>
            </label>
          )}

          <label>
            التكبير: {crop.scale.toFixed(2)}×
            <input
              type="range"
              min={IMAGE_SCALE_MIN}
              max={IMAGE_SCALE_MAX}
              step="0.05"
              value={crop.scale}
              onChange={(event) => updateCrop({ scale: Number(event.target.value) })}
            />
          </label>

          <label>
            الموضع الأفقي: {crop.offsetX}%
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={crop.offsetX}
              onChange={(event) => updateCrop({ offsetX: Number(event.target.value) })}
            />
          </label>

          <label>
            الموضع الرأسي: {crop.offsetY}%
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={crop.offsetY}
              onChange={(event) => updateCrop({ offsetY: Number(event.target.value) })}
            />
          </label>

          <button type="button" className="adminResetImageButton" onClick={onReset}>
            إعادة ضبط الصورة
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageCropEditor
