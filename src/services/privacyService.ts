import { supabase } from '../lib/supabase'

export type PersonalDataExport = {
  exported_at: string
  account: {
    id: string
    email: string | null
  }
  profile: unknown
  locations: unknown[]
  reviews: unknown[]
  favorites: unknown[]
  claims: unknown[]
  reports: unknown[]
  owner_replies: unknown[]
  ownership_transfers: unknown[]
}

export async function exportPersonalData(userId: string, email: string | null): Promise<PersonalDataExport> {
  const [profile, locationsCreated, locationsOwned, reviews, favorites, claims, reports, ownerReplies, transfers] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url, role, contribution_badge, created_at, updated_at').eq('id', userId).maybeSingle(),
    supabase.from('locations').select('id, name, slug, category, address, city, country, latitude, longitude, phone, email, website, description, cover_image, photos, status, created_by, owner_id, created_at, updated_at').eq('created_by', userId),
    supabase.from('locations').select('id, name, slug, category, address, city, country, latitude, longitude, phone, email, website, description, cover_image, photos, status, created_by, owner_id, created_at, updated_at').eq('owner_id', userId),
    supabase.from('reviews').select('id, location_id, user_id, rating, comment, is_hidden, created_at, updated_at').eq('user_id', userId),
    supabase.from('favorites').select('id, user_id, location_id, created_at').eq('user_id', userId),
    supabase.from('claims').select('id, location_id, claimant_id, evidence_path, message, status, reviewed_by, reviewed_at, created_at').eq('claimant_id', userId),
    supabase.from('reports').select('id, location_id, reporter_id, reason, details, status, resolved_by, resolved_at, created_at').eq('reporter_id', userId),
    supabase.from('owner_replies').select('id, review_id, owner_id, body, is_hidden, created_at, updated_at').eq('owner_id', userId),
    supabase.from('ownership_transfers').select('id, location_id, from_owner_id, to_user_id, message, status, reviewed_at, created_at').or(`from_owner_id.eq.${userId},to_user_id.eq.${userId}`),
  ])

  const results = [profile, locationsCreated, locationsOwned, reviews, favorites, claims, reports, ownerReplies, transfers]
  const failed = results.find(result => result.error)
  if (failed?.error) throw new Error(`Export impossible : ${failed.error.message}`)

  const locationMap = new Map<string, unknown>()
  for (const location of [...(locationsCreated.data ?? []), ...(locationsOwned.data ?? [])]) locationMap.set(location.id, location)

  return {
    exported_at: new Date().toISOString(),
    account: { id: userId, email },
    profile: profile.data,
    locations: [...locationMap.values()],
    reviews: reviews.data ?? [],
    favorites: favorites.data ?? [],
    claims: claims.data ?? [],
    reports: reports.data ?? [],
    owner_replies: ownerReplies.data ?? [],
    ownership_transfers: transfers.data ?? [],
  }
}

export function downloadPersonalData(data: PersonalDataExport) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `sahaba-donnees-personnelles-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
