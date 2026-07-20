import { writeBatch } from 'firebase/firestore'

export const defaultSiteSettings = {
  siteNameEn: 'BLANCO',
  siteNameAr: '',
  welcomeEn: "Welcome, we're glad you're here.",
  welcomeAr: 'أهلًا بك، سعداء بوجودك.',
  descriptionEn: 'Take a look at our menu and enjoy your favorite drink.',
  descriptionAr: 'تصفح قائمتنا واستمتع بمشروبك المفضل.',
  footerText: 'BLANCO',
  currency: '',
  showPrices: true,
  contactHeadingEn: 'Contact Us',
  contactHeadingAr: 'تواصل معنا',
}

// BLANCO brand palette — warm coffee tones. See defaultThemeSettings below
// for how each brand color maps to a specific UI role.
export const defaultThemeSettings = {
  heroBackgroundUrl: '',
  logoUrl: '',
  pageBackgroundColor: '#F5F1E8',
  heroBackgroundColor: '#DDD0BE',
  primaryColor: '#5A3A28',
  buttonColor: '#5A3A28',
  priceBackgroundColor: '#B68A63',
  priceTextColor: '#3B241C',
  headingColor: '#3B241C',
  textColor: '#3B241C',
  mutedTextColor: '#5A3A28',
  navigationBackgroundColor: 'rgba(245, 241, 232, 0.82)',
  footerBackgroundColor: '#42171D',
  arabicFont: 'Cairo',
  englishFont: 'Cairo',
  // Empty = inherit englishFont/arabicFont above, so adding these controls
  // never changes what's already showing until a role is explicitly
  // overridden with its own font.
  headingFontEn: '',
  headingFontAr: '',
  bodyFontEn: '',
  bodyFontAr: '',
  productFontEn: '',
  productFontAr: '',
  heroOverlayOpacity: 0.68,
  // Image placement controls: scale is a zoom multiplier (1 = fit, no crop
  // beyond the default fit mode); offsets are CSS position percentages
  // (50/50 = centered), used as both object-position (logo) and the
  // transform-origin the zoom scales from (hero).
  heroScale: 1,
  heroOffsetX: 50,
  heroOffsetY: 50,
  heroCropRatio: 'wide',
  logoScale: 1,
  logoOffsetX: 50,
  logoOffsetY: 50,
  logoFit: 'contain',
  // Empty = no background (logo image shows as-is). Lets an admin whose
  // uploaded logo file has a baked-in background color match a fill color
  // behind it to the surrounding header, so it reads as blended in rather
  // than a pasted image — without needing to re-export the image itself.
  logoBackgroundColor: '',
  // Additional colors
  buttonTextColor: '#FFFCF8',
  borderColor: '#DDD0BE',
  menuBackgroundColor: '#F5F1E8',
  footerTextColor: '#F5F1E8',
  accentColor: '#B68A63',
  // Layout controls
  logoPosition: 'top-left',
  logoSize: 90,
  logoSpacingTop: 24,
  logoSpacingSide: 24,
  heroAlign: 'left',
  heroPaddingScale: 1,
  sectionSpacingScale: 1,
  buttonSize: 'md',
  textScale: 1,
  // Hero/header text + opening-hours-box colors.
  heroTitleColor: '#3B241C',
  heroTextEnColor: '#5A3A28',
  heroTextArColor: '#5A3A28',
  heroHoursBgColor: '#DDD0BE',
  heroHoursBorderColor: '#B68A63',
  heroHoursTextColor: '#3B241C',
  heroDownArrowColor: '#5A3A28',
}

