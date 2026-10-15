import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('les en-têtes de sécurité sont configurés pour Netlify', async () => {
  const config = await read('../netlify.toml')
  for (const header of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) assert.ok(config.includes(header), `en-tête manquant: ${header}`)
})

test('les rôles de modération ont un lien direct vers la modification des fiches', async () => {
  const admin = await read('../src/pages/Admin.tsx')
  const edit = await read('../src/pages/EditLocation.tsx')
  assert.match(admin, /location\/\$\{place\.slug\}\/edit/)
  assert.match(edit, /profile\?\.role!==\x27admin\x27&&profile\?\.role!==\x27moderator\x27/)
  assert.match(edit, /openingHours/)
  assert.match(edit, /existingPhotos/)
})

test('la soumission ne demande pas les coordonnées manuellement', async () => {
  const submit = await read('../src/pages/SubmitLocation.tsx')
  assert.doesNotMatch(submit, /name=["']latitude["']|name=["']longitude["']/i)
  assert.match(submit, /geocodeAddress/)
  assert.match(submit, /owner_id:null/)
})

test('les appels Nominatim partagent un cache et une temporisation locale', async () => {
  const geocoder = await read('../src/lib/geocoding.ts')
  assert.match(geocoder, /CACHE_TTL_MS/)
  assert.match(geocoder, /1100 - \(Date\.now\(\) - lastRequestAt\)/)
})

test('le domaine canonique et les langues actives sont configurables et prudents', async () => {
  const seo = await read('../src/components/Seo.tsx')
  const locale = await read('../src/lib/locale.ts')
  assert.match(seo, /VITE_SITE_URL/)
  assert.match(locale, /ACTIVE_LOCALES = \['fr'\]/)
  assert.match(locale, /documentElement\.dir/)
})
