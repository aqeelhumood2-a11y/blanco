
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

const DEFAULT_SITE_SETTINGS = {
  siteNameEn: 'RESTAURANT NAME',
  siteNameAr: 'اسم المطعم',
  welcomeEn: 'Welcome',
  welcomeAr: 'أهلًا وسهلًا',
  descriptionEn: 'Explore our menu.',
  descriptionAr: 'تصفح قائمة الطعام.',
  workingHours: '',
  footerText: 'RESTAURANT NAME',
  currency: 'BD',
  showPrices: true,
}

const DEFAULT_THEME_SETTINGS = {
  heroBackgroundUrl: '',
  logoUrl: '',
  pageBackgroundColor: '#f7f3f8',
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

const DEFAULT_CONTACT_SETTINGS = {
  phone: '',
  whatsapp: '',
  googleMapsUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  snapchatUrl: '',
  xUrl: '',
  facebookUrl: '',
}

// Converts a Google Drive share/view link into a direct-viewable image URL.
// Falls back to the original URL when it isn't a recognizable Drive link.
function getDirectImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return ''
  }

  const url = rawUrl.trim()

  if (!url) {
    return ''
  }

  if (!url.includes('drive.google.com')) {
    return url
  }

  let fileId = ''

  const fileDMatch = url.match(/\/file\/d\/([^/]+)/)
  if (fileDMatch && fileDMatch[1]) {
    fileId = fileDMatch[1]
  }

  if (!fileId) {
    const idParamMatch = url.match(/[?&]id=([^&]+)/)
    if (idParamMatch && idParamMatch[1]) {
      fileId = idParamMatch[1]
    }
  }

  if (!fileId) {
    return url
  }

  return `https://lh3.googleusercontent.com/d/${fileId}`
}

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

