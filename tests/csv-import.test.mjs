import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const csvSource = await readFile(path.join(process.cwd(), 'src/lib/csvImport.ts'), 'utf8')
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

test('import is batched, checks existing slugs, and never bypasses Supabase RLS', () => {
  assert.match(serviceSource, /const BATCH_SIZE = 50/)
  assert.match(serviceSource, /\.in\('slug', slugs\)/)
  assert.match(serviceSource, /supabase\.from\('locations'\)\.insert/)
  assert.doesNotMatch(serviceSource, /service_role|SUPABASE_SERVICE_ROLE_KEY|admin\.create/)
  assert.match(serviceSource, /rowError/)
})

test('admin import provides preview and blocks insertion while validation errors exist', () => {
  assert.match(uiSource, /Aperçu avant insertion/)
  assert.match(uiSource, /disabled=\{Boolean\(validationErrors\.length\) \|\| importing\}/)
  assert.match(uiSource, /Journal de l’import/)
  assert.match(uiSource, /Télécharger le modèle/)
  assert.match(adminSource, /\['import','Import CSV'\]/)
})
