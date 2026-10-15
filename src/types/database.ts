import type { Database, Json, LocationCategory as GeneratedLocationCategory } from './supabase'

export type UserRole = Database['public']['Enums']['app_role']
export type LocationStatus = Database['public']['Enums']['location_status']
export type LocationCategory = GeneratedLocationCategory

export type Location = Database['public']['Tables']['locations']['Row']
export type LocationSummary = Pick<Location, 'id' | 'slug' | 'name' | 'category' | 'city' | 'country' | 'cover_image' | 'halal_full' | 'average_rating' | 'review_count'>
export type Profile = Database['public']['Tables']['profiles']['Row']
export type OpeningHours = Json