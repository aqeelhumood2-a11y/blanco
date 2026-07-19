
import { useEffect, useRef, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

import { auth, db } from './firebase.js'
import { menuSections } from './menuData.js'
import './Admin.css'

import ProductsManager from './admin/ProductsManager.jsx'
import CategoriesManager from './admin/CategoriesManager.jsx'
import {
  arabicFontOptions,
  clampImageOffset,
  clampImageScale,
  convertGoogleDriveLink,
  currencyOptions,
  defaultContactSettings,
  defaultSiteSettings,
  defaultThemeSettings,
  englishFontOptions,
  IMAGE_SCALE_MAX,
  IMAGE_SCALE_MIN,
  slugifyName,
} from './admin/utils/adminUtils.js'

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

  const [heroScale, setHeroScale] = useState(defaultThemeSettings.heroScale)
  const [heroOffsetX, setHeroOffsetX] = useState(defaultThemeSettings.heroOffsetX)
  const [heroOffsetY, setHeroOffsetY] = useState(defaultThemeSettings.heroOffsetY)
  const [logoScale, setLogoScale] = useState(defaultThemeSettings.logoScale)
  const [logoOffsetX, setLogoOffsetX] = useState(defaultThemeSettings.logoOffsetX)
  const [logoOffsetY, setLogoOffsetY] = useState(defaultThemeSettings.logoOffsetY)
  const [logoFit, setLogoFit] = useState(defaultThemeSettings.logoFit)

  const [contactLoading, setContactLoading] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [snapchatUrl, setSnapchatUrl] = useState('')
  const [xUrl, setXUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')

  const siteSettingsRef = useRef(null)
  const themeRef = useRef(null)
  const contactRef = useRef(null)

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
  }, [user])

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
      const settingsDoc = await getDoc(
        doc(db, 'siteSettings', 'main'),
      )

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
    } catch (settingsError) {
      console.error(settingsError)
      setError('تعذر تحميل إعدادات الموقع')
    } finally {
      setSettingsLoading(false)
    }
  }

  async function saveSiteSettings(event) {
    event.preventDefault()

    setSavingSettings(true)
    setError('')
    setSettingsMessage('')

    try {
      await setDoc(
        doc(db, 'siteSettings', 'main'),
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
        },
        { merge: true },
      )

      setSettingsMessage('تم حفظ إعدادات الموقع بنجاح')
    } catch (saveError) {
      console.error(saveError)
      setError('صار خطأ أثناء حفظ إعدادات الموقع')
    } finally {
      setSavingSettings(false)
    }
  }

  async function loadThemeSettings() {
    setThemeLoading(true)
    setThemeMessage('')

    try {
      const themeDoc = await getDoc(
        doc(db, 'themeSettings', 'main'),
      )

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
      setHeroScale(clampImageScale(data.heroScale ?? defaultThemeSettings.heroScale))
      setHeroOffsetX(clampImageOffset(data.heroOffsetX ?? defaultThemeSettings.heroOffsetX))
      setHeroOffsetY(clampImageOffset(data.heroOffsetY ?? defaultThemeSettings.heroOffsetY))
      setLogoScale(clampImageScale(data.logoScale ?? defaultThemeSettings.logoScale))
      setLogoOffsetX(clampImageOffset(data.logoOffsetX ?? defaultThemeSettings.logoOffsetX))
      setLogoOffsetY(clampImageOffset(data.logoOffsetY ?? defaultThemeSettings.logoOffsetY))
      setLogoFit(data.logoFit === 'cover' ? 'cover' : defaultThemeSettings.logoFit)
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

    setSavingTheme(true)
    setError('')
    setThemeMessage('')

    try {
      const finalHeroBackgroundUrl = convertGoogleDriveLink(
        heroBackgroundUrl.trim(),
      )
      const finalLogoUrl = convertGoogleDriveLink(logoUrl.trim())

      await setDoc(
        doc(db, 'themeSettings', 'main'),
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
          heroScale: clampImageScale(heroScale),
          heroOffsetX: clampImageOffset(heroOffsetX),
          heroOffsetY: clampImageOffset(heroOffsetY),
          logoScale: clampImageScale(logoScale),
          logoOffsetX: clampImageOffset(logoOffsetX),
          logoOffsetY: clampImageOffset(logoOffsetY),
          logoFit,
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
      setSavingTheme(false)
    }
  }

  function resetHeroImageAdjustment() {
    setHeroScale(defaultThemeSettings.heroScale)
    setHeroOffsetX(defaultThemeSettings.heroOffsetX)
    setHeroOffsetY(defaultThemeSettings.heroOffsetY)
  }

  function resetLogoImageAdjustment() {
    setLogoScale(defaultThemeSettings.logoScale)
    setLogoOffsetX(defaultThemeSettings.logoOffsetX)
    setLogoOffsetY(defaultThemeSettings.logoOffsetY)
    setLogoFit(defaultThemeSettings.logoFit)
  }

  async function loadContactSettings() {
    setContactLoading(true)
    setContactMessage('')

    try {
      const contactDoc = await getDoc(
        doc(db, 'contactSettings', 'main'),
      )

      const data = contactDoc.exists() ? contactDoc.data() : {}

      setPhone(data.phone ?? defaultContactSettings.phone)
      setWhatsapp(data.whatsapp ?? defaultContactSettings.whatsapp)
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

    setSavingContact(true)
    setError('')
    setContactMessage('')

    try {
      await setDoc(
        doc(db, 'contactSettings', 'main'),
        {
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
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
      setSavingContact(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()

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

        const categoryRef = doc(db, 'categories', section.id)
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

          const productRef = doc(
            db,
            'categories',
            section.id,
            'products',
            productId,
          )

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
            <span>لوحة الإدارة</span>
          </div>

          <button type="button" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </header>

        <ProductsManager onBack={goToDashboard} currency={currency} />
      </main>
    )
  }

  if (view === 'categories') {
    return (
      <main className="adminDashboard" dir="rtl">
        <header className="adminTopBar">
          <div>
            <strong>BLANCO</strong>
            <span>لوحة الإدارة</span>
          </div>

          <button type="button" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </header>

        <CategoriesManager onBack={goToDashboard} />
      </main>
    )
  }

  return (
    <main className="adminDashboard" dir="rtl">
      <header className="adminTopBar">
        <div>
          <strong>BLANCO</strong>
          <span>لوحة الإدارة</span>
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

                <div className="adminImagePreview">
                  {heroPreviewUrl && !heroImageError ? (
                    <img
                      className="adminCurrentProductImage"
                      src={heroPreviewUrl}
                      alt="معاينة خلفية الهيدر"
                      style={{
                        objectFit: 'cover',
                        transform: `scale(${clampImageScale(heroScale)})`,
                        transformOrigin: `${clampImageOffset(heroOffsetX)}% ${clampImageOffset(heroOffsetY)}%`,
                      }}
                      onError={() => setHeroImageError(true)}
                    />
                  ) : (
                    <div className="adminImagePlaceholder">
                      لا توجد خلفية
                    </div>
                  )}
                </div>

                {heroPreviewUrl && (
                  <div className="adminImageAdjustControls">
                    <label>
                      التكبير: {clampImageScale(heroScale).toFixed(2)}×
                      <input
                        type="range"
                        min={IMAGE_SCALE_MIN}
                        max={IMAGE_SCALE_MAX}
                        step="0.05"
                        value={heroScale}
                        onChange={(event) => setHeroScale(event.target.value)}
                      />
                    </label>

                    <label>
                      الموضع الأفقي: {clampImageOffset(heroOffsetX)}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={heroOffsetX}
                        onChange={(event) => setHeroOffsetX(event.target.value)}
                      />
                    </label>

                    <label>
                      الموضع الرأسي: {clampImageOffset(heroOffsetY)}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={heroOffsetY}
                        onChange={(event) => setHeroOffsetY(event.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className="adminResetImageButton"
                      onClick={resetHeroImageAdjustment}
                    >
                      إعادة ضبط الصورة
                    </button>
                  </div>
                )}
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

                <div className="adminImagePreview">
                  {logoPreviewUrl && !logoImageError ? (
                    <img
                      className="adminCurrentProductImage"
                      src={logoPreviewUrl}
                      alt="معاينة الشعار"
                      style={{
                        objectFit: logoFit === 'cover' ? 'cover' : 'contain',
                        objectPosition: `${clampImageOffset(logoOffsetX)}% ${clampImageOffset(logoOffsetY)}%`,
                        transform: `scale(${clampImageScale(logoScale)})`,
                      }}
                      onError={() => setLogoImageError(true)}
                    />
                  ) : (
                    <div className="adminImagePlaceholder">
                      لا يوجد شعار
                    </div>
                  )}
                </div>

                {logoPreviewUrl && (
                  <div className="adminImageAdjustControls">
                    <label>
                      طريقة العرض
                      <select
                        value={logoFit}
                        onChange={(event) => setLogoFit(event.target.value)}
                      >
                        <option value="contain">احتواء كامل (بدون قص)</option>
                        <option value="cover">تعبئة الإطار (قص عند الحاجة)</option>
                      </select>
                    </label>

                    <label>
                      التكبير: {clampImageScale(logoScale).toFixed(2)}×
                      <input
                        type="range"
                        min={IMAGE_SCALE_MIN}
                        max={IMAGE_SCALE_MAX}
                        step="0.05"
                        value={logoScale}
                        onChange={(event) => setLogoScale(event.target.value)}
                      />
                    </label>

                    <label>
                      الموضع الأفقي: {clampImageOffset(logoOffsetX)}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={logoOffsetX}
                        onChange={(event) => setLogoOffsetX(event.target.value)}
                      />
                    </label>

                    <label>
                      الموضع الرأسي: {clampImageOffset(logoOffsetY)}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={logoOffsetY}
                        onChange={(event) => setLogoOffsetY(event.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className="adminResetImageButton"
                      onClick={resetLogoImageAdjustment}
                    >
                      إعادة ضبط الصورة
                    </button>
                  </div>
                )}
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
