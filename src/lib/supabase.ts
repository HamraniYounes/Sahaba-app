import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  url && anonKey && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) &&
  !url.includes('YOUR_PROJECT') && !anonKey.includes('YOUR_SUPABASE'),
)

// Placeholder keeps the UI renderable before configuration. Gate every operation with isSupabaseConfigured.
// Never expose a service_role key in frontend environment variables.
export const supabase = createClient(
  isSupabaseConfigured ? url! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey! : 'placeholder-anon-key',
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } },
)
