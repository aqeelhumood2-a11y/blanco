
import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { getDoc, setDoc } from 'firebase/firestore'

import { auth } from './firebase.js'
import { menuSections } from './menuData.js'
import './Admin.css'

import ImageCropEditor from './admin/components/ImageCropEditor.jsx'

// Each manager (dnd-kit reordering, the QR generator, ...) only needs to
// download once the admin actually opens that specific section — most
// visits to /admin are a single settings tweak, not every section at once.
const ProductsManager = lazy(() => import('./admin/ProductsManager.jsx'))
const CategoriesManager = lazy(() => import('./admin/CategoriesManager.jsx'))
const BranchesManager = lazy(() => import('./admin/BranchesManager.jsx'))
import {
  arabicFontOptions,
  buttonSizeOptions,
  clampLogoSize,
  clampScaleFactor,
  clampSpacing,
  clampTextScale,
  convertGoogleDriveLink,
  currencyOptions,
  dayKeys,
  dayLabels,
  defaultContactSettings,
  defaultHeroHours,
  defaultImageCrop,
  defaultSiteSettings,
  defaultThemeSettings,
  defaultWeeklyHours,
  englishFontOptions,
  heroAlignOptions,
  heroCropRatioOptions,
  logoPositionOptions,
  normalizeHeroHours,
  normalizeImageCrop,
  normalizeWeeklyHours,
  slugifyName,
  validateHeroHours,
  validateWeeklyHours,
} from './admin/utils/adminUtils.js'
import {
  DEFAULT_BRANCH_ID,
  categoryDocRef,
  contactSettingsDocRef,
  defaultBranchMeta,
  productDocRef,
  siteSettingsDocRef,
  themeSettingsDocRef,
} from './admin/utils/branchPaths.js'