// Exact color values shipped as defaults at earlier points in the BLANCO
// brand redesign. Each redesign pass only changes *default* colors, so any
// branch (including the live default branch) that already had an explicit
// theme document saved in Firestore keeps showing whatever was live at save
// time — a new palette never overrides a color someone genuinely picked.
//
// migrateLegacyThemeColors() closes that gap safely: for the default branch
// only, any saved color field that still exactly matches one of these old
// snapshots is treated as "never actually customized, just inherited" and is
// upgraded to the current brand default. A field holding any other value (a
// real, deliberate choice — on the default branch or any other branch) is
// always left untouched.
const LEGACY_THEME_COLOR_SNAPSHOTS = [
  // Original purple defaults, shipped before the BLANCO brand redesign.
  {
    pageBackgroundColor: '#f7f3f8',
    heroBackgroundColor: '#28102f',
    primaryColor: '#582369',
    buttonColor: '#542065',
    priceBackgroundColor: '#582369',
    priceTextColor: '#ffffff',
    headingColor: '#35123f',
    textColor: '#26132e',
    mutedTextColor: '#77637d',
    navigationBackgroundColor: '#ffffff',
    footerBackgroundColor: '#28102f',
    buttonTextColor: '#ffffff',
    borderColor: '#e4dbe9',
    menuBackgroundColor: '#f7f3f8',
    footerTextColor: '#ffffff',
    accentColor: '#582369',
    heroTitleColor: '#ffffff',
    heroTextEnColor: '#ffffff',
    heroTextArColor: '#ffffff',
    heroHoursBgColor: '#3e2844',
    heroHoursBorderColor: '#645369',
    heroHoursTextColor: '#ffffff',
    heroDownArrowColor: '#ffffff',
  },
  // First-pass BLANCO cream/coffee redesign defaults.
  {
    pageBackgroundColor: '#F5F1E6',
    heroBackgroundColor: '#E8DDC8',
    primaryColor: '#5A3A28',
    buttonColor: '#5A3A28',
    priceBackgroundColor: '#B8905B',
    priceTextColor: '#3D281C',
    headingColor: '#3D281C',
    textColor: '#3B2A20',
    mutedTextColor: '#6A5749',
    navigationBackgroundColor: 'rgba(245, 241, 230, 0.82)',
    footerBackgroundColor: '#2F1C14',
    buttonTextColor: '#FFFCF8',
    borderColor: '#DDD0BE',
    menuBackgroundColor: '#F5F1E6',
    footerTextColor: '#F5F1E6',
    accentColor: '#B8905B',
    heroTitleColor: '#3D281C',
    heroTextEnColor: '#5A3A28',
    heroTextArColor: '#5A3A28',
    heroHoursBgColor: '#FFFCF8',
    heroHoursBorderColor: '#DDD0BE',
    heroHoursTextColor: '#3D281C',
    heroDownArrowColor: '#5A3A28',
  },
]

// Parses '#rgb', '#rrggbb', or 'rgb(a)(...)' into {r, g, b}, or null if the
// value isn't a recognizable color string.
function parseColorToRgb(value) {
  if (typeof value !== 'string') return null

  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }

  const rgb = value.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
  }

  return null
}

// A BLANCO-family color is a warm cream/beige/brown/burgundy/bronze tone —
// every color the brand has ever used, at any point, keeps red >= green and
// has a visible (non-neutral) warm cast. Used as a symptom-based safety net
// for fields known to have shown genuinely stale, off-palette values that
// don't match any specific historical default snapshot (e.g. a saved color
// from even earlier in the project's history than these snapshots cover).
function isGreenOrTealLeaning(value) {
  const rgb = parseColorToRgb(value)
  if (!rgb) return false
  return rgb.g > rgb.r + 12 && rgb.g >= rgb.b - 10
}

function isNeutralOrColdWhite(value) {
  const rgb = parseColorToRgb(value)
  if (!rgb) return false
  const isVeryLight = rgb.r > 248 && rgb.g > 248 && rgb.b > 248
  const isNeutral = Math.abs(rgb.r - rgb.b) < 6
  return isVeryLight && isNeutral
}

function isOffPaletteLightSurface(value) {
  return isGreenOrTealLeaning(value) || isNeutralOrColdWhite(value)
}

// footerTextColor is meant to be light cream sitting on the dark burgundy
// footer — if it's too dark, it's unreadable. Confirmed live symptom: text
// nearly invisible against the burgundy background.
function isTooDarkToReadOnDarkBackground(value) {
  const rgb = parseColorToRgb(value)
  if (!rgb) return false
  return (rgb.r + rgb.g + rgb.b) / 3 < 150
}

