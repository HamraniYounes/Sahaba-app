export type UserRole = 'admin' | 'moderator' | 'user'
export type LocationStatus = 'pending' | 'published' | 'rejected' | 'claimed'
export type LocationCategory =
  | 'restaurant' | 'fast_food' | 'cafe' | 'boulangerie' | 'boucherie'
  | 'epicerie' | 'mosquee' | 'salle_priere' | 'ecole_coran' | 'association'
  | 'funeraire' | 'sante' | 'bien_etre' | 'vetements' | 'librairie'
  | 'finance' | 'voyage' | 'hebergement' | 'services' | 'autre'

export interface Location {
  id: string
  name: string
  slug: string
  category: LocationCategory
  address: string | null
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  cover_image: string | null
  status: LocationStatus
  halal_full: boolean
  alcohol_free: boolean
  women_only: boolean
  prayer_room: boolean
  wudu_facilities: boolean
  burkini_friendly: boolean
  vegetarian_options: boolean
  vegan_options: boolean
  accessible: boolean
  parking: boolean
  price_range: number | null
  opening_hours: Record<string, unknown>
  average_rating: number
  review_count: number
  view_count: number
  favorite_count: number
  created_at: string
  owner_id: string | null
  created_by: string
  photos: string[]
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  contribution_badge?: string | null
}