function Admin() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [uploadingMenu, setUploadingMenu] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

  const [view, setView] = useState('dashboard')

  // Which branch's content (products, categories, settings) the admin is
  // currently viewing/editing. Everything below reloads whenever this
  // changes — switching branches never touches any other branch's data.
  const [currentBranchId, setCurrentBranchId] = useState(DEFAULT_BRANCH_ID)
  const [currentBranchMeta, setCurrentBranchMeta] = useState(defaultBranchMeta())

  const [showSiteSettings, setShowSiteSettings] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')

  const [siteNameEn, setSiteNameEn] = useState('')
  const [siteNameAr, setSiteNameAr] = useState('')

  const [welcomeEn, setWelcomeEn] = useState('')
  const [welcomeAr, setWelcomeAr] = useState('')

  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')

  const [workingHours, setWorkingHours] = useState('')
  const [footerText, setFooterText] = useState('')

  const [currency, setCurrency] = useState('BD')
  const [showPrices, setShowPrices] = useState(true)

  const [openingHoursLabelEn, setOpeningHoursLabelEn] = useState(
    defaultSiteSettings.openingHoursLabelEn,
  )
  const [openingHoursLabelAr, setOpeningHoursLabelAr] = useState(
    defaultSiteSettings.openingHoursLabelAr,
  )
  const [contactHeadingEn, setContactHeadingEn] = useState(
    defaultSiteSettings.contactHeadingEn,
  )
  const [contactHeadingAr, setContactHeadingAr] = useState(
    defaultSiteSettings.contactHeadingAr,
  )
  const [weeklyHours, setWeeklyHours] = useState(defaultWeeklyHours())
  const [weekdayPreset, setWeekdayPreset] = useState({ open: '08:00', close: '02:00' })
  const [weekendPreset, setWeekendPreset] = useState({ open: '08:00', close: '02:00' })
  // Public-facing hero/header opening-hours box: independent from the
  // 7-day `weeklyHours` schedule above, which stays editable here but is
  // no longer shown on the public homepage.
  const [heroHours, setHeroHours] = useState(defaultHeroHours())

  const [savingSettings, setSavingSettings] = useState(false)

  const [themeLoading, setThemeLoading] = useState(false)
  const [themeMessage, setThemeMessage] = useState('')
  const [savingTheme, setSavingTheme] = useState(false)

  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [pageBackgroundColor, setPageBackgroundColor] = useState(
    defaultThemeSettings.pageBackgroundColor,
  )
  const [heroBackgroundColor, setHeroBackgroundColor] = useState(
    defaultThemeSettings.heroBackgroundColor,
  )

  const [primaryColor, setPrimaryColor] = useState(
    defaultThemeSettings.primaryColor,
  )
  const [buttonColor, setButtonColor] = useState(
    defaultThemeSettings.buttonColor,
  )
  const [priceBackgroundColor, setPriceBackgroundColor] = useState(
    defaultThemeSettings.priceBackgroundColor,
  )
  const [priceTextColor, setPriceTextColor] = useState(
    defaultThemeSettings.priceTextColor,
  )
  const [headingColor, setHeadingColor] = useState(
    defaultThemeSettings.headingColor,
  )
  const [textColor, setTextColor] = useState(
    defaultThemeSettings.textColor,
  )
  const [mutedTextColor, setMutedTextColor] = useState(
    defaultThemeSettings.mutedTextColor,
  )
  const [navigationBackgroundColor, setNavigationBackgroundColor] =
    useState(defaultThemeSettings.navigationBackgroundColor)
  const [footerBackgroundColor, setFooterBackgroundColor] = useState(
    defaultThemeSettings.footerBackgroundColor,
  )
  const [arabicFont, setArabicFont] = useState(
    defaultThemeSettings.arabicFont,
  )
  const [englishFont, setEnglishFont] = useState(
    defaultThemeSettings.englishFont,
  )
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(
    defaultThemeSettings.heroOverlayOpacity,
  )
  const [heroImageError, setHeroImageError] = useState(false)
  const [logoImageError, setLogoImageError] = useState(false)

  const [heroCrop, setHeroCrop] = useState(defaultImageCrop())
  const [heroCropRatio, setHeroCropRatio] = useState(defaultThemeSettings.heroCropRatio)
  const [logoCrop, setLogoCrop] = useState(defaultImageCrop())
  const [logoFit, setLogoFit] = useState(defaultThemeSettings.logoFit)

  const [buttonTextColor, setButtonTextColor] = useState(defaultThemeSettings.buttonTextColor)
  const [borderColor, setBorderColor] = useState(defaultThemeSettings.borderColor)
  const [menuBackgroundColor, setMenuBackgroundColor] = useState(
    defaultThemeSettings.menuBackgroundColor,
  )
  const [footerTextColor, setFooterTextColor] = useState(defaultThemeSettings.footerTextColor)
  const [accentColor, setAccentColor] = useState(defaultThemeSettings.accentColor)

  const [heroTitleColor, setHeroTitleColor] = useState(defaultThemeSettings.heroTitleColor)
  const [heroTextEnColor, setHeroTextEnColor] = useState(defaultThemeSettings.heroTextEnColor)
  const [heroTextArColor, setHeroTextArColor] = useState(defaultThemeSettings.heroTextArColor)
  const [heroHoursBgColor, setHeroHoursBgColor] = useState(defaultThemeSettings.heroHoursBgColor)
  const [heroHoursBorderColor, setHeroHoursBorderColor] = useState(
    defaultThemeSettings.heroHoursBorderColor,
  )
  const [heroHoursTextColor, setHeroHoursTextColor] = useState(
    defaultThemeSettings.heroHoursTextColor,
  )
  const [heroDownArrowColor, setHeroDownArrowColor] = useState(
    defaultThemeSettings.heroDownArrowColor,
  )

  const [logoPosition, setLogoPosition] = useState(defaultThemeSettings.logoPosition)
  const [logoSize, setLogoSize] = useState(defaultThemeSettings.logoSize)
  const [logoSpacingTop, setLogoSpacingTop] = useState(defaultThemeSettings.logoSpacingTop)
  const [logoSpacingSide, setLogoSpacingSide] = useState(defaultThemeSettings.logoSpacingSide)
  const [heroAlign, setHeroAlign] = useState(defaultThemeSettings.heroAlign)
  const [heroPaddingScale, setHeroPaddingScale] = useState(defaultThemeSettings.heroPaddingScale)
  const [sectionSpacingScale, setSectionSpacingScale] = useState(
    defaultThemeSettings.sectionSpacingScale,
  )
  const [buttonSize, setButtonSize] = useState(defaultThemeSettings.buttonSize)
  const [textScale, setTextScale] = useState(defaultThemeSettings.textScale)

  const [contactLoading, setContactLoading] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [snapchatUrl, setSnapchatUrl] = useState('')
  const [xUrl, setXUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')

  const siteSettingsRef = useRef(null)
  const themeRef = useRef(null)
  const contactRef = useRef(null)

  // Synchronous locks against duplicate submissions — see ProductsManager
  // for why a ref is required here instead of the saving*/submitting state.
  const loginLock = useRef(false)
  const savingSettingsLock = useRef(false)
  const savingThemeLock = useRef(false)
  const savingContactLock = useRef(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (user) {
      loadSiteSettings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentBranchId])

  // Switching branches from the Branch Management screen always returns to
  // the dashboard — every other section (theme/contact/products/categories)
  // reloads its own data for the newly selected branch the moment it's opened.
  function switchToBranch(branch) {
    setCurrentBranchId(branch.id)
    setCurrentBranchMeta(branch)
    goToDashboard()
  }

  function openBranches() {
    clearMessages()
    setView('branches')
  }

  useEffect(() => {
    if (showSiteSettings && siteSettingsRef.current) {
      siteSettingsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [showSiteSettings])

  useEffect(() => {
    if (view === 'theme' && themeRef.current) {
      themeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [view])

  useEffect(() => {
    if (view === 'contact' && contactRef.current) {
      contactRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [view])

  function clearMessages() {
    setError('')
    setUploadMessage('')
    setSettingsMessage('')
    setThemeMessage('')
    setContactMessage('')
  }

  function goToDashboard() {
    setShowSiteSettings(false)
    clearMessages()
    setView('dashboard')
  }

  function openProducts() {
    clearMessages()
    setView('products')
  }

  function openCategories() {
    clearMessages()
    setView('categories')
  }

  async function openSiteSettings() {
    clearMessages()
    setView('settings')

    setShowSiteSettings(true)

    await loadSiteSettings()
  }

  async function openTheme() {
    clearMessages()
    setView('theme')

    await loadThemeSettings()
  }

  async function openContact() {
    clearMessages()
    setView('contact')

    await loadContactSettings()
  }

  async function loadSiteSettings() {
    setSettingsLoading(true)
    setSettingsMessage('')

    try {
      const settingsDoc = await getDoc(siteSettingsDocRef(currentBranchId))

      const data = settingsDoc.exists()
        ? settingsDoc.data()
        : {}

      setSiteNameEn(
        data.siteNameEn ?? defaultSiteSettings.siteNameEn,
      )
      setSiteNameAr(
        data.siteNameAr ?? defaultSiteSettings.siteNameAr,
      )
      setWelcomeEn(
        data.welcomeEn ?? defaultSiteSettings.welcomeEn,
      )
      setWelcomeAr(
        data.welcomeAr ?? defaultSiteSettings.welcomeAr,
      )
      setDescriptionEn(
        data.descriptionEn ?? defaultSiteSettings.descriptionEn,
      )
      setDescriptionAr(
        data.descriptionAr ?? defaultSiteSettings.descriptionAr,
      )
      setWorkingHours(
        data.workingHours ?? defaultSiteSettings.workingHours,
      )
      setFooterText(
        data.footerText ?? defaultSiteSettings.footerText,
      )
      setCurrency(
        data.currency ?? defaultSiteSettings.currency,
      )
      setShowPrices(
        data.showPrices !== undefined
          ? data.showPrices
          : defaultSiteSettings.showPrices,
      )
      setOpeningHoursLabelEn(
        data.openingHoursLabelEn ?? defaultSiteSettings.openingHoursLabelEn,
      )
      setOpeningHoursLabelAr(
        data.openingHoursLabelAr ?? defaultSiteSettings.openingHoursLabelAr,
      )
      setContactHeadingEn(
        data.contactHeadingEn ?? defaultSiteSettings.contactHeadingEn,
      )
      setContactHeadingAr(
        data.contactHeadingAr ?? defaultSiteSettings.contactHeadingAr,
      )
      setWeeklyHours(normalizeWeeklyHours(data.weeklyHours) ?? defaultWeeklyHours())
      setHeroHours(normalizeHeroHours(data.heroHours))
    } catch (settingsError) {
      console.error(settingsError)
      setError('تعذر تحميل إعدادات الموقع')
    } finally {
      setSettingsLoading(false)
    }
  }

  async function saveSiteSettings(event) {
    event.preventDefault()
    if (savingSettingsLock.current) return
    savingSettingsLock.current = true

    setSavingSettings(true)
    setError('')
    setSettingsMessage('')

    const hoursCheck = validateWeeklyHours(weeklyHours)

    if (!hoursCheck.valid) {
      setError(hoursCheck.message)
      savingSettingsLock.current = false
      setSavingSettings(false)
      return
    }

    const heroHoursCheck = validateHeroHours(heroHours)

    if (!heroHoursCheck.valid) {
      setError(heroHoursCheck.message)
      savingSettingsLock.current = false
      setSavingSettings(false)
      return
    }

    try {
      await setDoc(
        siteSettingsDocRef(currentBranchId),
        {
          siteNameEn: siteNameEn.trim(),
          siteNameAr: siteNameAr.trim(),
          welcomeEn: welcomeEn.trim(),
          welcomeAr: welcomeAr.trim(),
          descriptionEn: descriptionEn.trim(),
          descriptionAr: descriptionAr.trim(),
          workingHours: workingHours.trim(),
          footerText: footerText.trim(),
          currency,
          showPrices,
          openingHoursLabelEn: openingHoursLabelEn.trim(),
          openingHoursLabelAr: openingHoursLabelAr.trim(),
          contactHeadingEn: contactHeadingEn.trim(),
          contactHeadingAr: contactHeadingAr.trim(),
          weeklyHours,
          heroHours,
        },
        { merge: true },
      )

      setSettingsMessage('تم حفظ إعدادات الموقع بنجاح')
    } catch (saveError) {
      console.error(saveError)
      setError('صار خطأ أثناء حفظ إعدادات الموقع')
    } finally {
      savingSettingsLock.current = false
      setSavingSettings(false)
    }
  }

  async function loadThemeSettings() {
    setThemeLoading(true)
    setThemeMessage('')

    try {
      const themeDoc = await getDoc(themeSettingsDocRef(currentBranchId))

      const data = themeDoc.exists() ? themeDoc.data() : {}

      setHeroBackgroundUrl(
        data.heroBackgroundUrl ?? defaultThemeSettings.heroBackgroundUrl,
      )
      setLogoUrl(data.logoUrl ?? defaultThemeSettings.logoUrl)
      setPageBackgroundColor(
        data.pageBackgroundColor ??
          defaultThemeSettings.pageBackgroundColor,
      )
      setHeroBackgroundColor(
        data.heroBackgroundColor ?? defaultThemeSettings.heroBackgroundColor,
      )
      setPrimaryColor(
        data.primaryColor ?? defaultThemeSettings.primaryColor,
      )
      setButtonColor(
        data.buttonColor ?? defaultThemeSettings.buttonColor,
      )
      setPriceBackgroundColor(
        data.priceBackgroundColor ??
          defaultThemeSettings.priceBackgroundColor,
      )
      setPriceTextColor(
        data.priceTextColor ?? defaultThemeSettings.priceTextColor,
      )
      setHeadingColor(
        data.headingColor ?? defaultThemeSettings.headingColor,
      )
      setTextColor(data.textColor ?? defaultThemeSettings.textColor)
      setMutedTextColor(
        data.mutedTextColor ?? defaultThemeSettings.mutedTextColor,
      )
      setNavigationBackgroundColor(
        data.navigationBackgroundColor ??
          defaultThemeSettings.navigationBackgroundColor,
      )
      setFooterBackgroundColor(
        data.footerBackgroundColor ??
          defaultThemeSettings.footerBackgroundColor,
      )
      setArabicFont(
        data.arabicFont ?? defaultThemeSettings.arabicFont,
      )
      setEnglishFont(
        data.englishFont ?? defaultThemeSettings.englishFont,
      )
      setHeroOverlayOpacity(
        data.heroOverlayOpacity !== undefined
          ? data.heroOverlayOpacity
          : defaultThemeSettings.heroOverlayOpacity,
      )
      setHeroCrop(
        normalizeImageCrop({
          scale: data.heroScale ?? defaultThemeSettings.heroScale,
          offsetX: data.heroOffsetX ?? defaultThemeSettings.heroOffsetX,
          offsetY: data.heroOffsetY ?? defaultThemeSettings.heroOffsetY,
        }),
      )
      setHeroCropRatio(data.heroCropRatio || defaultThemeSettings.heroCropRatio)
      setLogoCrop(
        normalizeImageCrop({
          scale: data.logoScale ?? defaultThemeSettings.logoScale,
          offsetX: data.logoOffsetX ?? defaultThemeSettings.logoOffsetX,
          offsetY: data.logoOffsetY ?? defaultThemeSettings.logoOffsetY,
        }),
      )
      setLogoFit(data.logoFit === 'cover' ? 'cover' : defaultThemeSettings.logoFit)
      setButtonTextColor(data.buttonTextColor ?? defaultThemeSettings.buttonTextColor)
      setBorderColor(data.borderColor ?? defaultThemeSettings.borderColor)
      setMenuBackgroundColor(data.menuBackgroundColor ?? defaultThemeSettings.menuBackgroundColor)
      setFooterTextColor(data.footerTextColor ?? defaultThemeSettings.footerTextColor)
      setAccentColor(data.accentColor ?? defaultThemeSettings.accentColor)
      setLogoPosition(data.logoPosition || defaultThemeSettings.logoPosition)
      setLogoSize(clampLogoSize(data.logoSize ?? defaultThemeSettings.logoSize))
      setLogoSpacingTop(clampSpacing(data.logoSpacingTop ?? defaultThemeSettings.logoSpacingTop))
      setLogoSpacingSide(clampSpacing(data.logoSpacingSide ?? defaultThemeSettings.logoSpacingSide))
      setHeroAlign(data.heroAlign || defaultThemeSettings.heroAlign)
      setHeroPaddingScale(
        clampScaleFactor(data.heroPaddingScale ?? defaultThemeSettings.heroPaddingScale),
      )
      setSectionSpacingScale(
        clampScaleFactor(data.sectionSpacingScale ?? defaultThemeSettings.sectionSpacingScale),
      )
      setButtonSize(data.buttonSize || defaultThemeSettings.buttonSize)
      setTextScale(clampTextScale(data.textScale ?? defaultThemeSettings.textScale))
      setHeroTitleColor(data.heroTitleColor ?? defaultThemeSettings.heroTitleColor)
      setHeroTextEnColor(data.heroTextEnColor ?? defaultThemeSettings.heroTextEnColor)
      setHeroTextArColor(data.heroTextArColor ?? defaultThemeSettings.heroTextArColor)
      setHeroHoursBgColor(data.heroHoursBgColor ?? defaultThemeSettings.heroHoursBgColor)
      setHeroHoursBorderColor(
        data.heroHoursBorderColor ?? defaultThemeSettings.heroHoursBorderColor,
      )
      setHeroHoursTextColor(data.heroHoursTextColor ?? defaultThemeSettings.heroHoursTextColor)
      setHeroDownArrowColor(data.heroDownArrowColor ?? defaultThemeSettings.heroDownArrowColor)
      setHeroImageError(false)
      setLogoImageError(false)
    } catch (themeError) {
      console.error(themeError)
      setError('تعذر تحميل إعدادات المظهر')
    } finally {
      setThemeLoading(false)
    }
  }

  async function saveThemeSettings(event) {
    event.preventDefault()
    if (savingThemeLock.current) return
    savingThemeLock.current = true

    setSavingTheme(true)
    setError('')
    setThemeMessage('')

    try {
      const finalHeroBackgroundUrl = convertGoogleDriveLink(
        heroBackgroundUrl.trim(),
      )
      const finalLogoUrl = convertGoogleDriveLink(logoUrl.trim())

      await setDoc(
        themeSettingsDocRef(currentBranchId),
        {
          heroBackgroundUrl: finalHeroBackgroundUrl,
          logoUrl: finalLogoUrl,
          pageBackgroundColor,
          heroBackgroundColor,
          primaryColor,
          buttonColor,
          priceBackgroundColor,
          priceTextColor,
          headingColor,
          textColor,
          mutedTextColor,
          navigationBackgroundColor,
          footerBackgroundColor,
          arabicFont,
          englishFont,
          heroOverlayOpacity: Number(heroOverlayOpacity),
          heroScale: heroCrop.scale,
          heroOffsetX: heroCrop.offsetX,
          heroOffsetY: heroCrop.offsetY,
          heroCropRatio,
          logoScale: logoCrop.scale,
          logoOffsetX: logoCrop.offsetX,
          logoOffsetY: logoCrop.offsetY,
          logoFit,
          buttonTextColor,
          borderColor,
          menuBackgroundColor,
          footerTextColor,
          accentColor,
          logoPosition,
          logoSize: clampLogoSize(logoSize),
          logoSpacingTop: clampSpacing(logoSpacingTop),
          logoSpacingSide: clampSpacing(logoSpacingSide),
          heroAlign,
          heroPaddingScale: clampScaleFactor(heroPaddingScale),
          sectionSpacingScale: clampScaleFactor(sectionSpacingScale),
          buttonSize,
          textScale: clampTextScale(textScale),
          heroTitleColor,
          heroTextEnColor,
          heroTextArColor,
          heroHoursBgColor,
          heroHoursBorderColor,
          heroHoursTextColor,
          heroDownArrowColor,
        },
        { merge: true },
      )

      setHeroBackgroundUrl(finalHeroBackgroundUrl)
      setLogoUrl(finalLogoUrl)

      setThemeMessage('تم حفظ إعدادات المظهر بنجاح')
    } catch (saveError) {
      console.error(saveError)
      setError('صار خطأ أثناء حفظ إعدادات المظهر')
    } finally {
      savingThemeLock.current = false
      setSavingTheme(false)
    }
  }

  function resetHeroImageAdjustment() {
    setHeroCrop(defaultImageCrop())
    setHeroCropRatio(defaultThemeSettings.heroCropRatio)
  }

  function resetLogoImageAdjustment() {
    setLogoCrop(defaultImageCrop())
    setLogoFit(defaultThemeSettings.logoFit)
  }

  function resetLayoutSettings() {
    setLogoPosition(defaultThemeSettings.logoPosition)
    setLogoSize(defaultThemeSettings.logoSize)
    setLogoSpacingTop(defaultThemeSettings.logoSpacingTop)
    setLogoSpacingSide(defaultThemeSettings.logoSpacingSide)
    setHeroAlign(defaultThemeSettings.heroAlign)
    setHeroPaddingScale(defaultThemeSettings.heroPaddingScale)
    setSectionSpacingScale(defaultThemeSettings.sectionSpacingScale)
    setButtonSize(defaultThemeSettings.buttonSize)
    setTextScale(defaultThemeSettings.textScale)
  }

  // Weekdays = Sun–Thu, Weekend = Fri–Sat, matching the Gulf work week (this
  // site's default currency/content is Bahrain-oriented) rather than the
  // Mon–Fri/Sat–Sun convention.
  function applyWeekdayPreset() {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      for (const key of ['sun', 'mon', 'tue', 'wed', 'thu']) {
        next[key] = { closed: false, open: weekdayPreset.open, close: weekdayPreset.close }
      }
      return next
    })
  }

  function applyWeekendPreset() {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      for (const key of ['fri', 'sat']) {
        next[key] = { closed: false, open: weekendPreset.open, close: weekendPreset.close }
      }
      return next
    })
  }

  function updateDayHours(key, patch) {
    setWeeklyHours((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function updateHeroHoursRow(rowKey, patch) {
    setHeroHours((prev) => ({ ...prev, [rowKey]: { ...prev[rowKey], ...patch } }))
  }

  async function loadContactSettings() {
    setContactLoading(true)
    setContactMessage('')

    try {
      const contactDoc = await getDoc(contactSettingsDocRef(currentBranchId))

      const data = contactDoc.exists() ? contactDoc.data() : {}

      setPhone(data.phone ?? defaultContactSettings.phone)
      setWhatsapp(data.whatsapp ?? defaultContactSettings.whatsapp)
      setContactEmail(data.email ?? defaultContactSettings.email)
      setWebsite(data.website ?? defaultContactSettings.website)
      setAddress(data.address ?? defaultContactSettings.address)
      setGoogleMapsUrl(
        data.googleMapsUrl ?? defaultContactSettings.googleMapsUrl,
      )
      setInstagramUrl(
        data.instagramUrl ?? defaultContactSettings.instagramUrl,
      )
      setTiktokUrl(
        data.tiktokUrl ?? defaultContactSettings.tiktokUrl,
      )
      setSnapchatUrl(
        data.snapchatUrl ?? defaultContactSettings.snapchatUrl,
      )
      setXUrl(data.xUrl ?? defaultContactSettings.xUrl)
      setFacebookUrl(
        data.facebookUrl ?? defaultContactSettings.facebookUrl,
      )
    } catch (contactError) {
      console.error(contactError)
      setError('تعذر تحميل بيانات التواصل')
    } finally {
      setContactLoading(false)
    }
  }

  async function saveContactSettings(event) {
    event.preventDefault()
    if (savingContactLock.current) return
    savingContactLock.current = true

    setSavingContact(true)
    setError('')
    setContactMessage('')

    try {
      await setDoc(
        contactSettingsDocRef(currentBranchId),
        {
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          email: contactEmail.trim(),
          website: website.trim(),
          address: address.trim(),
          googleMapsUrl: googleMapsUrl.trim(),
          instagramUrl: instagramUrl.trim(),
          tiktokUrl: tiktokUrl.trim(),
          snapchatUrl: snapchatUrl.trim(),
          xUrl: xUrl.trim(),
          facebookUrl: facebookUrl.trim(),
        },
        { merge: true },
      )

      setContactMessage('تم حفظ بيانات التواصل بنجاح')
    } catch (saveError) {
      console.error(saveError)
      setError('صار خطأ أثناء حفظ بيانات التواصل')
    } finally {
      savingContactLock.current = false
      setSavingContact(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    if (loginLock.current) return
    loginLock.current = true

    setError('')
    setSubmitting(true)

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      )
    } catch (loginError) {
      console.error(loginError)
      setError('الإيميل أو كلمة المرور غير صحيحة')
    } finally {
      loginLock.current = false
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    setError('')

    try {
      await signOut(auth)
    } catch (logoutError) {
      console.error(logoutError)
      setError('تعذر تسجيل الخروج، حاول مرة ثانية')
    }
  }

  async function uploadMenu() {
    const confirmed = window.confirm(
      'سيتم رفع أو تحديث بيانات المنيو الأساسية في Firebase. لن يتم حذف الصور أو حالة الظهور الحالية للمنتجات أو الأقسام الموجودة. هل تريد المتابعة؟',
    )

    if (!confirmed) return

    setUploadingMenu(true)
    setUploadMessage('')
    setError('')

    try {
      for (
        let sectionIndex = 0;
        sectionIndex < menuSections.length;
        sectionIndex += 1
      ) {
        const section = menuSections[sectionIndex]

        const categoryRef = categoryDocRef(currentBranchId, section.id)
        const existingCategorySnap = await getDoc(categoryRef)
        const existingCategoryData = existingCategorySnap.exists()
          ? existingCategorySnap.data()
          : null

        const categoryData = {
          nameEn: section.titleEn,
          nameAr: section.titleAr,
          order: sectionIndex + 1,
        }

        if (
          !existingCategoryData ||
          existingCategoryData.visible === undefined
        ) {
          categoryData.visible = true
        }

        await setDoc(categoryRef, categoryData, { merge: true })

        for (
          let productIndex = 0;
          productIndex < section.products.length;
          productIndex += 1
        ) {
          const product = section.products[productIndex]
          const productId = slugifyName(product.nameEn)

          const productRef = productDocRef(currentBranchId, section.id, productId)

          const existingSnap = await getDoc(productRef)
          const existingData = existingSnap.exists()
            ? existingSnap.data()
            : null

          const productData = {
            nameEn: product.nameEn,
            nameAr: product.nameAr,
            price: product.price,
            order: productIndex + 1,
          }

          if (!existingData || existingData.imageUrl === undefined) {
            productData.imageUrl = ''
          }

          if (!existingData || existingData.visible === undefined) {
            productData.visible = true
          }

          await setDoc(productRef, productData, { merge: true })
        }
      }

      setUploadMessage('تم رفع المنيو كاملة إلى Firebase بنجاح')
    } catch (uploadError) {
      console.error(uploadError)
      setError('صار خطأ أثناء رفع المنيو، حاول مرة ثانية')
    } finally {
      setUploadingMenu(false)
    }
  }

  if (loading) {
    return (
      <main className="adminLoading" dir="rtl">
        جاري التحميل...
      </main>
    )
  }

  if (!user) {
    return (
      <main className="adminLoginPage" dir="rtl">
        <form
          className="adminLoginCard"
          onSubmit={handleLogin}
        >
          <div className="adminBrand">
            <span>BLANCO
            </span>
            <small>ADMIN PANEL</small>
          </div>

          <h1>تسجيل دخول الإدارة</h1>

          <p>
            أدخل البريد الإلكتروني وكلمة المرور للمتابعة.
          </p>

          <label>
            البريد الإلكتروني

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="admin@BLANCO.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            كلمة المرور

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <div className="adminError">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'جاري تسجيل الدخول...'
              : 'تسجيل الدخول'}
          </button>

          <a
            href="/"
            className="backToMenu"
          >
            الرجوع إلى المنيو
          </a>
        </form>
      </main>
    )
  }

  const heroPreviewUrl = convertGoogleDriveLink(
    heroBackgroundUrl.trim(),
  )

  const logoPreviewUrl = convertGoogleDriveLink(logoUrl.trim())

  if (view === 'products') {
    return (
      <main className="adminDashboard" dir="rtl">
        <header className="adminTopBar">
          <div>
            <strong>BLANCO</strong>
            <span>لوحة الإدارة · {currentBranchMeta.nameAr || currentBranchMeta.nameEn}</span>
          </div>

          <button type="button" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </header>

        <Suspense fallback={<p className="adminSectionLoading">جاري التحميل...</p>}>
          <ProductsManager onBack={goToDashboard} currency={currency} branchId={currentBranchId} />
        </Suspense>
      </main>
    )
  }

  if (view === 'categories') {
    return (
      <main className="adminDashboard" dir="rtl">
        <header className="adminTopBar">
          <div>
            <strong>BLANCO</strong>
            <span>لوحة الإدارة · {currentBranchMeta.nameAr || currentBranchMeta.nameEn}</span>
          </div>

          <button type="button" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </header>

        <Suspense fallback={<p className="adminSectionLoading">جاري التحميل...</p>}>
          <CategoriesManager onBack={goToDashboard} branchId={currentBranchId} />
        </Suspense>
      </main>
    )
  }

  if (view === 'branches') {
    return (
      <main className="adminDashboard" dir="rtl">
        <header className="adminTopBar">
          <div>
            <strong>BLANCO</strong>
            <span>لوحة الإدارة · {currentBranchMeta.nameAr || currentBranchMeta.nameEn}</span>
          </div>

          <button type="button" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </header>

        <Suspense fallback={<p className="adminSectionLoading">جاري التحميل...</p>}>
          <BranchesManager
            onBack={goToDashboard}
            currentBranchId={currentBranchId}
            onSwitchBranch={switchToBranch}
          />
        </Suspense>
      </main>
    )
  }

  return (
    <main className="adminDashboard" dir="rtl">
      <header className="adminTopBar">
        <div>
          <strong>BLANCO</strong>
          <span>لوحة الإدارة · {currentBranchMeta.nameAr || currentBranchMeta.nameEn}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
        >
          تسجيل الخروج
        </button>
      </header>

      <section className="adminWelcome">
        <h1>مرحبًا بك</h1>
        <p>{user.email}</p>
      </section>

      {view === 'dashboard' && (
        <>
          <section className="menuUploadSection">
            <button
              type="button"
              onClick={uploadMenu}
              disabled={uploadingMenu}
            >
              {uploadingMenu
                ? 'جاري رفع المنيو...'
                : 'رفع وتحديث المنيو في Firebase'}
            </button>

            {uploadMessage && (
              <p className="uploadSuccess">
                {uploadMessage}
              </p>
            )}
          </section>

          {error && (
            <div className="adminDashboardError">
              {error}
            </div>
          )}

          <section className="adminCards">
            <article
              onClick={openProducts}
              style={{ cursor: 'pointer' }}
            >
              <h2>المنتجات</h2>
              <p>
                إضافة المشروبات والحلويات وتعديلها وحذفها.
              </p>
            </article>

            <article
              onClick={openCategories}
              style={{ cursor: 'pointer' }}
            >
              <h2>الأقسام</h2>
              <p>
                إضافة قسم جديد وتعديل الأقسام وحذفها.
              </p>
            </article>

            <article
              onClick={openSiteSettings}
              style={{ cursor: 'pointer' }}
            >
              <h2>إعدادات الموقع</h2>
              <p>
                تعديل اسم الكوفي والترحيب والوصف وساعات العمل والعملة.
              </p>
            </article>

            <article
              onClick={openTheme}
              style={{ cursor: 'pointer' }}
            >
              <h2>المظهر</h2>
              <p>
                تعديل الشعار وخلفية الهيدر والألوان والخطوط.
              </p>
            </article>

            <article
              onClick={openContact}
              style={{ cursor: 'pointer' }}
            >
              <h2>التواصل</h2>
              <p>
                تعديل رقم الهاتف والواتساب وروابط التواصل الاجتماعي.
              </p>
            </article>

            <article
              onClick={openBranches}
              style={{ cursor: 'pointer' }}
            >
              <h2>إدارة الفروع</h2>
              <p>
                إنشاء فروع جديدة والتبديل بينها، كل فرع بمنتجاته وإعداداته الخاصة.
              </p>
            </article>
          </section>
        </>
      )}

      {view === 'settings' && showSiteSettings && (
        <section
          className="adminSiteSettingsSection"
          ref={siteSettingsRef}
        >
          <div className="adminProductsHeader">
            <div>
              <h2>إعدادات الموقع</h2>
              <p>تعديل اسم الكوفي والترحيب والوصف وساعات العمل.</p>
            </div>

            <button
              type="button"
              onClick={goToDashboard}
            >
              الرجوع للوحة الرئيسية
            </button>
          </div>

          {error && (
            <div className="adminDashboardError">
              {error}
            </div>
          )}

          {settingsLoading ? (
            <p>جاري تحميل الإعدادات...</p>
          ) : (
            <form
              className="adminSiteSettingsForm"
              onSubmit={saveSiteSettings}
            >
              <div className="adminSiteSettingsGrid">
                <label>
                  اسم الموقع بالإنجليزي

                  <input
                    type="text"
                    value={siteNameEn}
                    onChange={(event) =>
                      setSiteNameEn(event.target.value)
                    }
                  />
                </label>

                <label>
                  اسم الموقع بالعربي

                  <input
                    type="text"
                    value={siteNameAr}
                    onChange={(event) =>
                      setSiteNameAr(event.target.value)
                    }
                  />
                </label>

                <label>
                  رسالة الترحيب بالإنجليزي

                  <input
                    type="text"
                    value={welcomeEn}
                    onChange={(event) =>
                      setWelcomeEn(event.target.value)
                    }
                  />
                </label>

                <label>
                  رسالة الترحيب بالعربي

                  <input
                    type="text"
                    value={welcomeAr}
                    onChange={(event) =>
                      setWelcomeAr(event.target.value)
                    }
                  />
                </label>

                <label>
                  الوصف بالإنجليزي

                  <textarea
                    value={descriptionEn}
                    onChange={(event) =>
                      setDescriptionEn(event.target.value)
                    }
                  />
                </label>

                <label>
                  الوصف بالعربي

                  <textarea
                    value={descriptionAr}
                    onChange={(event) =>
                      setDescriptionAr(event.target.value)
                    }
                  />
                </label>

                <label>
                  ساعات العمل

                  <input
                    type="text"
                    value={workingHours}
                    onChange={(event) =>
                      setWorkingHours(event.target.value)
                    }
                    placeholder="8:00 AM – 2:00 AM"
                  />
                </label>

                <label>
                  نص الفوتر

                  <input
                    type="text"
                    value={footerText}
                    onChange={(event) =>
                      setFooterText(event.target.value)
                    }
                  />
                </label>

                <label>
                  العملة

                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value)
                    }
                  >
                    {currencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="productVisibleLabel">
                  <input
                    type="checkbox"
                    checked={showPrices}
                    onChange={(event) =>
                      setShowPrices(event.target.checked)
                    }
                  />

                  إظهار الأسعار في المنيو
                </label>

                <label>
                  نص "مفتوح" بالإنجليزي

                  <input
                    type="text"
                    value={openingHoursLabelEn}
                    onChange={(event) => setOpeningHoursLabelEn(event.target.value)}
                  />
                </label>

                <label>
                  نص "مفتوح" بالعربي

                  <input
                    type="text"
                    value={openingHoursLabelAr}
                    onChange={(event) => setOpeningHoursLabelAr(event.target.value)}
                  />
                </label>

                <label>
                  عنوان قسم التواصل بالإنجليزي

                  <input
                    type="text"
                    value={contactHeadingEn}
                    onChange={(event) => setContactHeadingEn(event.target.value)}
                  />
                </label>

                <label>
                  عنوان قسم التواصل بالعربي

                  <input
                    type="text"
                    value={contactHeadingAr}
                    onChange={(event) => setContactHeadingAr(event.target.value)}
                  />
                </label>
              </div>

              <div className="adminWeeklyHoursSection">
                <h3>ساعات العمل الأسبوعية (سجل تفصيلي)</h3>
                <p>
                  حدد وقت الفتح والإغلاق لكل يوم، أو أغلق اليوم بالكامل. هذا الجدول التفصيلي يُحفظ في
                  قاعدة البيانات لكنه لا يظهر للزوار — ما يظهر فعليًا في الموقع هو صندوق ساعات العمل
                  أدناه.
                </p>

                <div className="adminWeeklyPresetsRow">
                  <div className="adminWeeklyPreset">
                    <span>أيام الأسبوع (الأحد - الخميس)</span>
                    <input
                      type="time"
                      value={weekdayPreset.open}
                      onChange={(event) =>
                        setWeekdayPreset((prev) => ({ ...prev, open: event.target.value }))
                      }
                    />
                    <input
                      type="time"
                      value={weekdayPreset.close}
                      onChange={(event) =>
                        setWeekdayPreset((prev) => ({ ...prev, close: event.target.value }))
                      }
                    />
                    <button type="button" onClick={applyWeekdayPreset}>
                      تطبيق على أيام الأسبوع
                    </button>
                  </div>

                  <div className="adminWeeklyPreset">
                    <span>نهاية الأسبوع (الجمعة - السبت)</span>
                    <input
                      type="time"
                      value={weekendPreset.open}
                      onChange={(event) =>
                        setWeekendPreset((prev) => ({ ...prev, open: event.target.value }))
                      }
                    />
                    <input
                      type="time"
                      value={weekendPreset.close}
                      onChange={(event) =>
                        setWeekendPreset((prev) => ({ ...prev, close: event.target.value }))
                      }
                    />
                    <button type="button" onClick={applyWeekendPreset}>
                      تطبيق على نهاية الأسبوع
                    </button>
                  </div>
                </div>

                <div className="adminWeeklyHoursGrid">
                  {dayKeys.map((key) => (
                    <div className="adminWeeklyHoursRow" key={key}>
                      <span className="adminWeeklyDayLabel">{dayLabels[key].ar}</span>

                      <label className="productVisibleLabel">
                        <input
                          type="checkbox"
                          checked={!weeklyHours[key].closed}
                          onChange={(event) =>
                            updateDayHours(key, { closed: !event.target.checked })
                          }
                        />
                        مفتوح
                      </label>

                      <input
                        type="time"
                        value={weeklyHours[key].open}
                        disabled={weeklyHours[key].closed}
                        onChange={(event) => updateDayHours(key, { open: event.target.value })}
                      />

                      <input
                        type="time"
                        value={weeklyHours[key].close}
                        disabled={weeklyHours[key].closed}
                        onChange={(event) => updateDayHours(key, { close: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="adminHeroHoursSection">
                <h3>ساعات العمل الظاهرة في الهيدر</h3>
                <p>
                  هذا هو ما يراه الزوار فعليًا أعلى الموقع — صفّان بحد أقصى، كل صف بعنوان ووقت خاص بك،
                  ويمكن إخفاء أي صف لا تريد عرضه.
                </p>

                {['row1', 'row2'].map((rowKey) => (
                  <div className="adminHeroHoursRow" key={rowKey}>
                    <label className="productVisibleLabel">
                      <input
                        type="checkbox"
                        checked={heroHours[rowKey].visible}
                        onChange={(event) =>
                          updateHeroHoursRow(rowKey, { visible: event.target.checked })
                        }
                      />
                      إظهار هذا الصف
                    </label>

                    <label>
                      العنوان بالإنجليزي
                      <input
                        type="text"
                        value={heroHours[rowKey].labelEn}
                        onChange={(event) =>
                          updateHeroHoursRow(rowKey, { labelEn: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      العنوان بالعربي
                      <input
                        type="text"
                        value={heroHours[rowKey].labelAr}
                        dir="rtl"
                        onChange={(event) =>
                          updateHeroHoursRow(rowKey, { labelAr: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      وقت الفتح
                      <input
                        type="time"
                        value={heroHours[rowKey].open}
                        onChange={(event) => updateHeroHoursRow(rowKey, { open: event.target.value })}
                      />
                    </label>

                    <label>
                      وقت الإغلاق
                      <input
                        type="time"
                        value={heroHours[rowKey].close}
                        onChange={(event) => updateHeroHoursRow(rowKey, { close: event.target.value })}
                      />
                    </label>
                  </div>
                ))}
              </div>

              {settingsMessage && (
                <p className="uploadSuccess">
                  {settingsMessage}
                </p>
              )}

              <div className="adminProductFormButtons">
                <button
                  type="submit"
                  disabled={savingSettings}
                >
                  {savingSettings
                    ? 'جاري الحفظ...'
                    : 'حفظ الإعدادات'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {view === 'theme' && (
        <section
          className="adminThemeSection"
          ref={themeRef}
        >
          <div className="adminProductsHeader">
            <div>
              <h2>المظهر</h2>
              <p>تعديل الشعار وخلفية الهيدر والألوان والخطوط.</p>
            </div>

            <button
              type="button"
              onClick={goToDashboard}
            >
              الرجوع للوحة الرئيسية
            </button>
          </div>

          {error && (
            <div className="adminDashboardError">
              {error}
            </div>
          )}

          {themeLoading ? (
            <p>جاري تحميل إعدادات المظهر...</p>
          ) : (
            <form
              className="adminThemeForm"
              onSubmit={saveThemeSettings}
            >
              <div className="adminImageAdjustGroup adminHeroImageGroup">
                <label className="adminImageUrlLabel">
                  رابط خلفية الهيدر

                  <input
                    type="text"
                    value={heroBackgroundUrl}
                    onChange={(event) => {
                      setHeroBackgroundUrl(event.target.value)
                      setHeroImageError(false)
                    }}
                    placeholder="https://... أو رابط Google Drive"
                  />
                </label>

                {heroPreviewUrl && (
                  <label>
                    نسبة إطار المعاينة
                    <select value={heroCropRatio} onChange={(event) => setHeroCropRatio(event.target.value)}>
                      {heroCropRatioOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <ImageCropEditor
                  imageUrl={heroImageError ? '' : heroPreviewUrl}
                  value={heroCrop}
                  onChange={setHeroCrop}
                  onReset={resetHeroImageAdjustment}
                  onImageError={() => setHeroImageError(true)}
                  shape={heroCropRatio}
                  emptyLabel="لا توجد خلفية"
                />
                {heroImageError && <p className="adminError">تعذر تحميل الصورة، تأكد من صحة الرابط</p>}
              </div>

              <div className="adminImageAdjustGroup adminLogoImageGroup">
                <label className="adminImageUrlLabel">
                  رابط الشعار

                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(event) => {
                      setLogoUrl(event.target.value)
                      setLogoImageError(false)
                    }}
                    placeholder="https://... أو رابط Google Drive"
                  />
                </label>

                <ImageCropEditor
                  imageUrl={logoImageError ? '' : logoPreviewUrl}
                  value={logoCrop}
                  onChange={setLogoCrop}
                  onReset={resetLogoImageAdjustment}
                  onImageError={() => setLogoImageError(true)}
                  fit={logoFit}
                  onFitChange={setLogoFit}
                  shape="square"
                  emptyLabel="لا يوجد شعار"
                />
                {logoImageError && <p className="adminError">تعذر تحميل الصورة، تأكد من صحة الرابط</p>}
              </div>

              <div className="adminSiteSettingsGrid">
                <label>
                  لون خلفية الصفحة

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={pageBackgroundColor}
                      onChange={(event) =>
                        setPageBackgroundColor(event.target.value)
                      }
                    />
                    <span>{pageBackgroundColor}</span>
                  </div>
                </label>

                <label>
                  لون خلفية الهيدر

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroBackgroundColor}
                      onChange={(event) =>
                        setHeroBackgroundColor(event.target.value)
                      }
                    />

                    <span>{heroBackgroundColor}</span>
                  </div>
                </label>

                <label>
                  اللون الأساسي

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(event) =>
                        setPrimaryColor(event.target.value)
                      }
                    />
                    <span>{primaryColor}</span>
                  </div>
                </label>

                <label>
                  لون الأزرار

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={buttonColor}
                      onChange={(event) =>
                        setButtonColor(event.target.value)
                      }
                    />
                    <span>{buttonColor}</span>
                  </div>
                </label>

                <label>
                  لون خلفية السعر

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={priceBackgroundColor}
                      onChange={(event) =>
                        setPriceBackgroundColor(event.target.value)
                      }
                    />
                    <span>{priceBackgroundColor}</span>
                  </div>
                </label>

                <label>
                  لون نص السعر

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={priceTextColor}
                      onChange={(event) =>
                        setPriceTextColor(event.target.value)
                      }
                    />
                    <span>{priceTextColor}</span>
                  </div>
                </label>

                <label>
                  لون العناوين

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={headingColor}
                      onChange={(event) =>
                        setHeadingColor(event.target.value)
                      }
                    />
                    <span>{headingColor}</span>
                  </div>
                </label>

                <label>
                  لون النصوص

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(event) =>
                        setTextColor(event.target.value)
                      }
                    />
                    <span>{textColor}</span>
                  </div>
                </label>

                <label>
                  لون النصوص الثانوية

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={mutedTextColor}
                      onChange={(event) =>
                        setMutedTextColor(event.target.value)
                      }
                    />
                    <span>{mutedTextColor}</span>
                  </div>
                </label>

                <label>
                  لون خلفية شريط التنقل

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={navigationBackgroundColor}
                      onChange={(event) =>
                        setNavigationBackgroundColor(event.target.value)
                      }
                    />
                    <span>{navigationBackgroundColor}</span>
                  </div>
                </label>

                <label>
                  لون خلفية الفوتر

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={footerBackgroundColor}
                      onChange={(event) =>
                        setFooterBackgroundColor(event.target.value)
                      }
                    />
                    <span>{footerBackgroundColor}</span>
                  </div>
                </label>

                <label>
                  لون نص الأزرار

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={buttonTextColor}
                      onChange={(event) => setButtonTextColor(event.target.value)}
                    />
                    <span>{buttonTextColor}</span>
                  </div>
                </label>

                <label>
                  لون الحدود

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(event) => setBorderColor(event.target.value)}
                    />
                    <span>{borderColor}</span>
                  </div>
                </label>

                <label>
                  لون خلفية قسم المنيو

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={menuBackgroundColor}
                      onChange={(event) => setMenuBackgroundColor(event.target.value)}
                    />
                    <span>{menuBackgroundColor}</span>
                  </div>
                </label>

                <label>
                  لون نص الفوتر

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={footerTextColor}
                      onChange={(event) => setFooterTextColor(event.target.value)}
                    />
                    <span>{footerTextColor}</span>
                  </div>
                </label>

                <label>
                  اللون المميز (Accent)

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(event) => setAccentColor(event.target.value)}
                    />
                    <span>{accentColor}</span>
                  </div>
                </label>
              </div>

              <h3 className="adminSubheading">ألوان الهيدر الرئيسي</h3>
              <p className="adminSubheadingHint">
                تحكم مستقل بكل عنصر في صورة الهيدر — لا تؤثر هذه الألوان على أي فرع آخر.
              </p>

              <div className="adminSiteSettingsGrid">
                <label>
                  لون العنوان الرئيسي (BLANCO)

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroTitleColor}
                      onChange={(event) => setHeroTitleColor(event.target.value)}
                    />
                    <span>{heroTitleColor}</span>
                  </div>
                </label>

                <label>
                  لون النص الإنجليزي

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroTextEnColor}
                      onChange={(event) => setHeroTextEnColor(event.target.value)}
                    />
                    <span>{heroTextEnColor}</span>
                  </div>
                </label>

                <label>
                  لون النص العربي

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroTextArColor}
                      onChange={(event) => setHeroTextArColor(event.target.value)}
                    />
                    <span>{heroTextArColor}</span>
                  </div>
                </label>

                <label>
                  لون خلفية صندوق ساعات العمل

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroHoursBgColor}
                      onChange={(event) => setHeroHoursBgColor(event.target.value)}
                    />
                    <span>{heroHoursBgColor}</span>
                  </div>
                </label>

                <label>
                  لون حدود صندوق ساعات العمل

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroHoursBorderColor}
                      onChange={(event) => setHeroHoursBorderColor(event.target.value)}
                    />
                    <span>{heroHoursBorderColor}</span>
                  </div>
                </label>

                <label>
                  لون نصوص ساعات العمل (العنوان والوقت)

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroHoursTextColor}
                      onChange={(event) => setHeroHoursTextColor(event.target.value)}
                    />
                    <span>{heroHoursTextColor}</span>
                  </div>
                </label>

                <label>
                  لون سهم النزول للأسفل

                  <div className="adminColorInputRow">
                    <input
                      type="color"
                      value={heroDownArrowColor}
                      onChange={(event) => setHeroDownArrowColor(event.target.value)}
                    />
                    <span>{heroDownArrowColor}</span>
                  </div>
                </label>
              </div>

              <div className="adminSiteSettingsGrid">
                <label>
                  الخط العربي

                  <select
                    value={arabicFont}
                    onChange={(event) =>
                      setArabicFont(event.target.value)
                    }
                  >
                    {arabicFontOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  الخط الإنجليزي

                  <select
                    value={englishFont}
                    onChange={(event) =>
                      setEnglishFont(event.target.value)
                    }
                  >
                    {englishFontOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                شفافية تغطية الهيدر: {heroOverlayOpacity}

                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={heroOverlayOpacity}
                  onChange={(event) =>
                    setHeroOverlayOpacity(event.target.value)
                  }
                />
              </label>

              <div className="adminLayoutSection">
                <div className="adminProductsHeader">
                  <h3>تخطيط الصفحة الرئيسية</h3>
                  <button type="button" className="adminResetImageButton" onClick={resetLayoutSettings}>
                    إعادة ضبط التخطيط
                  </button>
                </div>

                <div className="adminSiteSettingsGrid">
                  <label>
                    موضع الشعار

                    <select value={logoPosition} onChange={(event) => setLogoPosition(event.target.value)}>
                      {logoPositionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    محاذاة محتوى الهيدر

                    <select value={heroAlign} onChange={(event) => setHeroAlign(event.target.value)}>
                      {heroAlignOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    حجم الأزرار

                    <select value={buttonSize} onChange={(event) => setButtonSize(event.target.value)}>
                      {buttonSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  حجم الشعار: {logoSize}px
                  <input
                    type="range"
                    min="40"
                    max="200"
                    step="2"
                    value={logoSize}
                    onChange={(event) => setLogoSize(event.target.value)}
                  />
                </label>

                <label>
                  المسافة العلوية للشعار: {logoSpacingTop}px
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="2"
                    value={logoSpacingTop}
                    onChange={(event) => setLogoSpacingTop(event.target.value)}
                  />
                </label>

                <label>
                  المسافة الجانبية للشعار: {logoSpacingSide}px
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="2"
                    value={logoSpacingSide}
                    onChange={(event) => setLogoSpacingSide(event.target.value)}
                  />
                </label>

                <label>
                  تباعد الهيدر الرأسي: {Math.round(heroPaddingScale * 100)}%
                  <input
                    type="range"
                    min="0.6"
                    max="1.6"
                    step="0.05"
                    value={heroPaddingScale}
                    onChange={(event) => setHeroPaddingScale(event.target.value)}
                  />
                </label>

                <label>
                  تباعد الأقسام: {Math.round(sectionSpacingScale * 100)}%
                  <input
                    type="range"
                    min="0.6"
                    max="1.6"
                    step="0.05"
                    value={sectionSpacingScale}
                    onChange={(event) => setSectionSpacingScale(event.target.value)}
                  />
                </label>

                <label>
                  حجم النصوص: {Math.round(textScale * 100)}%
                  <input
                    type="range"
                    min="0.85"
                    max="1.15"
                    step="0.01"
                    value={textScale}
                    onChange={(event) => setTextScale(event.target.value)}
                  />
                </label>
              </div>

              {themeMessage && (
                <p className="uploadSuccess">
                  {themeMessage}
                </p>
              )}

              <div className="adminProductFormButtons">
                <button
                  type="submit"
                  disabled={savingTheme}
                >
                  {savingTheme
                    ? 'جاري الحفظ...'
                    : 'حفظ إعدادات المظهر'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {view === 'contact' && (
        <section
          className="adminContactSection"
          ref={contactRef}
        >
          <div className="adminProductsHeader">
            <div>
              <h2>التواصل</h2>
              <p>تعديل رقم الهاتف والواتساب وروابط التواصل الاجتماعي.</p>
            </div>

            <button
              type="button"
              onClick={goToDashboard}
            >
              الرجوع للوحة الرئيسية
            </button>
          </div>

          {error && (
            <div className="adminDashboardError">
              {error}
            </div>
          )}

          {contactLoading ? (
            <p>جاري تحميل بيانات التواصل...</p>
          ) : (
            <form
              className="adminContactForm"
              onSubmit={saveContactSettings}
            >
              <div className="adminSiteSettingsGrid">
                <label>
                  رقم الهاتف

                  <input
                    type="text"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                  />
                </label>

                <label>
                  رقم الواتساب

                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(event) =>
                      setWhatsapp(event.target.value)
                    }
                  />
                </label>

                <label>
                  البريد الإلكتروني

                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                  />
                </label>

                <label>
                  رابط الموقع الإلكتروني

                  <input
                    type="text"
                    value={website}
                    placeholder="example.com"
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </label>

                <label>
                  العنوان

                  <input
                    type="text"
                    value={address}
                    dir="rtl"
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </label>

                <label>
                  رابط خرائط جوجل

                  <input
                    type="text"
                    value={googleMapsUrl}
                    onChange={(event) =>
                      setGoogleMapsUrl(event.target.value)
                    }
                  />
                </label>

                <label>
                  رابط انستغرام

                  <input
                    type="text"
                    value={instagramUrl}
                    onChange={(event) =>
                      setInstagramUrl(event.target.value)
                    }
                  />
                </label>

                <label>
                  رابط تيك توك

                  <input
                    type="text"
                    value={tiktokUrl}
                    onChange={(event) =>
                      setTiktokUrl(event.target.value)
                    }
                  />
                </label>

                <label>
                  رابط سناب شات

                  <input
                    type="text"
                    value={snapchatUrl}
                    onChange={(event) =>
                      setSnapchatUrl(event.target.value)
                    }
                  />
                </label>

                <label>
                  رابط اكس (تويتر)

                  <input
                    type="text"
                    value={xUrl}
                    onChange={(event) =>
                      setXUrl(event.target.value)
                    }
                  />
                </label>

                <label>
                  رابط فيسبوك

                  <input
                    type="text"
                    value={facebookUrl}
                    onChange={(event) =>
                      setFacebookUrl(event.target.value)
                    }
                  />
                </label>
              </div>

              {contactMessage && (
                <p className="uploadSuccess">
                  {contactMessage}
                </p>
              )}

              <div className="adminProductFormButtons">
                <button
                  type="submit"
                  disabled={savingContact}
                >
                  {savingContact
                    ? 'جاري الحفظ...'
                    : 'حفظ بيانات التواصل'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </main>
  )
}

export default Admin
