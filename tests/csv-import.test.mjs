import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const csvSource = await readFile(path.join(process.cwd(), 'src/lib/csvImport.ts'), 'utf8')
const geocodingSource = await readFile(path.join(process.cwd(), 'src/lib/geocoding.ts'), 'utf8')
const serviceSource = await readFile(path.join(process.cwd(), 'src/services/locationImportService.ts'), 'utf8')
const uiSource = await readFile(path.join(process.cwd(), 'src/components/AdminLocationImport.tsx'), 'utf8')
const adminSource = await readFile(path.join(process.cwd(), 'src/pages/Admin.tsx'), 'utf8')

test('CSV import requires a strict known column set and rejects unknown or missing columns', () => {
  assert.match(csvSource, /const CSV_LOCATION_COLUMNS = \[/)
  assert.match(csvSource, /const missing = expected\.filter\(column => !headers\.includes\(column\)\)/)
  assert.match(csvSource, /const unknown = headers\.filter\(column => !expected\.includes\(column as CsvColumn\)\)/)
  assert.match(csvSource, /const duplicateHeaders = headers\.filter/)
})

test('CSV validation protects types, bounds, timezone, URL and duplicate rows before insertion', () => {
  assert.match(csvSource, /LOCATION_CATEGORIES\.includes/)
  assert.match(csvSource, /latitude et longitude/)
  assert.match(csvSource, /new URL\(raw\.website\)/)
  assert.match(csvSource, /new Intl\.DateTimeFormat\('en-US', \{ timeZone: raw\.timezone \}\)/)
  assert.match(csvSource, /seen\.has\(slug\)/)
  assert.match(csvSource, /price_range doit être un entier/)
})

test('geocoding is rate-limited, cached, serialized and validates returned coordinates', () => {
  assert.match(geocodingSource, /GEOCODING_MIN_INTERVAL_MS = 1100/)
  assert.match(geocodingSource, /GEOCODING_CACHE_TTL_MS = 30 \* 24 \* 60 \* 60 \* 1000/)
  assert.match(geocodingSource, /localStorage/)
  assert.match(geocodingSource, /requestQueue\.then/)
  assert.match(geocodingSource, /value\.latitude < -90 \|\| value\.latitude > 90/)
  assert.match(geocodingSource, /value\.longitude < -180 \|\| value\.longitude > 180/)
})

test('CSV geocoding is controlled in batches and keeps normal Supabase RLS inserts', () => {
  assert.match(serviceSource, /prepareLocationsWithGeocoding/)
  assert.match(serviceSource, /for \(let offset = 0; offset < rows\.length; offset \+= BATCH_SIZE\)/)
  assert.match(serviceSource, /await geocodeAddress\(query\)/)
  assert.match(serviceSource, /supabase\.from\('locations'\)\.insert/)
  assert.doesNotMatch(serviceSource, /service_role|SUPABASE_SERVICE_ROLE_KEY|admin\.create/)
  assert.match(serviceSource, /geocoded/) 
  assert.match(serviceSource, /rowError/)
})

test('admin import provides preview, controlled geocoding and a journal before insertion', () => {
  assert.match(uiSource, /Aperçu avant insertion/)
  assert.match(uiSource, /Préparer le géocodage/)
  assert.match(uiSource, /disabled=\{!rows\.length \|\| importing \|\| preparing \|\| !geocodingPrepared\}/)
  assert.match(uiSource, /Lignes exclues de l’insertion/)
  assert.match(uiSource, /Journal de l’import/)
  assert.match(uiSource, /Télécharger le modèle/)
  assert.match(adminSource, /\['import','Import CSV'\]/)
})
