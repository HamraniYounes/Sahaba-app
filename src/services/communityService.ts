import { supabase } from '../lib/supabase'
import type { Location } from '../types/database'

export interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  user_id: string
  owner_replies?: { id: string; body: string; owner_id: string; created_at: string }[]
}

const REVIEW_SELECT = 'id,rating,comment,created_at,user_id,owner_replies(id,body,owner_id,created_at)'

export async function getLocationBySlug(slug: string) {
  return supabase.from('locations').select('*').eq('slug', slug).maybeSingle<Location>()
}

export async function incrementLocationViews(locationId: string, _currentCount?: number) {
  void _currentCount
  return supabase.rpc('increment_location_view', { p_location_id: locationId })
}

export async function getLocationReviews(locationId: string) {
  return supabase.from('reviews').select(REVIEW_SELECT).eq('location_id', locationId).order('created_at', { ascending: false }).limit(50)
}

export async function getFavoriteState(locationId: string, userId: string) {
  return supabase.from('favorites').select('id').eq('location_id', locationId).eq('user_id', userId).maybeSingle()
}

export async function listFavorites(userId: string) {
  return supabase.from('favorites').select('location:locations(*)').eq('user_id', userId)
}

export async function removeFavorite(userId: string, locationId: string) {
  return supabase.from('favorites').delete().eq('user_id', userId).eq('location_id', locationId)
}

export async function setFavorite(userId: string, locationId: string, active: boolean) {
  return active
    ? supabase.from('favorites').insert({ user_id: userId, location_id: locationId })
    : supabase.from('favorites').delete().eq('location_id', locationId).eq('user_id', userId)
}

export async function upsertReview(locationId: string, userId: string, rating: number, comment: string | null) {
  return supabase.from('reviews').upsert({ location_id: locationId, user_id: userId, rating, comment }, { onConflict: 'location_id,user_id' })
}

export async function submitReport(locationId: string, reporterId: string | null, reason: string) {
  return supabase.from('reports').insert({ location_id: locationId, reporter_id: reporterId, reason, details: null })
}

export async function submitClaim(locationId: string, claimantId: string, message: string | null) {
  return supabase.from('claims').insert({ location_id: locationId, claimant_id: claimantId, message })
}

export async function upsertOwnerReply(reviewId: string, ownerId: string, body: string) {
  return supabase.from('owner_replies').upsert({ review_id: reviewId, owner_id: ownerId, body }, { onConflict: 'review_id' })
}
