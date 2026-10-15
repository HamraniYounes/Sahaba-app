import type { LocationCategory, OpeningHours } from '../types/database'
import { normalizeOpeningHours, validateOpeningHoursValue } from './openingHours'

export const LOCATION_CATEGORIES: LocationCategory[] = [
  'restaurant','fast_food','cafe','boulangerie','boucherie','epicerie','mosquee',
  'salle_priere','ecole_coran','association','funeraire','sante','bien_etre',
  'vetements','librairie','finance','voyage','hebergement','services','autre',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type LocationForm = {
  name: string
  category: LocationCategory
  address: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  description: string
}

export type ValidationResult = { ok: true } | { ok: false; message: string }

export function validateLocationForm(form: LocationForm): ValidationResult {
  if (!form.name.trim() || form.name.trim().length > 140) return { ok: false, message: 'Le nom est obligatoire et doit faire 140 caractères maximum.' }
  if (!LOCATION_CATEGORIES.includes(form.category)) return { ok: false, message: 'La catégorie sélectionnée est invalide.' }
  if (!form.city.trim() || form.city.trim().length > 120) return { ok: false, message: 'La ville est obligatoire et doit faire 120 caractères maximum.' }
  if (!form.country.trim() || form.country.trim().length > 120) return { ok: false, message: 'Le pays est obligatoire et doit faire 120 caractères maximum.' }
  if (form.address.trim().length > 250) return { ok: false, message: 'L’adresse doit faire 250 caractères maximum.' }
  if (form.phone.trim().length > 40) return { ok: false, message: 'Le téléphone doit faire 40 caractères maximum.' }
  if (form.email.trim() && (!EMAIL_RE.test(form.email.trim()) || form.email.trim().length > 254)) return { ok: false, message: 'L’adresse e-mail est invalide.' }
  if (form.website.trim()) {
    try { const url = new URL(form.website.trim()); if (!['http:', 'https:'].includes(url.protocol)) throw new Error() } catch { return { ok: false, message: 'Le site web doit être une URL HTTP(S) valide.' }
  }
  if (form.description.trim().length > 4000) return { ok: false, message: 'La description doit faire 4000 caractères maximum.' }
  return { ok: true }
}

export function validateOpeningHours(hours: OpeningHours | Record<string, string>): ValidationResult {
  const normalized = normalizeOpeningHours(hours)
  const message = validateOpeningHoursValue(normalized)
  return message ? { ok: false, message } : { ok: true }
}

export function validatePhotos(files: File[], existingCount = 0): ValidationResult {
  if (existingCount + files.length > 5) return { ok: false, message: 'Une fiche peut contenir 5 photos maximum.' }
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (files.some(file => !allowed.has(file.type) || file.size > 5 * 1024 * 1024)) return { ok: false, message: 'Chaque photo doit être JPEG, PNG ou WebP et faire 5 Mo maximum.' }
  return { ok: true }
}