// Fields where a genuinely off-palette value (green/teal leaning, a cold
// neutral white with none of the brand's warm cream cast, or — for footer
// text specifically — too dark to read on a dark background) is treated as
// stale data to correct rather than a deliberate customization to preserve.
// Scoped to exactly the fields with a confirmed live symptom, so a
// legitimate custom color anywhere else is never touched.
const OFF_PALETTE_CHECKS = {
  navigationBackgroundColor: isGreenOrTealLeaning,
  pageBackgroundColor: isOffPaletteLightSurface,
  menuBackgroundColor: isOffPaletteLightSurface,
  heroBackgroundColor: isOffPaletteLightSurface,
  footerTextColor: isTooDarkToReadOnDarkBackground,
}

export function migrateLegacyThemeColors(data) {
  if (!data || typeof data !== 'object') return data

  const migrated = { ...data }

  for (const field of Object.keys(defaultThemeSettings)) {
    const matchesLegacySnapshot = LEGACY_THEME_COLOR_SNAPSHOTS.some(
      (snapshot) => field in snapshot && migrated[field] === snapshot[field],
    )
    const isOffPalette = OFF_PALETTE_CHECKS[field]?.(migrated[field]) ?? false

    if (matchesLegacySnapshot || isOffPalette) {
      migrated[field] = defaultThemeSettings[field]
    }
  }

  return migrated
}

export const logoPositionOptions = [
  { value: 'top-left', label: 'أعلى اليسار' },
  { value: 'top-center', label: 'أعلى الوسط' },
  { value: 'top-right', label: 'أعلى اليمين' },
]

export const heroAlignOptions = [
  { value: 'left', label: 'يسار' },
  { value: 'center', label: 'وسط' },
]

export const buttonSizeOptions = [
  { value: 'sm', label: 'صغير' },
  { value: 'md', label: 'متوسط' },
  { value: 'lg', label: 'كبير' },
]

export const heroCropRatioOptions = [
  { value: 'wide', label: 'عريض (21:9)' },
  { value: 'standard', label: 'قياسي (16:9)' },
  { value: 'tall', label: 'طويل (3:4)' },
]

export const defaultContactSettings = {
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  googleMapsUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  snapchatUrl: '',
  xUrl: '',
  facebookUrl: '',
}

export const currencyOptions = ['BD', 'SAR', 'AED', 'KWD', 'OMR', 'USD']
// Ten curated premium fonts, tagged by which script(s) each family actually
// has glyph coverage for. The Arabic and English selectors both derive from
// this one catalog by filtering, so any font supporting both scripts shows
// up in both lists at the same relative position — every font here does, so
// in practice both selectors currently show the exact same list. A font
// would only be excluded from one selector if it genuinely lacked that
// script's glyphs.
const fontCatalog = [
  { name: 'Cairo', scripts: ['ar', 'en'] },
  { name: 'Tajawal', scripts: ['ar', 'en'] },
  { name: 'Almarai', scripts: ['ar', 'en'] },
  { name: 'El Messiri', scripts: ['ar', 'en'] },
  { name: 'Markazi Text', scripts: ['ar', 'en'] },
  { name: 'Changa', scripts: ['ar', 'en'] },
  { name: 'IBM Plex Sans Arabic', scripts: ['ar', 'en'] },
  { name: 'Reem Kufi', scripts: ['ar', 'en'] },
  { name: 'Lalezar', scripts: ['ar', 'en'] },
  { name: 'Mada', scripts: ['ar', 'en'] },
]

export const arabicFontOptions = fontCatalog
  .filter((font) => font.scripts.includes('ar'))
  .map((font) => font.name)

export const englishFontOptions = fontCatalog
  .filter((font) => font.scripts.includes('en'))
  .map((font) => font.name)

export const badgeOptions = [
  'جديد',
  'الأكثر مبيعًا',
  'مميز',
  'كمية محدودة',
  'نباتي',
  'حار',
  'خالٍ من الغلوتين',
]

export const availabilityOptions = [
  { value: 'available', label: 'متوفر' },
  { value: 'out_of_stock', label: 'نفدت الكمية' },
  { value: 'hidden', label: 'مخفي' },
]

export const statusOptions = [
  { value: 'published', label: 'منشور' },
  { value: 'draft', label: 'مسودة' },
]

