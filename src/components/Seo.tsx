import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'

const siteUrl = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '')
const defaultDescription = 'Découvrez les lieux et services de la communauté musulmane en Europe.'

function routeMetadata(pathname: string, slug?: string) {
  if (pathname === '/') return { title: 'Explorer les lieux', description: defaultDescription }
  if (pathname === '/login') return { title: 'Connexion', description: 'Connectez-vous à votre compte Sahaba.' }
  if (pathname === '/forgot-password') return { title: 'Mot de passe oublié', description: 'Réinitialisez le mot de passe de votre compte Sahaba.' }
  if (pathname === '/reset-password') return { title: 'Réinitialiser le mot de passe', description: 'Choisissez un nouveau mot de passe pour Sahaba.' }
  if (pathname === '/submit') return { title: 'Proposer un lieu', description: 'Ajoutez un lieu utile à la communauté sur Sahaba.' }
  if (pathname === '/favorites') return { title: 'Mes favoris', description: 'Retrouvez les lieux enregistrés dans vos favoris Sahaba.' }
  if (pathname === '/profile') return { title: 'Mon profil', description: 'Consultez et modifiez votre profil Sahaba.' }
  if (pathname === '/admin') return { title: 'Administration', description: 'Administration et modération de Sahaba.' }
  if (pathname === '/about') return { title: 'À propos', description: 'En savoir plus sur le projet Sahaba.' }
  if (pathname === '/contact') return { title: 'Contact', description: 'Contacter l’équipe Sahaba.' }
  if (pathname.startsWith('/legal/')) return { title: pathname.endsWith('/privacy') ? 'Confidentialité' : pathname.endsWith('/terms') ? 'Conditions d’utilisation' : 'Informations légales', description: 'Informations légales et confidentialité de Sahaba.' }
  if (/^\/location\/[^/]+\/edit$/.test(pathname)) return { title: 'Modifier un lieu', description: 'Modifiez les informations d’un lieu sur Sahaba.' }
  if (/^\/location\/[^/]+$/.test(pathname)) return { title: slug ? slug.replace(/-/g, ' ') : 'Fiche du lieu', description: 'Consultez les informations, horaires et avis de ce lieu sur Sahaba.' }
  return { title: 'Page introuvable', description: defaultDescription }
}

export default function Seo() {
  const location = useLocation()
  const params = useParams()
  useEffect(() => {
    const canonicalBase = siteUrl || window.location.origin
    const canonicalUrl = new URL(location.pathname, `${canonicalBase}/`).toString()
    const metadata = routeMetadata(location.pathname, params.slug)
    document.title = `${metadata.title} | Sahaba`

    const setMeta = (selector: string, create: () => HTMLMetaElement, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) { element = create(); document.head.appendChild(element) }
      element.content = content
    }
    setMeta('meta[name="description"]', () => { const el = document.createElement('meta'); el.name = 'description'; return el }, metadata.description)
    setMeta('meta[property="og:title"]', () => { const el = document.createElement('meta'); el.setAttribute('property', 'og:title'); return el }, `${metadata.title} | Sahaba`)
    setMeta('meta[property="og:description"]', () => { const el = document.createElement('meta'); el.setAttribute('property', 'og:description'); return el }, metadata.description)
    setMeta('meta[property="og:url"]', () => { const el = document.createElement('meta'); el.setAttribute('property', 'og:url'); return el }, canonicalUrl)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = canonicalUrl
  }, [location.pathname, params.slug])
  return null
}
