import { supabase } from '../lib/supabase'
import type { Location } from '../types/database'

export type AdminRow = {
  id: string
  name?: string | null
  reason?: string | null
  details?: string | null
  message?: string | null
  claimant_id?: string | null
  rating?: number | null
  comment?: string | null
  is_hidden?: boolean
  created_at?: string | null
  location_id?: string | null
  location?: { name?: string | null; slug?: string | null; city?: string | null } | null
  display_name?: string | null
  role?: string | null
  contribution_badge?: string | null
  title?: string | null
  description?: string | null
  cta_label?: string | null
  target_url?: string | null
  placement?: 'home' | 'detail' | 'both'
  is_active?: boolean
}
export type AdminTab = 'pending' | 'published' | 'reports' | 'claims' | 'reviews' | 'users' | 'ads' | 'stats'
export type AdInput = { title: string; description: string | null; cta_label: string | null; target_url: string | null; placement: 'home' | 'detail' | 'both'; is_active: boolean }

export async function listModerationLocations(status: 'pending' | 'published') {
  return supabase.from('locations').select('*').eq('status', status).order('created_at', { ascending: true }).limit(250)
}

export async function listPendingQueue(table: 'reports' | 'claims') {
  return supabase.from(table).select('*,location:locations(name,slug,city)').eq('status', 'pending').order('created_at', { ascending: true })
}

export async function listAdminReviews() {
  return supabase.from('reviews').select('id,rating,comment,is_hidden,created_at,location_id,location:locations(name,slug,city)').order('created_at', { ascending: false }).limit(300)
}

export async function listAdminUsers() {
  return supabase.from('profiles').select('id,display_name,role,created_at,contribution_badge').order('created_at', { ascending: false }).limit(500)
}

export async function listAds() {
  return supabase.from('ads').select('*').order('created_at', { ascending: false })
}

export async function getAdminStats() {
  const [users, locations, pending, reviews, ads, reports] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('locations').select('id', { count: 'exact', head: true }).in('status', ['published', 'claimed']),
    supabase.from('locations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('ads').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  return { users, locations, pending, reviews, ads, reports }
}

export async function moderateLocation(id: string, status: 'published' | 'rejected') {
  return supabase.from('locations').update({ status, moderation_note: status === 'rejected' ? 'Rejeté depuis l’administration' : null, moderated_at: new Date().toISOString() }).eq('id', id)
}

export async function approveLocationClaim(claimId: string) {
  return supabase.rpc('approve_location_claim', { p_claim_id: claimId })
}

export async function resolveModerationItem(table: 'reports' | 'claims', id: string, approved: boolean) {
  const payload = table === 'claims'
    ? { status: 'rejected', reviewed_at: new Date().toISOString() }
    : { status: approved ? 'resolved' : 'rejected', resolved_at: new Date().toISOString() }
  return supabase.from(table).update(payload).eq('id', id)
}

export async function saveAd(ad: AdInput, editingId: string | null) {
  return editingId
    ? supabase.from('ads').update(ad).eq('id', editingId)
    : supabase.from('ads').insert(ad)
}

export async function toggleReviewVisibility(id: string, hidden: boolean) {
  return supabase.from('reviews').update({ is_hidden: hidden }).eq('id', id)
}

export async function changeUserRole(id: string, role: string) {
  return supabase.from('profiles').update({ role }).eq('id', id)
}

export async function toggleAdActive(id: string, active: boolean) {
  return supabase.from('ads').update({ is_active: active }).eq('id', id)
}

export async function deleteAd(id: string) {
  return supabase.from('ads').delete().eq('id', id)
}

export type AdminLocationResult = { data: Location[] | null; error: { message: string } | null }
