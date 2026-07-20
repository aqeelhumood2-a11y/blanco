
import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { getDocs, getDoc } from 'firebase/firestore'
import './App.css'

import { menuSections } from './menuData.js'
import { applyAdminSeo, applyPublicSeo } from './seo.js'
import InstallPrompt from './pwa/InstallPrompt.jsx'
import PwaUpdatePrompt from './pwa/PwaUpdatePrompt.jsx'
import { usePwaUpdate } from './pwa/usePwaUpdate.js'
import {
  clampImageOffset,
  clampImageScale,
  clampLogoSize,
  clampScaleFactor,
  clampSpacing,
  clampTextScale,
  convertGoogleDriveLink,
  defaultContactSettings,
  defaultHeroHours,
  defaultSiteSettings,
  defaultThemeSettings,
  getActivePrice,
  imageCropToStyle,
  isProductVisibleNow,
  migrateLegacyThemeColors,
  normalizeHeroHours,
  normalizeWeeklyHours,
} from './admin/utils/adminUtils.js'
import {
  DEFAULT_BRANCH_ID,
  branchDocRef,
  categoriesCollectionRef,
  contactSettingsDocRef,
  normalizeBranch,
  productsCollectionRef,
  siteSettingsDocRef,
  themeSettingsDocRef,
} from './admin/utils/branchPaths.js'

// Code-split: the admin panel (product/category managers, drag-and-drop,
// image crop editors, QR generation, ...) is a large bundle that only the
// handful of logged-in admins ever need — lazy-loading it keeps every
// public menu visitor's initial download small.
const Admin = lazy(() => import('./Admin.jsx'))

// /menu/:code opens that branch's independent menu; anything else (including
// the bare "/") falls back to the original/default branch so every link
// that worked before branches existed keeps working unchanged.
function parseBranchIdFromPath(pathname) {
  const menuMatch = pathname.match(/^\/menu\/([a-z0-9-]+)\/?$/)
  return menuMatch ? menuMatch[1] : DEFAULT_BRANCH_ID
}

// siteSettings/themeSettings/contactSettings all use the same shape the
// admin panel edits and saves — a single shared source of defaults instead
// of a second, easily-drifting copy of every field.
const DEFAULT_SITE_SETTINGS = { ...defaultSiteSettings, weeklyHours: null, heroHours: defaultHeroHours() }
const DEFAULT_THEME_SETTINGS = defaultThemeSettings
const DEFAULT_CONTACT_SETTINGS = defaultContactSettings

// Removes spaces, plus signs, dashes and parentheses from a WhatsApp number.
function normalizeWhatsappNumber(rawNumber) {
  if (!rawNumber || typeof rawNumber !== 'string') {
    return ''
  }

  return rawNumber
    .replace(/\s+/g, '')
    .replace(/\+/g, '')
    .replace(/-/g, '')
    .replace(/[()]/g, '')
}

