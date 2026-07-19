// Lightweight, dependency-free document-head manager. No react-helmet here —
// this app has exactly one place that ever needs to touch <head> tags
// (App.jsx, once per branch/page), so a small imperative helper is simpler
// and lighter than pulling in a library for it.

function setMetaByName(name, content) {
  if (!content) return
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setMetaByProperty(property, content) {
  if (!content) return
  let tag = document.querySelector(`meta[property="${property}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(url) {
  let tag = document.querySelector('link[rel="canonical"]')
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', 'canonical')
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', url)
}

function setRobots(content) {
  setMetaByName('robots', content)
}

function setJsonLd(id, data) {
  let tag = document.getElementById(id)
  if (!data) {
    if (tag) tag.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('script')
    tag.type = 'application/ld+json'
    tag.id = id
    document.head.appendChild(tag)
  }
  tag.textContent = JSON.stringify(data)
}

function truncate(text, max) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text
}

// The admin panel is never meant to be indexed or shared — a plain title
// plus a noindex directive, no OG/Twitter/structured data.
export function applyAdminSeo() {
  document.title = 'BLANCO — لوحة الإدارة'
  setRobots('noindex, nofollow')
  setJsonLd('restaurant-structured-data', null)
}

export function applyPublicSeo({
  siteNameEn,
  siteNameAr,
  descriptionEn,
  phone,
  address,
  imageUrl,
  canonicalUrl,
  weeklyHours,
}) {
  const brand = siteNameEn || 'BLANCO'
  const title = `${brand} — Menu | القائمة`
  const description = truncate(
    descriptionEn || `Browse the digital menu for ${brand}.`,
    160,
  )
  const image = imageUrl || `${window.location.origin}/icon-512.png`

  document.title = title
  setRobots('index, follow')

  setMetaByName('description', description)
  setCanonical(canonicalUrl)

  setMetaByProperty('og:type', 'restaurant.restaurant')
  setMetaByProperty('og:title', title)
  setMetaByProperty('og:description', description)
  setMetaByProperty('og:image', image)
  setMetaByProperty('og:url', canonicalUrl)
  setMetaByProperty('og:site_name', brand)
  setMetaByProperty('og:locale', 'en_US')
  setMetaByProperty('og:locale:alternate', 'ar_AR')

  setMetaByName('twitter:card', 'summary_large_image')
  setMetaByName('twitter:title', title)
  setMetaByName('twitter:description', description)
  setMetaByName('twitter:image', image)

  const openingHoursSpecification = weeklyHours
    ? Object.entries({
        sun: 'Sunday',
        mon: 'Monday',
        tue: 'Tuesday',
        wed: 'Wednesday',
        thu: 'Thursday',
        fri: 'Friday',
        sat: 'Saturday',
      })
        .filter(([key]) => weeklyHours[key] && !weeklyHours[key].closed)
        .map(([key, dayOfWeek]) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek,
          opens: weeklyHours[key].open,
          closes: weeklyHours[key].close,
        }))
    : undefined

  setJsonLd('restaurant-structured-data', {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: brand,
    alternateName: siteNameAr || undefined,
    image,
    url: canonicalUrl,
    telephone: phone || undefined,
    address: address ? { '@type': 'PostalAddress', streetAddress: address } : undefined,
    servesCuisine: 'Cafe',
    ...(openingHoursSpecification?.length ? { openingHoursSpecification } : {}),
  })
}