export const daysOfWeekOptions = [
  { value: 'sun', label: 'الأحد' },
  { value: 'mon', label: 'الاثنين' },
  { value: 'tue', label: 'الثلاثاء' },
  { value: 'wed', label: 'الأربعاء' },
  { value: 'thu', label: 'الخميس' },
  { value: 'fri', label: 'الجمعة' },
  { value: 'sat', label: 'السبت' },
]

export const optionTypeOptions = [
  { value: 'single', label: 'اختيار واحد (مثل الحجم)' },
  { value: 'multiple', label: 'اختيار متعدد (مثل الإضافات)' },
]

const categoryColorPalette = [
  '#582369', '#28102f', '#77637d', '#c9a4d9',
  '#2f6b4f', '#a3521a', '#1f4e79', '#8c1f28',
]

export function pickNextCategoryColor(existingCategories) {
  const used = new Set((existingCategories || []).map((c) => c.color).filter(Boolean))
  return categoryColorPalette.find((color) => !used.has(color)) || categoryColorPalette[0]
}

// ---------- Google Drive image handling ----------

export function convertGoogleDriveLink(url) {
  if (!url) return ''

  const trimmed = url.trim()

  if (!trimmed) return ''

  // Already converted — return as-is so re-processing an already-converted
  // link never corrupts it (idempotent).
  if (trimmed.includes('lh3.googleusercontent.com')) {
    return trimmed
  }

  if (!trimmed.includes('drive.google.com')) {
    return trimmed
  }

  let fileId = ''

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
    /\/open\?id=([^&]+)/,
    /\/uc\?id=([^&]+)/,
    /\/thumbnail\?id=([^&]+)/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)

    if (match && match[1]) {
      fileId = match[1]
      break
    }
  }

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`
  }

  return trimmed
}

// ---------- Image placement (zoom / crop position) ----------

export const IMAGE_SCALE_MIN = 1
export const IMAGE_SCALE_MAX = 2.5

export function clampImageScale(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return 1
  return Math.min(IMAGE_SCALE_MAX, Math.max(IMAGE_SCALE_MIN, number))
}

export function clampImageOffset(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return 50
  return Math.min(100, Math.max(0, number))
}

// A crop is independent per image: every product, every category, the logo,
// and the hero each store their own {scale, offsetX, offsetY} so adjusting
// one image never touches another.
export function defaultImageCrop() {
  return { scale: 1, offsetX: 50, offsetY: 50 }
}

export function normalizeImageCrop(raw) {
  return {
    scale: clampImageScale(raw?.scale ?? 1),
    offsetX: clampImageOffset(raw?.offsetX ?? 50),
    offsetY: clampImageOffset(raw?.offsetY ?? 50),
  }
}

export function imageCropToStyle(crop, fit = 'cover') {
  const safe = normalizeImageCrop(crop)
  return {
    objectFit: fit,
    objectPosition: `${safe.offsetX}% ${safe.offsetY}%`,
    transform: `scale(${safe.scale})`,
  }
}

// ---------- Layout controls ----------

export function clampLogoSize(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return 90
  return Math.min(200, Math.max(40, number))
}

export function clampSpacing(value, fallback = 24) {
  const number = Number(value)
  if (Number.isNaN(number)) return fallback
  return Math.min(120, Math.max(0, number))
}

export function clampScaleFactor(value, fallback = 1) {
  const number = Number(value)
  if (Number.isNaN(number)) return fallback
  return Math.min(1.6, Math.max(0.6, number))
}

export function clampTextScale(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return 1
  return Math.min(1.15, Math.max(0.85, number))
}

// ---------- Weekly opening hours ----------
// No longer editable from the admin panel (superseded by the customizable
// heroHours rows below) — kept only so `normalizeWeeklyHours` can still
// read whatever a site had already saved, to feed the schema.org
// opening-hours SEO data in seo.js.

export const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function defaultWeeklyHours() {
  const day = { closed: false, open: '08:00', close: '02:00' }
  return {
    sun: { ...day },
    mon: { ...day },
    tue: { ...day },
    wed: { ...day },
    thu: { ...day },
    fri: { ...day },
    sat: { ...day },
  }
}

// Returns null when no weekly schedule has ever been configured, so callers
// can omit the SEO opening-hours field entirely for sites that never had one.
export function normalizeWeeklyHours(raw) {
  if (!raw || typeof raw !== 'object') return null

  const base = defaultWeeklyHours()
  const result = {}

  for (const key of dayKeys) {
    const day = raw[key]
    result[key] = {
      closed: Boolean(day?.closed),
      open: day?.open || base[key].open,
      close: day?.close || base[key].close,
    }
  }

  return result
}

// ---------- Hero/header opening-hours box (public-facing, custom rows) ----------
// Separate from the 7-day `weeklyHours` schedule above, which stays in
// Firestore and stays editable in admin, but is no longer shown on the
// public homepage — the hero box shows an admin-editable, reorderable list
// of independently-labelled, independently-hideable rows (Weekday/Weekend
// by default, plus any custom rows the admin adds — Holidays, Ramadan, ...).

export function defaultHeroHours() {
  return [
    { id: 'row1', labelEn: 'Weekday', labelAr: 'أيام الأسبوع', open: '08:00', close: '02:00', visible: true },
    { id: 'row2', labelEn: 'Weekend', labelAr: 'نهاية الأسبوع', open: '08:00', close: '02:00', visible: true },
  ]
}

export function newHeroHoursRow() {
  return {
    id: generateOptionId(),
    labelEn: '',
    labelAr: '',
    open: '08:00',
    close: '17:00',
    visible: true,
  }
}

// Firestore documents saved before this feature became a reorderable list
// stored heroHours as a fixed { row1, row2 } object — convert those on read
// so nothing is lost, while a raw array (the current shape) passes through
// as-is, letting an admin add/remove/reorder rows freely.
export function normalizeHeroHours(raw) {
  if (Array.isArray(raw)) {
    return raw.map((row, index) => ({
      id: row?.id || `row-${index}-${generateOptionId()}`,
      labelEn: row?.labelEn || '',
      labelAr: row?.labelAr || '',
      open: row?.open || '08:00',
      close: row?.close || '17:00',
      visible: row?.visible !== false,
    }))
  }

  if (raw && typeof raw === 'object' && (raw.row1 || raw.row2)) {
    const base = defaultHeroHours()
    return ['row1', 'row2']
      .filter((key) => raw[key])
      .map((key, index) => ({ ...base[index], ...raw[key], id: key }))
  }

  return defaultHeroHours()
}

export function validateHeroHours(heroHours) {
  for (const row of heroHours || []) {
    if (!row.visible) continue

    if (!row.labelEn?.trim() || !row.labelAr?.trim()) {
      return { valid: false, message: 'اكتب نص الصف بالإنجليزي والعربي في ساعات العمل بالهيدر' }
    }

    if (!row.open || !row.close) {
      return { valid: false, message: 'أدخل وقت الفتح والإغلاق لكل صف ظاهر في ساعات العمل بالهيدر' }
    }
  }

  return { valid: true, message: '' }
}

// ---------- 12-hour time picker helpers ----------
// Storage stays 24-hour "HH:mm" (unchanged schema, sorts/compares easily);
// only the admin UI and the public-facing display use 12-hour AM/PM.

export const timePickerMinuteOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

export function to12Hour(time24) {
  const [hStr, mStr] = (time24 || '00:00').split(':')
  let hour = parseInt(hStr, 10)
  if (Number.isNaN(hour)) hour = 0

  const period = hour >= 12 ? 'PM' : 'AM'
  let hour12 = hour % 12
  if (hour12 === 0) hour12 = 12

  const minute = (mStr || '00').padStart(2, '0')

  return { hour: hour12, minute, period }
}

export function from12Hour(hour12, minute, period) {
  let hour = Number(hour12) % 12
  if (period === 'PM') hour += 12

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatTime12Hour(time24) {
  if (!time24) return ''
  const { hour, minute, period } = to12Hour(time24)
  return `${hour}:${minute} ${period}`
}

export function validateImageLink(url) {
  const trimmed = (url || '').trim()

  if (!trimmed) {
    return { valid: true, message: '' }
  }

  try {
    // eslint-disable-next-line no-new
    new URL(trimmed)
  } catch {
    return {
      valid: false,
      message: 'الرابط غير صالح، تأكد من نسخه بالكامل بما فيه https://',
    }
  }

  if (trimmed.includes('drive.google.com')) {
    const hasId =
      /\/file\/d\/([^/]+)/.test(trimmed) ||
      /[?&]id=([^&]+)/.test(trimmed) ||
      /\/d\/([^/]+)/.test(trimmed)

    if (!hasId) {
      return {
        valid: false,
        message:
          'تعذر التعرف على رابط Google Drive، تأكد أن الملف تمت مشاركته للجميع (Anyone with the link)',
      }
    }
  }

  return { valid: true, message: '' }
}

// ---------- IDs ----------

export function slugifyName(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function randomToken(length = 4) {
  return Math.random().toString(36).slice(2, 2 + length)
}

export function createUniqueId(name) {
  const slug = slugifyName(name) || 'item'
  return `${slug}-${Date.now().toString(36)}${randomToken(4)}`
}

export function generateOptionId() {
  return `opt-${Date.now().toString(36)}${randomToken(5)}`
}

// ---------- Ordering ----------

export function nextOrderValue(items) {
  if (!items || items.length === 0) return 1
  const maxOrder = items.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0)
  return maxOrder + 1
}

// ---------- Firestore batching ----------

export function chunkArray(items, size = 400) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

// operationBuilders: array of functions receiving a batch instance and
// calling batch.set/.delete/.update on it. Commits sequentially in safe
// chunks to respect Firestore's per-batch operation limit.
export async function runChunkedBatch(db, operationBuilders, chunkSize = 400) {
  const chunks = chunkArray(operationBuilders, chunkSize)

  for (const chunk of chunks) {
    const batch = writeBatch(db)
    chunk.forEach((build) => build(batch))
    // eslint-disable-next-line no-await-in-loop
    await batch.commit()
  }
}

// ---------- Local-time date handling ----------

export function parseLocalDate(dateString) {
  if (!dateString) return null
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function isWithinDateRange(now, startDate, endDate) {
  if (startDate) {
    const start = parseLocalDate(startDate)
    if (start && now < start) return false
  }

  if (endDate) {
    const end = parseLocalDate(endDate)
    if (end) {
      end.setHours(23, 59, 59, 999)
      if (now > end) return false
    }
  }

  return true
}

export function isWithinDaysOfWeek(now, daysOfWeek) {
  // Empty/undefined daysOfWeek means "every day".
  if (!daysOfWeek || daysOfWeek.length === 0) return true
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return daysOfWeek.includes(dayMap[now.getDay()])
}

export function isWithinTimeRange(now, startTime, endTime) {
  if (!startTime || !endTime) return true

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes === endMinutes) return true

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }

  // Crosses midnight, e.g. 22:00 -> 02:00
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes
}

// ---------- Schedule normalization ----------

export function defaultSchedule() {
  return {
    enabled: false,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
  }
}

export function normalizeSchedule(raw) {
  const base = defaultSchedule()
  if (!raw || typeof raw !== 'object') return base

  return {
    enabled: !!raw.enabled,
    startDate: raw.startDate || '',
    endDate: raw.endDate || '',
    startTime: raw.startTime || '',
    endTime: raw.endTime || '',
    daysOfWeek: Array.isArray(raw.daysOfWeek) ? raw.daysOfWeek : [],
  }
}

export function isProductVisibleNow(product) {
  if (product.status === 'draft') return false
  if (product.availability === 'hidden') return false
  if (product.visible === false) return false

  const schedule = normalizeSchedule(product.schedule)
  if (!schedule.enabled) return true

  const now = new Date()

  if (!isWithinDateRange(now, schedule.startDate, schedule.endDate)) return false
  if (!isWithinDaysOfWeek(now, schedule.daysOfWeek)) return false
  if (!isWithinTimeRange(now, schedule.startTime, schedule.endTime)) return false

  return true
}

// ---------- Price scheduling ----------

export function normalizePriceRule(raw, index = 0) {
  return {
    id: raw?.id || generateOptionId(),
    label: raw?.label || '',
    price: raw?.price ?? '',
    startDate: raw?.startDate || '',
    endDate: raw?.endDate || '',
    startTime: raw?.startTime || '',
    endTime: raw?.endTime || '',
    daysOfWeek: Array.isArray(raw?.daysOfWeek) ? raw.daysOfWeek : [],
    priority: typeof raw?.priority === 'number' ? raw.priority : index,
  }
}

export function getActivePrice(product) {
  const basePrice = product.price
  const rules = (product.priceSchedule || []).map((rule, index) => normalizePriceRule(rule, index))

  if (rules.length === 0) return basePrice

  const now = new Date()

  const activeRules = rules.filter((rule) => {
    const priceNumber = Number(rule.price)
    if (rule.price === '' || Number.isNaN(priceNumber) || priceNumber < 0) return false
    if (!isWithinDateRange(now, rule.startDate, rule.endDate)) return false
    if (!isWithinDaysOfWeek(now, rule.daysOfWeek)) return false
    if (!isWithinTimeRange(now, rule.startTime, rule.endTime)) return false
    return true
  })

  if (activeRules.length === 0) return basePrice

  // Deterministic resolution: highest priority wins, tie-broken by id.
  activeRules.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return a.id.localeCompare(b.id)
  })

  return activeRules[0].price
}

// ---------- Validation ----------

export function validatePriceValue(value) {
  const trimmed = String(value ?? '').trim()

  if (!trimmed) return { valid: false, message: 'اكتب السعر' }

  const number = Number(trimmed)

  if (Number.isNaN(number) || number < 0) {
    return { valid: false, message: 'السعر يجب أن يكون رقمًا موجبًا' }
  }

  return { valid: true, message: '' }
}

export function validateOrderValue(value) {
  const number = Number(value)

  if (!Number.isInteger(number) || number < 1) {
    return { valid: false, message: 'الترتيب يجب أن يكون رقمًا صحيحًا موجبًا' }
  }

  return { valid: true, message: '' }
}

export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) return { valid: true, message: '' }

  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)

  if (start && end && end < start) {
    return { valid: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' }
  }

  return { valid: true, message: '' }
}

export function validateTimeRange(startTime, endTime) {
  if ((startTime && !endTime) || (!startTime && endTime)) {
    return { valid: false, message: 'أدخل وقت البداية والنهاية معًا أو اتركهما فارغين' }
  }

  return { valid: true, message: '' }
}

export function validateOptionGroups(options) {
  for (const group of options || []) {
    if (!group.name || !group.name.trim()) {
      return { valid: false, message: 'اكتب اسمًا لكل مجموعة خيارات' }
    }

    for (const choice of group.choices || []) {
      if (!choice.label || !choice.label.trim()) {
        return { valid: false, message: 'اكتب اسمًا لكل اختيار داخل المجموعات' }
      }

      if (choice.priceModifier !== undefined && Number.isNaN(Number(choice.priceModifier))) {
        return { valid: false, message: 'فرق السعر يجب أن يكون رقمًا' }
      }
    }
  }

  return { valid: true, message: '' }
}

export function validateSchedule(schedule) {
  if (!schedule || !schedule.enabled) return { valid: true, message: '' }

  const dateCheck = validateDateRange(schedule.startDate, schedule.endDate)
  if (!dateCheck.valid) return dateCheck

  const timeCheck = validateTimeRange(schedule.startTime, schedule.endTime)
  if (!timeCheck.valid) return timeCheck

  return { valid: true, message: '' }
}

export function validatePriceSchedule(priceSchedule) {
  for (const rule of priceSchedule || []) {
    const priceCheck = validatePriceValue(rule.price)
    if (!priceCheck.valid) {
      return { valid: false, message: `سعر مجدول غير صالح: ${priceCheck.message}` }
    }

    const dateCheck = validateDateRange(rule.startDate, rule.endDate)
    if (!dateCheck.valid) return dateCheck

    const timeCheck = validateTimeRange(rule.startTime, rule.endTime)
    if (!timeCheck.valid) return timeCheck
  }

  return { valid: true, message: '' }
}