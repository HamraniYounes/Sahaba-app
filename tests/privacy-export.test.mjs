import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const profile = await readFile(new URL('../src/pages/Profile.tsx', import.meta.url), 'utf8')
const service = await readFile(new URL('../src/services/privacyService.ts', import.meta.url), 'utf8')

test('profile exposes a personal data export action', () => {
  assert.match(profile, /Exporter mes données/)
  assert.match(profile, /exportPersonalData\(/)
  assert.match(profile, /downloadPersonalData\(/)
})

test('privacy export only uses the authenticated Supabase client', () => {
  assert.match(service, /from\('profiles'\)/)
  assert.match(service, /from\('locations'\)/)
  assert.match(service, /from\('ownership_transfers'\)/)
  assert.doesNotMatch(service, /service_role/i)
  assert.doesNotMatch(service, /VITE_SUPABASE_SERVICE_ROLE/i)
})