function ProductImage({ src, alt, onClick, failed, onError }) {
  const resolvedSrc = getDirectImageUrl(src)
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
            siteNameEn: data.siteNameEn ?? DEFAULT_SITE_SETTINGS.siteNameEn,
            siteNameAr: data.siteNameAr ?? DEFAULT_SITE_SETTINGS.siteNameAr,
            welcomeEn: data.welcomeEn ?? DEFAULT_SITE_SETTINGS.welcomeEn,
            welcomeAr: data.welcomeAr ?? DEFAULT_SITE_SETTINGS.welcomeAr,
            descriptionEn:
              data.descriptionEn ?? DEFAULT_SITE_SETTINGS.descriptionEn,
            descriptionAr:
              data.descriptionAr ?? DEFAULT_SITE_SETTINGS.descriptionAr,
            workingHours:
              data.workingHours ?? DEFAULT_SITE_SETTINGS.workingHours,
            footerText: data.footerText ?? DEFAULT_SITE_SETTINGS.footerText,
            currency: data.currency ?? DEFAULT_SITE_SETTINGS.currency,
            showPrices:
              typeof data.showPrices === 'boolean'
                ? data.showPrices
                : DEFAULT_SITE_SETTINGS.showPrices,
          })
        }
      } catch (settingsError) {
        console.error(settingsError)
      }
    }

    async function loadThemeSettings() {
      try {
        const themeSnapshot = await getDoc(doc(db, 'themeSettings', 'main'))

        if (!cancelled && themeSnapshot.exists()) {
          const data = themeSnapshot.data()

          setThemeSettings({
            heroBackgroundUrl:
              data.heroBackgroundUrl ??
              DEFAULT_THEME_SETTINGS.heroBackgroundUrl,
            logoUrl: data.logoUrl ?? DEFAULT_THEME_SETTINGS.logoUrl,
            pageBackgroundColor:
              data.pageBackgroundColor ??
              DEFAULT_THEME_SETTINGS.pageBackgroundColor,
heroBackgroundColor:
  data.heroBackgroundColor ??
  DEFAULT_THEME_SETTINGS.heroBackgroundColor,

            primaryColor:
              data.primaryColor ?? DEFAULT_THEME_SETTINGS.primaryColor,
            buttonColor:
              data.buttonColor ?? DEFAULT_THEME_SETTINGS.buttonColor,
            priceBackgroundColor:
              data.priceBackgroundColor ??
              DEFAULT_THEME_SETTINGS.priceBackgroundColor,
            priceTextColor:
              data.priceTextColor ?? DEFAULT_THEME_SETTINGS.priceTextColor,
            headingColor:
              data.headingColor ?? DEFAULT_THEME_SETTINGS.headingColor,
            textColor: data.textColor ?? DEFAULT_THEME_SETTINGS.textColor,
            mutedTextColor:
              data.mutedTextColor ?? DEFAULT_THEME_SETTINGS.mutedTextColor,
            navigationBackgroundColor:
              data.navigationBackgroundColor ??
              DEFAULT_THEME_SETTINGS.navigationBackgroundColor,
            footerBackgroundColor:
              data.footerBackgroundColor ??
              DEFAULT_THEME_SETTINGS.footerBackgroundColor,
            arabicFont: data.arabicFont ?? DEFAULT_THEME_SETTINGS.arabicFont,
            englishFont:
              data.englishFont ?? DEFAULT_THEME_SETTINGS.englishFont,
            heroOverlayOpacity:
              typeof data.heroOverlayOpacity === 'number'
                ? data.heroOverlayOpacity
                : DEFAULT_THEME_SETTINGS.heroOverlayOpacity,
          })
        }
      } catch (themeError) {
        console.error(themeError)
      }
    }

    async function loadContactSettings() {
      try {
        const contactSnapshot = await getDoc(
          doc(db, 'contactSettings', 'main'),
        )

        if (!cancelled && contactSnapshot.exists()) {
          const data = contactSnapshot.data()

          setContactSettings({
            phone: data.phone ?? DEFAULT_CONTACT_SETTINGS.phone,
            whatsapp: data.whatsapp ?? DEFAULT_CONTACT_SETTINGS.whatsapp,
            googleMapsUrl:
              data.googleMapsUrl ?? DEFAULT_CONTACT_SETTINGS.googleMapsUrl,
            instagramUrl:
              data.instagramUrl ?? DEFAULT_CONTACT_SETTINGS.instagramUrl,
            tiktokUrl: data.tiktokUrl ?? DEFAULT_CONTACT_SETTINGS.tiktokUrl,
            snapchatUrl:
              data.snapchatUrl ?? DEFAULT_CONTACT_SETTINGS.snapchatUrl,
            xUrl: data.xUrl ?? DEFAULT_CONTACT_SETTINGS.xUrl,
            facebookUrl:
              data.facebookUrl ?? DEFAULT_CONTACT_SETTINGS.facebookUrl,
          })
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
              .filter((product) => product.visible !== false)
              .sort(
                (productA, productB) =>
                  (productA.order || 0) - (productB.order || 0),
              )

            return {
              id: category.id,
              titleEn: category.nameEn || category.id,
              titleAr: category.nameAr || '',
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

  const heroBackgroundUrl = getDirectImageUrl(themeSettings.heroBackgroundUrl)
  const resolvedHeroBackground = heroBackgroundUrl
  ? `url(${heroBackgroundUrl})`
  : 'none'
const heroStyle = {
  backgroundImage: resolvedHeroBackground,
  backgroundColor: themeSettings.heroBackgroundColor || '#28102f',
}
  const logoUrl = getDirectImageUrl(themeSettings.logoUrl)
  const showLogo = Boolean(logoUrl) && !logoFailed

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

  const rootStyle = {
    '--page-background': themeSettings.pageBackgroundColor,
    '--primary-color': themeSettings.primaryColor,
    '--button-color': themeSettings.buttonColor,
    '--price-background': themeSettings.priceBackgroundColor,
    '--price-text-color': themeSettings.priceTextColor,
    '--heading-color': themeSettings.headingColor,
    '--text-color': themeSettings.textColor,
    '--muted-text-color': themeSettings.mutedTextColor,
    '--navigation-background': themeSettings.navigationBackgroundColor,
    '--footer-background': themeSettings.footerBackgroundColor,
    '--english-font': themeSettings.englishFont,
    '--arabic-font': themeSettings.arabicFont,
    '--hero-overlay-opacity': themeSettings.heroOverlayOpacity,
    '--hero-background': themeSettings.heroBackgroundColor,
    backgroundColor: themeSettings.pageBackgroundColor,
  }

  return (
    <main className="website" style={rootStyle}>
      <section
        className="hero"
        style={heroStyle}
      >
        <div
          className="heroShade"
          style={{ opacity: themeSettings.heroOverlayOpacity }}
        />

        <div className="heroContent">
          {showLogo && (
            <img
              className="heroLogo"
              src={logoUrl}
              alt={siteSettings.siteNameEn}
              onError={() => setLogoFailed(true)}
            />
          )}

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
            <span>Open Daily | مفتوح يوميًا</span>
            <strong>{siteSettings.workingHours}</strong>
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
              <span className="sectionNumber">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div>
                <h2>{section.titleEn}</h2>
                <p>{section.titleAr}</p>
              </div>
            </header>

            <div className="productsGrid">
              {section.products.map((product) => {
                const productKey = product.id || `${section.id}-${product.nameEn}`
                const productAlt = product.nameAr || product.nameEn
                const directImageUrl = getDirectImageUrl(product.imageUrl)
                const hasFailed = Boolean(failedImages[productKey])

                return (
                  <article className="productCard" key={productKey}>
                    <ProductImage
                      src={product.imageUrl}
                      alt={productAlt}
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

                    <div className="productDetails">
                      <h3>{product.nameEn}</h3>
                      <p>{product.nameAr}</p>

                      {siteSettings.showPrices && (
                        <div className="productPrice">
                          <strong>{product.price}</strong>
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

      {hasContactInfo && (
        <section className="contactSection">
          <h2 className="contactSectionTitle">Contact Us | تواصل معنا</h2>

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
