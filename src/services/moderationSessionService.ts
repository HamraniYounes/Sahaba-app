import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

export type ModerationSession = Database['public']['Tables']['moderation_sessions']['Row']
export type ModerationSessionInput = Pick<Database['public']['Tables']['moderation_sessions']['Insert'], 'title' | 'scheduled_at' | 'note'>

export async function listModerationSessions() {
  return supabase
    .from('moderation_sessions')
    .select('*')
    .order('scheduled_at', { ascending: true })
    .limit(200)
}

export async function createModerationSession(input: ModerationSessionInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return { data: null, error: userError ?? new Error('Authentification requise.') }
  }
  return supabase
    .from('moderation_sessions')
    .insert({ ...input, created_by: userData.user.id })
    .select('*')
    .single()
}

export async function updateModerationSession(id: string, input: ModerationSessionInput) {
  return supabase
    .from('moderation_sessions')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()
}

export async function deleteModerationSession(id: string) {
  return supabase.from('moderation_sessions').delete().eq('id', id)
}
