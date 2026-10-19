import { supabase } from './supabase'

export type GeocodingResult = { latitude: number; longitude: number }

export const GEOCODING_MIN_INTERVAL_MS = 1100
export const GEOCODING_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const CACHE_PREFIX = 'sahaba:nominatim:v3:'
let lastRequestAt = 0
let requestQueue: Promise<unknown> = Promise.resolve()

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function cacheKey(query: string) {
  return CACHE_PREFIX + encodeURIComponent(normalizeQuery(query))
}

function readCache(key: string): GeocodingResult | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw) as { at: number; value: GeocodingResult }
    if (Date.now() - cached.at > GEOCODING_CACHE_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    if (!Number.isFinite(cached.value.latitude) || !Number.isFinite(cached.value.longitude)) return null
    return cached.value
  } catch { return null }
}

function writeCache(key: string, value: GeocodingResult) {
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), value })) } catch { /* storage may be disabled */ }
}

export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  const normalized = normalizeQuery(query)
  if (!normalized) return null
  const key = cacheKey(normalized)
  const cached = readCache(key)
  if (cached) return cached

  const task = requestQueue.then(async () => {
    const again = readCache(key)
    if (again) return again
    const wait = Math.max(0, GEOCODING_MIN_INTERVAL_MS - (Date.now() - lastRequestAt))
    if (wait) await new Promise(resolve => setTimeout(resolve, wait))

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error('Votre session a expiré. Reconnectez-vous avant de géocoder cette adresse.')
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
    if (!supabaseUrl) throw new Error('Le service de géocodage n’est pas configuré.')

    const response = await fetch(`${supabaseUrl}/functions/v1/geocode`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: normalized }),
    })
    lastRequestAt = Date.now()
    if (!response.ok) throw new Error('Le service de géocodage est momentanément indisponible.')
    const result = await response.json() as { latitude?: unknown; longitude?: unknown }
    if (result.latitude == null || result.longitude == null) return null
    const value = { latitude: Number(result.latitude), longitude: Number(result.longitude) }
    if (!Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90 || !Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
      throw new Error('Le service de géocodage a renvoyé des coordonnées invalides.')
    }
    writeCache(key, value)
    return value
  })
  requestQueue = task.then(() => undefined, () => undefined)
  return task
}
