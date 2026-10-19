export type GeocodingResult = { latitude: number; longitude: number }

type NominatimResult = { lat: string; lon: string }

export const GEOCODING_MIN_INTERVAL_MS = 1100
export const GEOCODING_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const CACHE_PREFIX = 'sahaba:nominatim:v2:'
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
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(normalized)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    lastRequestAt = Date.now()
    if (!response.ok) throw new Error('Le service de géocodage est momentanément indisponible.')
    const results = await response.json() as NominatimResult[]
    if (!results[0]) return null
    const value = { latitude: Number(results[0].lat), longitude: Number(results[0].lon) }
    if (!Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90 || !Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
      throw new Error('Le service de géocodage a renvoyé des coordonnées invalides.')
    }
    writeCache(key, value)
    return value
  })
  requestQueue = task.then(() => undefined, () => undefined)
  return task
}
