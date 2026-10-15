import { LOCATION_CATEGORIES } from './validation'
import type { Database } from '../types/supabase'
import { slugify } from './utils'

export const CSV_LOCATION_COLUMNS = [
  'name','category','address','city','country','latitude','longitude','timezone',
  'phone','email','website','description','price_range','halal_full','alcohol_free',
  'women_only','prayer_room','wudu_facilities','burkini_friendly','vegetarian_options',
  'vegan_options','accessible','parking',
] as const

type CsvColumn = typeof CSV_LOCATION_COLUMNS[number]
export type CsvLocationRow = Record<CsvColumn, string> & { rowNumber: number }
export type CsvLocationInsert = Database['public']['Tables']['locations']['Insert']
export type CsvValidationResult = { rows: CsvLocationInsert[]; errors: string[]; headers: string[] }

function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i += 1 } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field); field = '' }
    else if (char === '\n' && !quoted) { row.push(field); if (row.some(value => value.trim())) rows.push(row); row = []; field = '' }
    else field += char
  }
  if (quoted) throw new Error('CSV invalide : guillemet non fermé.')
  if (field.length || row.length) { row.push(field); if (row.some(value => value.trim())) rows.push(row) }
  return rows
}

function boolValue(value: string, label: string, row: number): boolean | undefined {
  if (!value.trim()) return undefined
  const normalized = value.trim().toLowerCase()
  if (['true','1','oui','yes'].includes(normalized)) return true
  if (['false','0','non','no'].includes(normalized)) return false
  throw new Error(`Ligne ${row} : ${label} doit être true/false, oui/non ou 1/0.`)
}

function optionalNumber(value: string, label: string, row: number, min: number, max: number): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`Ligne ${row} : ${label} est invalide.`)
  return parsed
}

export function validateCsvText(text: string, userId: string): CsvValidationResult {
  const matrix = parseCsv(text)
  if (!matrix.length) return { rows: [], errors: ['Le fichier CSV est vide.'], headers: [] }
  const headers = matrix[0].map(value => value.trim().toLowerCase())
  const expected = [...CSV_LOCATION_COLUMNS]
  const missing = expected.filter(column => !headers.includes(column))
  const unknown = headers.filter(column => !expected.includes(column as CsvColumn))
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index)
  if (missing.length || unknown.length || duplicateHeaders.length) {
    return { rows: [], headers, errors: [
      ...(missing.length ? [`Colonnes obligatoires/manquantes : ${missing.join(', ')}.`] : []),
      ...(unknown.length ? [`Colonnes inconnues : ${unknown.join(', ')}.`] : []),
      ...(duplicateHeaders.length ? [`Colonnes dupliquées : ${[...new Set(duplicateHeaders)].join(', ')}.`] : []),
    ] }
  }

  const indexes = Object.fromEntries(headers.map((header, index) => [header, index])) as Record<CsvColumn, number>
  const rows: CsvLocationInsert[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  for (let i = 1; i < matrix.length; i += 1) {
    const line = i + 1
    const raw = Object.fromEntries(CSV_LOCATION_COLUMNS.map(column => [column, (matrix[i][indexes[column]] ?? '').trim()])) as CsvLocationRow
    raw.rowNumber = line
    try {
      if (!raw.name || raw.name.length > 140) throw new Error('name est obligatoire et limité à 140 caractères.')
      if (!LOCATION_CATEGORIES.includes(raw.category as never)) throw new Error('category est invalide.')
      if (!raw.city || raw.city.length > 120) throw new Error('city est obligatoire et limité à 120 caractères.')
      if (!raw.country || raw.country.length > 120) throw new Error('country est obligatoire et limité à 120 caractères.')
      if (raw.address.length > 250) throw new Error('address dépasse 250 caractères.')
      if (raw.phone.length > 40) throw new Error('phone dépasse 40 caractères.')
      if (raw.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email) || raw.email.length > 254)) throw new Error('email est invalide.')
      if (raw.website) { const url = new URL(raw.website); if (!['http:','https:'].includes(url.protocol)) throw new Error('website doit être une URL HTTP(S).') }
      if (raw.description.length > 10000) throw new Error('description dépasse 10000 caractères.')
      const latitude = optionalNumber(raw.latitude, 'latitude', line, -90, 90)
      const longitude = optionalNumber(raw.longitude, 'longitude', line, -180, 180)
      if ((latitude === null) !== (longitude === null)) throw new Error('latitude et longitude doivent être fournies ensemble.')
      const price = raw.price_range ? Number(raw.price_range) : null
      if (price !== null && (!Number.isInteger(price) || price < 1 || price > 4)) throw new Error('price_range doit être un entier de 1 à 4.')
      if (!raw.timezone) throw new Error('timezone est obligatoire.')
      try { new Intl.DateTimeFormat('en-US', { timeZone: raw.timezone }).format() } catch { throw new Error('timezone est invalide.') }
      const slug = slugify(`${raw.name}-${raw.city}`)
      if (!slug) throw new Error('Impossible de générer un slug.')
      if (seen.has(slug)) throw new Error('Doublon dans le fichier (même nom + ville).')
      seen.add(slug)
      const payload: CsvLocationInsert = {
        name: raw.name, slug, category: raw.category as CsvLocationInsert['category'], address: raw.address || null,
        city: raw.city, country: raw.country, latitude, longitude, phone: raw.phone || null, email: raw.email || null,
        website: raw.website || null, description: raw.description || null, price_range: price, timezone: raw.timezone,
        created_by: userId, owner_id: null, status: 'pending', photos: [], cover_image: null, opening_hours: {},
        ...Object.fromEntries((['halal_full','alcohol_free','women_only','prayer_room','wudu_facilities','burkini_friendly','vegetarian_options','vegan_options','accessible','parking'] as const).map(key => [key, boolValue(raw[key], key, line) ?? false])),
      }
      rows.push(payload)
    } catch (error) { errors.push(`Ligne ${line} : ${error instanceof Error ? error.message : 'donnée invalide.'}`) }
  }
  return { rows, errors, headers }
}

export function parseCsvForPreview(text: string, userId: string) {
  return validateCsvText(text, userId)
}
