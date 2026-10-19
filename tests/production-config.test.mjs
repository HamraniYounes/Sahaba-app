
test('la soumission ne demande pas les coordonnées manuellement', async () => {
  const submit = await read('../src/pages/SubmitLocation.tsx')
  const service = await read('../src/services/locationService.ts')
  assert.doesNotMatch(submit, /name=["']latitude["']|name=["']longitude["']/i)
  assert.match(service, /geocodeAddress/)
  assert.match(service, /owner_id: null/)
})

test('les appels Nominatim partagent un cache et une temporisation locale', async () => {
  const geocoder = await read('../src/lib/geocoding.ts')
  assert.match(geocoder, /GEOCODING_CACHE_TTL_MS/)
  assert.match(geocoder, /GEOCODING_MIN_INTERVAL_MS = 1100/)
  assert.match(geocoder, /GEOCODING_MIN_INTERVAL_MS - \(Date\.now\(\) - lastRequestAt\)/)
})

test('le domaine canonique et les langues actives sont configurables et prudents', async () => {
  const seo = await read('../src/components/Seo.tsx')
  const locale = await read('../src/lib/locale.ts')
  assert.match(seo, /VITE_SITE_URL/)
  assert.match(locale, /ACTIVE_LOCALES = \['fr'\]/)
  assert.match(locale, /documentElement\.dir/)
})
