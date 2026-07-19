
import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import './App.css'

import Admin from './Admin.jsx'
import { db } from './firebase.js'
import { menuSections } from './menuData.js'
import {
  clampImageOffset,
  clampImageScale,
  clampLogoSize,
  clampScaleFactor,
  clampSpacing,
  clampTextScale,
  convertGoogleDriveLink,
  dayKeys,
  dayLabels,
  defaultContactSettings,
  defaultSiteSettings,
  defaultThemeSettings,
  formatDayHours,
  getActivePrice,
  getTodayKey,
  imageCropToStyle,
  isProductVisibleNow,
  normalizeWeeklyHours,
} from './admin/utils/adminUtils.js'

// siteSettings/themeSettings/contactSettings all use the same shape the
// admin panel edits and saves — a single shared source of defaults instead
// of a second, easily-drifting copy of every field.
const DEFAULT_SITE_SETTINGS = { ...defaultSiteSettings, weeklyHours: null }
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
      <div className="productImage">
        <span>IMAGE</span>
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

  const isAdminPage = window.location.pathname === '/admin'

  const closeLightbox = useCallback(() => {
    setLightboxImage(null)
  }, [])

  // Retry a corrected logo URL instead of staying stuck on the previous failure.
  useEffect(() => {
    setLogoFailed(false)
  }, [themeSettings.logoUrl])

  useEffect(() => {
    if (isAdminPage) {
      setMenuLoading(false)
      return
    }

    let cancelled = false

    async function loadSiteSettings() {
      try {
        const settingsSnapshot = await getDoc(
          doc(db, 'siteSettings', 'main'),
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
            // free-text string instead of a per-day schedule.
            weeklyHours: normalizeWeeklyHours(data.weeklyHours),
          })
        }
      } catch (settingsError) {
        console.error(settingsError)
      }
    }

    async function loadThemeSettings() {
      setThemeLoading(true)
      try {
        const themeSnapshot = await getDoc(doc(db, 'themeSettings', 'main'))

        if (!cancelled && themeSnapshot.exists()) {
          const data = themeSnapshot.data()

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
          doc(db, 'contactSettings', 'main'),
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
          collection(db, 'categories'),
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
              collection(db, 'categories', category.id, 'products'),
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
  setFirebaseMenu(
    categoriesSnapshot.empty
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

    loadSiteSettings()
    loadThemeSettings()
    loadContactSettings()
    loadMenuFromFirebase()

    return () => {
      cancelled = true
    }
  }, [isAdminPage])

  if (isAdminPage) {
    return <Admin />
  }

 const firstSectionId = firebaseMenu[0]?.id || ''

  const heroBackgroundUrl = convertGoogleDriveLink(themeSettings.heroBackgroundUrl)
  const heroStyle = {
    backgroundColor: themeSettings.heroBackgroundColor || '#28102f',
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

  const normalizedWhatsapp = normalizeWhatsappNumber(contactSettings.whatsapp)

  const heroAlign = themeSettings.heroAlign === 'center' ? 'center' : 'left'
  const buttonSize = themeSettings.buttonSize || 'md'
  const buttonSizing = {
    sm: { padding: '9px 18px', fontSize: '12px' },
    md: { padding: '12px 24px', fontSize: '14px' },
    lg: { padding: '15px 30px', fontSize: '16px' },
  }[buttonSize]

  const todayKey = getTodayKey()
  const todayDay = siteSettings.weeklyHours ? siteSettings.weeklyHours[todayKey] : null
  const todayHoursText = todayDay ? formatDayHours(todayDay) : null
  const isClosedToday = Boolean(todayDay?.closed)

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
    '--hero-overlay-opacity': themeSettings.heroOverlayOpacity,
    '--hero-background': themeSettings.heroBackgroundColor,
    '--hero-justify': heroAlign === 'center' ? 'center' : 'flex-start',
    '--hero-padding-scale': themeSettings.heroPaddingScale,
    '--section-spacing-scale': themeSettings.sectionSpacingScale,
    '--text-scale': themeSettings.textScale,
    '--button-padding': buttonSizing.padding,
    '--button-font-size': buttonSizing.fontSize,
    backgroundColor: themeSettings.pageBackgroundColor,
  }
if (themeLoading) {
  return null
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

          <div className="workingHours">
            {siteSettings.weeklyHours ? (
              isClosedToday ? (
                <span className="workingHoursClosed">Closed today | مغلق اليوم</span>
              ) : (
                <>
                  <span>
                    {siteSettings.openingHoursLabelEn} | {siteSettings.openingHoursLabelAr}
                  </span>
                  <strong>{todayHoursText}</strong>
                </>
              )
            ) : (
              <>
                <span>
                  {siteSettings.openingHoursLabelEn} | {siteSettings.openingHoursLabelAr}
                </span>
                <strong>{siteSettings.workingHours}</strong>
              </>
            )}
          </div>

          <a className="downArrow" href={`#${firstSectionId}`} aria-label="View menu">
            ↓
          </a>
        </div>
      </section>

      <nav className="categoryNavigation">
        <div className="categoryNavigationInner">
          {firebaseMenu.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="navItem">
              <span>{section.titleEn}</span>
              <small>{section.titleAr}</small>
            </a>
          ))}
        </div>
      </nav>

      {menuLoading && (
        <p
          style={{
            textAlign: 'center',
            padding: '25px',
          }}
        >
          جاري تحديث المنيو...
        </p>
      )}

      {menuError && (
        <p
          style={{
            textAlign: 'center',
            padding: '15px',
            color: '#a01616',
          }}
        >
          {menuError}
        </p>
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

                    <div className="productDetails">
                      <h3>{product.nameEn}</h3>
                      <p>{product.nameAr}</p>

                      {siteSettings.showPrices && (
                        <div className="productPrice">
                          <strong>{getActivePrice(product)}</strong>
                          <span>{siteSettings.currency}</span>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {(hasContactInfo || siteSettings.weeklyHours) && (
        <section className="contactSection">
          <h2 className="contactSectionTitle">
            {siteSettings.contactHeadingEn} | {siteSettings.contactHeadingAr}
          </h2>

          {siteSettings.weeklyHours && (
            <ul className="weeklyScheduleList">
              {dayKeys.map((key) => {
                const day = siteSettings.weeklyHours[key]
                const isToday = key === todayKey

                return (
                  <li key={key} className={isToday ? 'weeklyScheduleToday' : ''}>
                    <span>{dayLabels[key].ar}</span>
                    <span>{day.closed ? 'مغلق' : formatDayHours(day)}</span>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="contactLinks">
            {contactSettings.phone && (
              <a
                className="contactLink contactPhone"
                href={`tel:${contactSettings.phone}`}
              >
                Call | اتصال
              </a>
            )}

            {normalizedWhatsapp && (
              <a
                className="contactLink contactWhatsapp"
                href={`https://wa.me/${normalizedWhatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp | واتساب
              </a>
            )}

            {contactSettings.googleMapsUrl && (
              <a
                className="contactLink contactMaps"
                href={contactSettings.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Location | الموقع
              </a>
            )}

            {contactSettings.instagramUrl && (
              <a
                className="contactLink contactSocial"
                href={contactSettings.instagramUrl}
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            )}

            {contactSettings.tiktokUrl && (
              <a
                className="contactLink contactSocial"
                href={contactSettings.tiktokUrl}
                target="_blank"
                rel="noreferrer"
              >
                TikTok
              </a>
            )}

            {contactSettings.snapchatUrl && (
              <a
                className="contactLink contactSocial"
                href={contactSettings.snapchatUrl}
                target="_blank"
                rel="noreferrer"
              >
                Snapchat
              </a>
            )}

            {contactSettings.xUrl && (
              <a
                className="contactLink contactSocial"
                href={contactSettings.xUrl}
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
            )}

            {contactSettings.facebookUrl && (
              <a
                className="contactLink contactSocial"
                href={contactSettings.facebookUrl}
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            )}
          </div>
        </section>
      )}

      <footer className="footer">
        <p>{siteSettings.footerText}</p>
      </footer>

      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          alt={lightboxImage.alt}
          onClose={closeLightbox}
        />
      )}
    </main>
  )
}

export default App
