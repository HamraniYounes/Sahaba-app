type NominatimResult = { lat: string; lon: string }

const CACHE_PREFIX = 'sahaba:nominatim:v1:'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
let lastRequestAt = 0
let requestQueue: Promise<unknown> = Promise.resolve()

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function readCache(key: string): { latitude: number; longitude: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const cached = JSON.parse(raw) as { at: number; value: { latitude: number; longitude: number } }
    if (Date.now() - cached.at > CACHE_TTL_MS) { localStorage.removeItem(CACHE_PREFIX + key); return null }
    return cached.value
  } catch { return null }
}

function writeCache(key: string, value: { latitude: number; longitude: number }) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), value })) } catch { /* storage may be disabled */ }
}

export async function geocodeAddress(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = normalizeQuery(query)
  if (!normalized) return null
  const cached = readCache(encodeURIComponent(normalized))
  if (cached) return cached

  const task = requestQueue.then(async () => {
    const again = readCache(encodeURIComponent(normalized))
    if (again) return again
    const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt))
    if (wait) await new Promise(resolve => setTimeout(resolve, wait))
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query.trim())}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    lastRequestAt = Date.now()
    if (!response.ok) throw new Error('Le service de géocodage est momentanément indisponible.')
    const results = await response.json() as NominatimResult[]
    if (!results[0]) return null
    const value = { latitude: Number(results[0].lat), longitude: Number(results[0].lon) }
    if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) return null
    writeCache(encodeURIComponent(normalized), value)
    return value
  })
  requestQueue = task.then(() => undefined, () => undefined)
  return task
}
