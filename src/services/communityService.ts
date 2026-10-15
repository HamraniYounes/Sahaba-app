import { supabase } from '../lib/supabase'

export interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  user_id: string
  owner_replies?: { id: string; body: string; owner_id: string; created_at: string }[]
}

export async function getLocationBySlug(slug: string) {
  return supabase.from('locations').select('*').eq('slug', slug).maybeSingle()
}

export async function incrementLocationViews(locationId: string, _currentCount?: number) {
  void _currentCount
  return supabase.rpc('increment_location_view', { p_location_id: locationId })
}

export async function getLocationReviews(locationId: string) {
  const reviews = await supabase.from('reviews').select('id,rating,comment,created_at,user_id').eq('location_id', locationId).order('created_at', { ascending: false }).limit(50)
  if (reviews.error || !reviews.data?.length) return { data: reviews.data ?? [], error: reviews.error }

  const reviewIds = reviews.data.map(review => review.id)
  const replies = await supabase.from('owner_replies').select('id,review_id,body,owner_id,created_at').in('review_id', reviewIds)
  if (replies.error) return { data: reviews.data, error: replies.error }

  const repliesByReview = new Map<string, { id: string; body: string; owner_id: string; created_at: string }[]>()
  for (const reply of replies.data ?? []) {
    const current = repliesByReview.get(reply.review_id) ?? []
    current.push({ id: reply.id, body: reply.body, owner_id: reply.owner_id, created_at: reply.created_at })
    repliesByReview.set(reply.review_id, current)
  }

  return {
    data: reviews.data.map(review => ({ ...review, owner_replies: repliesByReview.get(review.id) ?? [] })),
    error: null,
  }
}

export async function getFavoriteState(locationId: string, userId: string) {
  return supabase.from('favorites').select('id').eq('location_id', locationId).eq('user_id', userId).maybeSingle()
}

export async function listFavoriteIds(userId: string) {
  return supabase.from('favorites').select('location_id').eq('user_id', userId)
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
