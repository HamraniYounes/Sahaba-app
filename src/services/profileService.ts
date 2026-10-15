import { supabase } from '../lib/supabase'
import type { Location } from '../types/database'

export async function getUserLocations(userId: string) {
  return supabase.from('locations').select('*').eq('created_by', userId).order('created_at', { ascending: false })
}

export async function getUserStats(userId: string) {
  const [reviews, favorites] = await Promise.all([
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  return { reviews, favorites }
}

export async function updateProfileDisplayName(userId: string, displayName: string) {
  return supabase.from('profiles').update({ display_name: displayName }).eq('id', userId)
}

export type UserLocationsResult = { data: Location[] | null; error: { message: string } | null }
