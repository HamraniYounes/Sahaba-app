import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NominatimResult = { lat: '', lon: '' }
const MIN_INTERVAL_MS = 1100
const APP_USER_AGENT = 'Sahaba-App/0.1 (+https://sahaba-app.netlify.app)'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) return json({ error: 'Geocoding service is not configured.' }, 500)

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401)

  let query: unknown
  try {
    const body = await request.json() as { query?: unknown }
    query = body.query
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  if (typeof query !== 'string' || !query.trim() || query.trim().length > 500) {
    return json({ error: 'A valid geocoding query is required.' }, 400)
  }

  const normalized = query.trim().replace(/\s+/g, ' ')
  const { data: waitMs, error: slotError } = await supabase.rpc('reserve_geocoding_slot', { p_interval_ms: MIN_INTERVAL_MS })
  if (slotError || typeof waitMs !== 'number') return json({ error: 'Geocoding rate limiter unavailable.' }, 503)
  if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs))

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(normalized)}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': APP_USER_AGENT,
    },
  })
  if (!response.ok) return json({ error: 'The geocoding service is temporarily unavailable.' }, 502)

  const results = await response.json() as Array<{ lat?: string; lon?: string }>
  const result = results[0]
  if (!result?.lat || !result.lon) return json({ latitude: null, longitude: null })

  const latitude = Number(result.lat)
  const longitude = Number(result.lon)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return json({ error: 'The geocoding service returned invalid coordinates.' }, 502)
  }

  return json({ latitude, longitude })
})
