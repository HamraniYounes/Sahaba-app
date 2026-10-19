import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('le géocodage passe par un proxy authentifié avec une limite globale', async () => {
  const client = await read('../src/lib/geocoding.ts')
  const config = await read('../supabase/config.toml')
  const migration = await read('../supabase/migrations/018_global_geocoding_rate_limit.sql')
  const fn = await read('../supabase/functions/geocode/index.ts')

  assert.match(client, /\/functions\/v1\/geocode/)
  assert.match(client, /Authorization: `Bearer \$\{accessToken\}`/)
  assert.doesNotMatch(client, /nominatim\.openstreetmap\.org\/search/)
  assert.match(config, /\[functions\.geocode\]/)
  assert.match(config, /verify_jwt = true/)
  assert.match(migration, /create table if not exists public\.geocoding_rate_limit/)
  assert.match(migration, /for update/)
  assert.match(migration, /grant execute on function public\.reserve_geocoding_slot\(integer\) to authenticated/)
  assert.doesNotMatch(migration, /grant .*geocoding_rate_limit.*authenticated/i)
  assert.match(fn, /reserve_geocoding_slot/)
  assert.match(fn, /MIN_INTERVAL_MS = 1100/)
  assert.match(fn, /User-Agent[\s\S]*Sahaba-App/i)
  assert.match(fn, /auth\.getUser\(\)/)
})
