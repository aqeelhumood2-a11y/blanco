import { writeBatch } from 'firebase/firestore'

export const defaultSiteSettings = {
  siteNameEn: 'BLANCO',
  siteNameAr: '',
  welcomeEn: "Welcome, we're glad you're here.",
  welcomeAr: 'أهلًا بك، سعداء بوجودك.',
  descriptionEn: 'Take a look at our menu and enjoy your favorite drink.',
  descriptionAr: 'تصفح قائمتنا واستمتع بمشروبك المفضل.',
  workingHours: '8:00 AM – 2:00 AM',
  footerText: 'BLANCO',
  currency: '',
  showPrices: true,
}

export const defaultThemeSettings = {
  heroBackgroundUrl: '',
  logoUrl: '',
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
  arabicFont: 'Cairo',
  englishFont: 'Montserrat',
  heroOverlayOpacity: 0.68,
}

export const defaultContactSettings = {
  phone: '',
  whatsapp: '',
  googleMapsUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  snapchatUrl: '',
  xUrl: '',
  facebookUrl: '',
}

export const currencyOptions = ['BD', 'SAR', 'AED', 'KWD', 'OMR', 'USD']
export const arabicFontOptions = ['Cairo', 'Tajawal', 'Almarai']
export const englishFontOptions = ['Montserrat', 'Poppins', 'Arial']

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

// kept as aliases for backward compatibility with any older call sites
export function createProductId(name) {
  return createUniqueId(name)
}
export function createEntityId(name) {
  return createUniqueId(name)
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