function ProductImage({ src, alt, crop, onClick, failed, onError }) {
  const resolvedSrc = convertGoogleDriveLink(src)
  const isClickable = Boolean(resolvedSrc) && !failed

  function handleKeyDown(event) {
    if (!isClickable) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  if (!resolvedSrc || failed) {
    return (
      <div className="productImage productImagePlaceholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path
            d="M4 8h13v5.2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"
            strokeLinejoin="round"
          />
          <path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 4.5c-.6.6-.6 1.4 0 2M12 4.5c-.6.6-.6 1.4 0 2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  return (
    <div
      className={`productImage${isClickable ? ' hasImage' : ''}`}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <img
        className="productPhoto"
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        style={imageCropToStyle(crop)}
        onError={onError}
      />
    </div>
  )
}

function ImageLightbox({ imageUrl, alt, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  if (!imageUrl) {
    return null
  }

  return (
    <div className="lightboxOverlay" onClick={onClose}>
      <button
        type="button"
        className="lightboxCloseButton"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
        aria-label="Close"
      >
        ×
      </button>

      <img
        className="lightboxImage"
        src={imageUrl}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}

function App() {
  const [firebaseMenu, setFirebaseMenu] = useState(menuSections)
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState('')
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS)
  const [themeSettings, setThemeSettings] = useState(DEFAULT_THEME_SETTINGS)
  const [themeLoading, setThemeLoading] = useState(true)
  const [contactSettings, setContactSettings] = useState(
    DEFAULT_CONTACT_SETTINGS,
  )
  const [lightboxImage, setLightboxImage] = useState(null)
  const [failedImages, setFailedImages] = useState({})
  const [logoFailed, setLogoFailed] = useState(false)
  const [branchState, setBranchState] = useState({ status: 'loading', branch: null })
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const pwaUpdate = usePwaUpdate()

  const isAdminPage = window.location.pathname === '/admin'
  const branchId = parseBranchIdFromPath(window.location.pathname)

  const closeLightbox = useCallback(() => {
    setLightboxImage(null)
  }, [])

  // Retry a corrected logo URL instead of staying stuck on the previous failure.
  useEffect(() => {
    setLogoFailed(false)
  }, [themeSettings.logoUrl])

  // Drives the header's transparent-over-hero → cream/blur/shadow transition
  // as the visitor scrolls; purely presentational, no data or routing effect.
  useEffect(() => {
    if (isAdminPage) {
      return
    }

    function handleScroll() {
      setIsHeaderScrolled(window.scrollY > 24)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [isAdminPage])

  useEffect(() => {
    if (isAdminPage) {
      setMenuLoading(false)
      return
    }

    let cancelled = false

    async function loadBranchMeta() {
      if (branchId === DEFAULT_BRANCH_ID) {
        if (!cancelled) setBranchState({ status: 'ok', branch: null })
        return
      }

      try {
        const branchSnapshot = await getDoc(branchDocRef(branchId))

        if (cancelled) return

        if (!branchSnapshot.exists()) {
          setBranchState({ status: 'not-found', branch: null })
          return
        }

        const branch = normalizeBranch({ id: branchSnapshot.id, ...branchSnapshot.data() })

        setBranchState({
          status: branch.status === 'active' ? 'ok' : 'unavailable',
          branch,
        })
      } catch (branchError) {
        console.error(branchError)
        if (!cancelled) setBranchState({ status: 'ok', branch: null })
      }
    }

    async function loadSiteSettings() {
      try {
        const settingsSnapshot = await getDoc(
          siteSettingsDocRef(branchId),
        )

        if (!cancelled && settingsSnapshot.exists()) {
          const data = settingsSnapshot.data()

          setSiteSettings({
            ...DEFAULT_SITE_SETTINGS,
            ...data,
            showPrices:
              typeof data.showPrices === 'boolean'
                ? data.showPrices
                : DEFAULT_SITE_SETTINGS.showPrices,
            // null (not the default object) is the "never configured" signal
            // the public site uses to fall back to the legacy workingHours
            // free-text string instead of a per-day schedule. Still loaded
            // and kept in Firestore for backward compatibility, but no
            // longer rendered anywhere on the public site (see heroHours).
            weeklyHours: normalizeWeeklyHours(data.weeklyHours),
            heroHours: normalizeHeroHours(data.heroHours),
          })
        }
      } catch (settingsError) {
        console.error(settingsError)
      }
    }

    async function loadThemeSettings() {
      setThemeLoading(true)
      try {
        const themeSnapshot = await getDoc(themeSettingsDocRef(branchId))

        if (!cancelled && themeSnapshot.exists()) {
          const rawData = themeSnapshot.data()
          const data =
            branchId === DEFAULT_BRANCH_ID
              ? migrateLegacyThemeColors(rawData)
              : rawData

          setThemeSettings({
            ...DEFAULT_THEME_SETTINGS,
            ...data,
            heroOverlayOpacity:
              typeof data.heroOverlayOpacity === 'number'
                ? data.heroOverlayOpacity
                : DEFAULT_THEME_SETTINGS.heroOverlayOpacity,
            logoFit: data.logoFit === 'cover' ? 'cover' : DEFAULT_THEME_SETTINGS.logoFit,
            logoPosition: data.logoPosition || DEFAULT_THEME_SETTINGS.logoPosition,
            heroAlign: data.heroAlign || DEFAULT_THEME_SETTINGS.heroAlign,
            buttonSize: data.buttonSize || DEFAULT_THEME_SETTINGS.buttonSize,
            logoSize: clampLogoSize(data.logoSize ?? DEFAULT_THEME_SETTINGS.logoSize),
            logoSpacingTop: clampSpacing(data.logoSpacingTop ?? DEFAULT_THEME_SETTINGS.logoSpacingTop),
            logoSpacingSide: clampSpacing(data.logoSpacingSide ?? DEFAULT_THEME_SETTINGS.logoSpacingSide),
            heroPaddingScale: clampScaleFactor(
              data.heroPaddingScale ?? DEFAULT_THEME_SETTINGS.heroPaddingScale,
            ),
            sectionSpacingScale: clampScaleFactor(
              data.sectionSpacingScale ?? DEFAULT_THEME_SETTINGS.sectionSpacingScale,
            ),
            textScale: clampTextScale(data.textScale ?? DEFAULT_THEME_SETTINGS.textScale),
          })
        }
      } catch (themeError) {
        console.error(themeError)
      } finally {
        setThemeLoading(false)
      }
    }

    async function loadContactSettings() {
      try {
        const contactSnapshot = await getDoc(
          contactSettingsDocRef(branchId),
        )

        if (!cancelled && contactSnapshot.exists()) {
          const data = contactSnapshot.data()

          setContactSettings({ ...DEFAULT_CONTACT_SETTINGS, ...data })
        }
      } catch (contactError) {
        console.error(contactError)
      }
    }

    async function loadMenuFromFirebase() {
      setMenuLoading(true)
      setMenuError('')

      try {
        const categoriesSnapshot = await getDocs(
          categoriesCollectionRef(branchId),
        )

        const categories = categoriesSnapshot.docs
          .map((categoryDocument) => ({
            id: categoryDocument.id,
            ...categoryDocument.data(),
          }))
          .filter((category) => category.visible !== false)
          .sort(
            (categoryA, categoryB) =>
              (categoryA.order || 0) - (categoryB.order || 0),
          )

        const sections = await Promise.all(
          categories.map(async (category) => {
            const productsSnapshot = await getDocs(
              productsCollectionRef(branchId, category.id),
            )

            const products = productsSnapshot.docs
              .map((productDocument) => ({
                id: productDocument.id,
                ...productDocument.data(),
              }))
              .filter((product) => isProductVisibleNow(product))
              .sort(
                (productA, productB) =>
                  (productA.order || 0) - (productB.order || 0),
              )

            return {
              id: category.id,
              titleEn: category.nameEn || category.id,
              titleAr: category.nameAr || '',
              imageUrl: category.imageUrl || '',
              imageCrop: category.imageCrop,
              products,
            }
          }),
        )

        const visibleSections = sections.filter(
          (section) => section.products.length > 0,
        )

        if (!cancelled) {
          // The bundled sample menu is only ever a placeholder for the
          // original/default branch's very first load — any other branch
          // with zero categories is a genuinely empty menu, not a demo.
          setFirebaseMenu(
            categoriesSnapshot.empty && branchId === DEFAULT_BRANCH_ID
              ? menuSections
              : visibleSections,
          )
        }
      } catch (loadError) {
        console.error(loadError)

        if (!cancelled) {
          setMenuError('تعذر تحديث المنيو، تم عرض القائمة المحفوظة.')
        }
      } finally {
        if (!cancelled) {
          setMenuLoading(false)
        }
      }
    }

    loadBranchMeta()
    loadSiteSettings()
    loadThemeSettings()
    loadContactSettings()
    loadMenuFromFirebase()

    return () => {
      cancelled = true
    }
  }, [isAdminPage, branchId])

  useEffect(() => {
    if (isAdminPage) {
      applyAdminSeo()
      return
    }

    if (branchState.status !== 'ok' || themeLoading) {
      return
    }

    const canonicalUrl =
      branchId === DEFAULT_BRANCH_ID
        ? `${window.location.origin}/`
        : `${window.location.origin}/menu/${branchState.branch?.code || branchId}`

    const image =
      convertGoogleDriveLink(themeSettings.heroBackgroundUrl) ||
      convertGoogleDriveLink(themeSettings.logoUrl) ||
      ''

    applyPublicSeo({
      siteNameEn: siteSettings.siteNameEn,
      siteNameAr: siteSettings.siteNameAr,
      descriptionEn: siteSettings.descriptionEn,
      phone: contactSettings.phone,
      address: branchState.branch?.address,
      imageUrl: image,
      canonicalUrl,
      weeklyHours: siteSettings.weeklyHours,
    })
  }, [
    isAdminPage,
    branchId,
    branchState,
    themeLoading,
    siteSettings,
    themeSettings,
    contactSettings,
  ])

  if (isAdminPage) {
    return (
      <Suspense fallback={<main className="adminLoading" dir="rtl">جاري التحميل...</main>}>
        <Admin />
      </Suspense>
    )
  }

  if (branchState.status === 'not-found') {
    return (
      <main className="branchNotice">
        <h1>Branch not found | الفرع غير موجود</h1>
        <p>This menu link doesn't match any branch. | لا يوجد فرع مطابق لهذا الرابط.</p>
      </main>
    )
  }

  if (branchState.status === 'unavailable') {
    return (
      <main className="branchNotice">
        <h1>Menu unavailable | القائمة غير متاحة حاليًا</h1>
        <p>This branch's menu isn't published right now. | قائمة هذا الفرع غير منشورة حاليًا.</p>
      </main>
    )
  }

 const firstSectionId = firebaseMenu[0]?.id || ''

  const heroBackgroundUrl = convertGoogleDriveLink(themeSettings.heroBackgroundUrl)
  const heroStyle = {
    backgroundColor: themeSettings.heroBackgroundColor || '#ddd0be',
  }
  const heroBackgroundLayerStyle = {
    backgroundImage: `url(${heroBackgroundUrl})`,
    transform: `scale(${clampImageScale(themeSettings.heroScale)})`,
    transformOrigin: `${clampImageOffset(themeSettings.heroOffsetX)}% ${clampImageOffset(themeSettings.heroOffsetY)}%`,
  }
  const logoUrl = convertGoogleDriveLink(themeSettings.logoUrl)
  const showLogo = Boolean(logoUrl) && !logoFailed
  const logoPosition = themeSettings.logoPosition || 'top-left'
  const resolvedLogoSize = clampLogoSize(themeSettings.logoSize)
  const resolvedLogoSpacingTop = clampSpacing(themeSettings.logoSpacingTop)
  const resolvedLogoSpacingSide = clampSpacing(themeSettings.logoSpacingSide)
  const logoCropScale = clampImageScale(themeSettings.logoScale)
  const logoStyle = {
    top: `${resolvedLogoSpacingTop}px`,
    width: `${resolvedLogoSize}px`,
    height: `${resolvedLogoSize}px`,
    backgroundColor: themeSettings.logoBackgroundColor || 'transparent',
    objectFit: themeSettings.logoFit === 'cover' ? 'cover' : 'contain',
    objectPosition: `${clampImageOffset(themeSettings.logoOffsetX)}% ${clampImageOffset(themeSettings.logoOffsetY)}%`,
    ...(logoPosition === 'top-right'
      ? { right: `${resolvedLogoSpacingSide}px`, transform: `scale(${logoCropScale})` }
      : logoPosition === 'top-center'
        ? { left: '50%', transform: `translateX(-50%) scale(${logoCropScale})` }
        : { left: `${resolvedLogoSpacingSide}px`, transform: `scale(${logoCropScale})` }),
  }

  const hasContactInfo =
    Boolean(contactSettings.phone) ||
    Boolean(contactSettings.whatsapp) ||
    Boolean(contactSettings.googleMapsUrl) ||
    Boolean(contactSettings.instagramUrl) ||
    Boolean(contactSettings.tiktokUrl) ||
    Boolean(contactSettings.snapchatUrl) ||
    Boolean(contactSettings.xUrl) ||
    Boolean(contactSettings.facebookUrl)

  const hasFooterContactInfo =
    hasContactInfo ||
    Boolean(contactSettings.email) ||
    Boolean(contactSettings.website) ||
    Boolean(contactSettings.address)

  const normalizedWhatsapp = normalizeWhatsappNumber(contactSettings.whatsapp)

  const trimmedWebsite = (contactSettings.website || '').trim()
  const websiteUrl = trimmedWebsite
    ? /^https?:\/\//i.test(trimmedWebsite)
      ? trimmedWebsite
      : `https://${trimmedWebsite}`
    : ''
  const websiteDisplayText = websiteUrl.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')

  const heroAlign = themeSettings.heroAlign === 'center' ? 'center' : 'left'
  const buttonSize = themeSettings.buttonSize || 'md'
  const buttonSizing = {
    sm: { padding: '9px 18px', fontSize: '12px' },
    md: { padding: '12px 24px', fontSize: '14px' },
    lg: { padding: '15px 30px', fontSize: '16px' },
  }[buttonSize]

  const heroHoursRows = siteSettings.heroHours
    ? [siteSettings.heroHours.row1, siteSettings.heroHours.row2].filter((row) => row?.visible)
    : []

  const rootStyle = {
    '--page-background': themeSettings.pageBackgroundColor,
    '--primary-color': themeSettings.primaryColor,
    '--button-color': themeSettings.buttonColor,
    '--button-text-color': themeSettings.buttonTextColor,
    '--price-background': themeSettings.priceBackgroundColor,
    '--price-text-color': themeSettings.priceTextColor,
    '--heading-color': themeSettings.headingColor,
    '--text-color': themeSettings.textColor,
    '--muted-text-color': themeSettings.mutedTextColor,
    '--navigation-background': themeSettings.navigationBackgroundColor,
    '--footer-background': themeSettings.footerBackgroundColor,
    '--footer-text-color': themeSettings.footerTextColor,
    '--border-color': themeSettings.borderColor,
    '--menu-background': themeSettings.menuBackgroundColor,
    '--accent-color': themeSettings.accentColor,
    '--english-font': themeSettings.englishFont,
    '--arabic-font': themeSettings.arabicFont,
    '--heading-font-en': themeSettings.headingFontEn || themeSettings.englishFont,
    '--heading-font-ar': themeSettings.headingFontAr || themeSettings.arabicFont,
    '--body-font-en': themeSettings.bodyFontEn || themeSettings.englishFont,
    '--body-font-ar': themeSettings.bodyFontAr || themeSettings.arabicFont,
    '--product-font-en': themeSettings.productFontEn || themeSettings.englishFont,
    '--product-font-ar': themeSettings.productFontAr || themeSettings.arabicFont,
    '--hero-overlay-opacity': themeSettings.heroOverlayOpacity,
    '--hero-background': themeSettings.heroBackgroundColor,
    '--hero-title-color': themeSettings.heroTitleColor,
    '--hero-text-en-color': themeSettings.heroTextEnColor,
    '--hero-text-ar-color': themeSettings.heroTextArColor,
    '--hero-hours-bg-color': themeSettings.heroHoursBgColor,
    '--hero-hours-border-color': themeSettings.heroHoursBorderColor,
    '--hero-hours-text-color': themeSettings.heroHoursTextColor,
    '--hero-down-arrow-color': themeSettings.heroDownArrowColor,
    '--hero-justify': heroAlign === 'center' ? 'center' : 'flex-start',
    '--hero-padding-scale': themeSettings.heroPaddingScale,
    '--section-spacing-scale': themeSettings.sectionSpacingScale,
    '--text-scale': themeSettings.textScale,
    '--button-padding': buttonSizing.padding,
    '--button-font-size': buttonSizing.fontSize,
    backgroundColor: themeSettings.pageBackgroundColor,
  }
  if (themeLoading || menuLoading) {
    return (
      <main className="appLoadingScreen">
        <div className="appLoadingBrand">
          {showLogo ? (
            <img
              src={logoUrl}
              alt={siteSettings.siteNameEn}
              className="appLoadingLogo"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="appLoadingWordmark">
              {siteSettings.siteNameEn || 'BLANCO'}
            </span>
          )}
        </div>
        <div className="appLoadingSpinner" aria-hidden="true" />
      </main>
    )
  }

  return (
    <main className="website" style={rootStyle}>
      <section
        className="hero"
        style={heroStyle}
      >
        {heroBackgroundUrl && (
          <div className="heroBackgroundLayer" style={heroBackgroundLayerStyle} />
        )}

        <div
          className="heroShade"
          style={{ opacity: themeSettings.heroOverlayOpacity }}
        />

        {showLogo && (
          <img
            className="heroLogo"
            src={logoUrl}
            alt={siteSettings.siteNameEn}
            style={logoStyle}
            onError={() => setLogoFailed(true)}
          />
        )}

        <div className={`heroContent heroContent--${heroAlign}`}>
          <h1 className="brandName">
            {siteSettings.siteNameEn}
            {siteSettings.siteNameAr && <span>{siteSettings.siteNameAr}</span>}
          </h1>

          <div className="welcome">
            <h2>{siteSettings.welcomeEn}</h2>
            <h3>{siteSettings.welcomeAr}</h3>
          </div>

          <div className="description">
            <p>{siteSettings.descriptionEn}</p>
            <p dir="rtl">{siteSettings.descriptionAr}</p>
          </div>

          {heroHoursRows.length > 0 && (
            <div className="workingHours">
              {heroHoursRows.map((row, index) => (
                <div className="workingHoursRow" key={index}>
                  <span>
                    {row.labelEn} | {row.labelAr}
                  </span>
                  <strong>
                    {row.open} – {row.close}
                  </strong>
                </div>
              ))}
            </div>
          )}

          <a className="downArrow" href={`#${firstSectionId}`} aria-label="View menu">
            ↓
          </a>
        </div>
      </section>

      {firebaseMenu.length > 0 && (
        <nav
          className={`categoryNavigation${isHeaderScrolled ? ' categoryNavigation--scrolled' : ''}`}
        >
          <div className="categoryNavigationInner">
            {firebaseMenu.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="navItem">
                <span>{section.titleEn}</span>
                <small>{section.titleAr}</small>
              </a>
            ))}
          </div>
        </nav>
      )}

      {menuLoading && <p className="menuStatusMessage">جاري تحديث المنيو...</p>}

      {menuError && <p className="menuStatusMessage menuStatusError">{menuError}</p>}

      {!menuLoading && firebaseMenu.length === 0 && (
        <div className="menuEmptyState">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
            <path d="M4 8h13v5.2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" strokeLinejoin="round" />
            <path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>Menu coming soon | القائمة قادمة قريبًا</p>
        </div>
      )}

      <div className="menuArea">
        {firebaseMenu.map((section, index) => (
          <section className="menuSection" id={section.id} key={section.id}>
            <header className="menuSectionHeader">
              {section.imageUrl ? (
                <img
                  className="categoryImage"
                  src={convertGoogleDriveLink(section.imageUrl)}
                  alt={section.titleEn}
                  style={imageCropToStyle(section.imageCrop)}
                  loading="lazy"
                />
              ) : (
                <span className="sectionNumber">
                  {String(index + 1).padStart(2, '0')}
                </span>
              )}

              <div>
                <h2>{section.titleEn}</h2>
                <p>{section.titleAr}</p>
              </div>
            </header>

            <div className="productsGrid">
              {section.products.map((product) => {
                const productKey = product.id || `${section.id}-${product.nameEn}`
                const productAlt = product.nameAr || product.nameEn
                const directImageUrl = convertGoogleDriveLink(product.imageUrl)
                const hasFailed = Boolean(failedImages[productKey])

                const isOutOfStock = product.availability === 'out_of_stock'

                return (
                  <article
                    className={`productCard${isOutOfStock ? ' outOfStock' : ''}`}
                    key={productKey}
                  >
                    <div className="productImageWrap">
                      <ProductImage
                        src={product.imageUrl}
                        alt={productAlt}
                        crop={product.imageCrop}
                        failed={hasFailed}
                        onError={() =>
                          setFailedImages((previous) => ({
                            ...previous,
                            [productKey]: true,
                          }))
                        }
                        onClick={() =>
                          setLightboxImage({
                            url: directImageUrl,
                            alt: productAlt,
                          })
                        }
                      />

                      {(product.badges?.length > 0 || isOutOfStock) && (
                        <div className="productBadges">
                          {isOutOfStock && (
                            <span className="productBadge outOfStockBadge">
                              نفدت الكمية
                            </span>
                          )}
                          {product.badges?.map((badge) => (
                            <span className="productBadge" key={badge}>
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      {siteSettings.showPrices && (
                        <div className="productPrice">
                          <strong>{getActivePrice(product)}</strong>
                          <span>{siteSettings.currency}</span>
                        </div>
                      )}
                    </div>

                    <div className="productDetails">
                      <h3>{product.nameEn}</h3>
                      <p>{product.nameAr}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="footer">
        <p>{siteSettings.footerText}</p>

        {hasFooterContactInfo && (
          <div className="footerContact">
            {contactSettings.address && (
              <span className="footerContactItem">{contactSettings.address}</span>
            )}

            {contactSettings.phone && (
              <a className="footerContactItem" href={`tel:${contactSettings.phone}`}>
                {contactSettings.phone}
              </a>
            )}

            {normalizedWhatsapp && (
              <a
                className="footerContactItem"
                href={`https://wa.me/${normalizedWhatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            )}

            {contactSettings.email && (
              <a className="footerContactItem" href={`mailto:${contactSettings.email}`}>
                {contactSettings.email}
              </a>
            )}

            {websiteUrl && (
              <a
                className="footerContactItem"
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
              >
                {websiteDisplayText}
              </a>
            )}

            {contactSettings.googleMapsUrl && (
              <a
                className="footerContactItem"
                href={contactSettings.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Location | الموقع
              </a>
            )}

            {contactSettings.instagramUrl && (
              <a
                className="footerContactItem"
                href={contactSettings.instagramUrl}
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            )}

            {contactSettings.tiktokUrl && (
              <a
                className="footerContactItem"
                href={contactSettings.tiktokUrl}
                target="_blank"
                rel="noreferrer"
              >
                TikTok
              </a>
            )}

            {contactSettings.snapchatUrl && (
              <a
                className="footerContactItem"
                href={contactSettings.snapchatUrl}
                target="_blank"
                rel="noreferrer"
              >
                Snapchat
              </a>
            )}

            {contactSettings.xUrl && (
              <a
                className="footerContactItem"
                href={contactSettings.xUrl}
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
            )}

            {contactSettings.facebookUrl && (
              <a
                className="footerContactItem"
                href={contactSettings.facebookUrl}
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            )}
          </div>
        )}
      </footer>

      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          alt={lightboxImage.alt}
          onClose={closeLightbox}
        />
      )}

      <InstallPrompt />
      <PwaUpdatePrompt {...pwaUpdate} />
    </main>
  )
}

export default App
