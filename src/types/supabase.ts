/*
 * Generated database contract for the Supabase public schema.
 * Keep this file in sync with supabase/migrations before changing table shapes.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AppRole = 'admin' | 'moderator' | 'owner' | 'user'
export type LocationStatus = 'pending' | 'published' | 'rejected' | 'claimed'
export type ReportStatus = 'pending' | 'resolved' | 'rejected'
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type LocationCategory = 'restaurant' | 'fast_food' | 'cafe' | 'boulangerie' | 'boucherie' | 'epicerie' | 'mosquee' | 'salle_priere' | 'ecole_coran' | 'association' | 'funeraire' | 'sante' | 'bien_etre' | 'vetements' | 'librairie' | 'finance' | 'voyage' | 'hebergement' | 'services' | 'autre'
export type ClosureType = 'exceptional' | 'temporary' | 'definitive'
export type OwnershipTransferStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type RateLimitAction = 'location_create' | 'review_create' | 'claim_create' | 'report_create' | 'ownership_transfer_create'

type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null; role: AppRole; contribution_badge: string | null; created_at: string; updated_at: string }
type LocationRow = { id: string; name: string; slug: string; category: LocationCategory; address: string | null; city: string; country: string; latitude: number | null; longitude: number | null; phone: string | null; email: string | null; website: string | null; description: string | null; cover_image: string | null; photos: string[]; status: LocationStatus; created_by: string; owner_id: string | null; halal_full: boolean; alcohol_free: boolean; women_only: boolean; prayer_room: boolean; wudu_facilities: boolean; burkini_friendly: boolean; vegetarian_options: boolean; vegan_options: boolean; accessible: boolean; parking: boolean; price_range: number | null; opening_hours: Json; timezone: string; average_rating: number; review_count: number; view_count: number; favorite_count: number; moderation_note: string | null; moderated_by: string | null; moderated_at: string | null; created_at: string; updated_at: string }
type LocationClosureRow = { id: string; location_id: string; closure_type: ClosureType; starts_on: string; ends_on: string | null; reason: string | null; created_by: string; created_at: string; updated_at: string }
type ReviewRow = { id: string; location_id: string; user_id: string; rating: number; comment: string | null; is_hidden: boolean; created_at: string; updated_at: string }
type OwnerReplyRow = { id: string; review_id: string; owner_id: string; body: string; is_hidden: boolean; created_at: string; updated_at: string }
type FavoriteRow = { id: string; user_id: string; location_id: string; created_at: string }
type ReportRow = { id: string; location_id: string; reporter_id: string | null; reason: string; details: string | null; status: ReportStatus; resolved_by: string | null; resolved_at: string | null; created_at: string }
type ClaimRow = { id: string; location_id: string; claimant_id: string; evidence_path: string | null; message: string | null; status: ClaimStatus; reviewed_by: string | null; reviewed_at: string | null; created_at: string }
type ModerationSessionRow = { id: string; title: string; scheduled_at: string; note: string | null; created_by: string; created_at: string }
type AdRow = { id: string; title: string; description: string | null; cta_label: string | null; target_url: string | null; image_url: string | null; placement: string; is_active: boolean; starts_at: string | null; ends_at: string | null; created_by: string | null; created_at: string; updated_at: string }
type OwnershipTransferRow = { id: string; location_id: string; from_owner_id: string; to_user_id: string; message: string | null; status: OwnershipTransferStatus; reviewed_at: string | null; created_at: string }
type RateLimitEventRow = { id: number; actor_id: string; action: RateLimitAction; created_at: string }

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: { id: string; display_name?: string | null; avatar_url?: string | null; role?: AppRole; contribution_badge?: string | null; created_at?: string; updated_at?: string }; Update: Partial<ProfileRow>; Relationships: [] }
      locations: { Row: LocationRow; Insert: { id?: string; name: string; slug: string; category: LocationCategory; address?: string | null; city: string; country: string; latitude?: number | null; longitude?: number | null; phone?: string | null; email?: string | null; website?: string | null; description?: string | null; cover_image?: string | null; photos?: string[]; status?: LocationStatus; created_by: string; owner_id?: string | null; halal_full?: boolean; alcohol_free?: boolean; women_only?: boolean; prayer_room?: boolean; wudu_facilities?: boolean; burkini_friendly?: boolean; vegetarian_options?: boolean; vegan_options?: boolean; accessible?: boolean; parking?: boolean; price_range?: number | null; opening_hours?: Json; timezone?: string; average_rating?: number; review_count?: number; view_count?: number; favorite_count?: number; moderation_note?: string | null; moderated_by?: string | null; moderated_at?: string | null; created_at?: string; updated_at?: string }; Update: Partial<LocationRow>; Relationships: [] }
      location_closures: { Row: LocationClosureRow; Insert: { id?: string; location_id: string; closure_type: ClosureType; starts_on: string; ends_on?: string | null; reason?: string | null; created_by: string; created_at?: string; updated_at?: string }; Update: Partial<LocationClosureRow>; Relationships: [{ foreignKeyName: 'location_closures_location_id_fkey'; columns: ['location_id']; isOneToOne: false; referencedRelation: 'locations'; referencedColumns: ['id'] }] }
      reviews: { Row: ReviewRow; Insert: { id?: string; location_id: string; user_id: string; rating: number; comment?: string | null; is_hidden?: boolean; created_at?: string; updated_at?: string }; Update: Partial<ReviewRow>; Relationships: [{ foreignKeyName: 'reviews_location_id_fkey'; columns: ['location_id']; isOneToOne: false; referencedRelation: 'locations'; referencedColumns: ['id'] }] }
      owner_replies: { Row: OwnerReplyRow; Insert: { id?: string; review_id: string; owner_id: string; body: string; is_hidden?: boolean; created_at?: string; updated_at?: string }; Update: Partial<OwnerReplyRow>; Relationships: [{ foreignKeyName: 'owner_replies_review_id_fkey'; columns: ['review_id']; isOneToOne: true; referencedRelation: 'reviews'; referencedColumns: ['id'] }] }
      favorites: { Row: FavoriteRow; Insert: { id?: string; user_id: string; location_id: string; created_at?: string }; Update: Partial<FavoriteRow>; Relationships: [{ foreignKeyName: 'favorites_location_id_fkey'; columns: ['location_id']; isOneToOne: false; referencedRelation: 'locations'; referencedColumns: ['id'] }] }
      reports: { Row: ReportRow; Insert: { id?: string; location_id: string; reporter_id?: string | null; reason: string; details?: string | null; status?: ReportStatus; resolved_by?: string | null; resolved_at?: string | null; created_at?: string }; Update: Partial<ReportRow>; Relationships: [{ foreignKeyName: 'reports_location_id_fkey'; columns: ['location_id']; isOneToOne: false; referencedRelation: 'locations'; referencedColumns: ['id'] }] }
      claims: { Row: ClaimRow; Insert: { id?: string; location_id: string; claimant_id: string; evidence_path?: string | null; message?: string | null; status?: ClaimStatus; reviewed_by?: string | null; reviewed_at?: string | null; created_at?: string }; Update: Partial<ClaimRow>; Relationships: [{ foreignKeyName: 'claims_location_id_fkey'; columns: ['location_id']; isOneToOne: false; referencedRelation: 'locations'; referencedColumns: ['id'] }] }
      moderation_sessions: { Row: ModerationSessionRow; Insert: { id?: string; title: string; scheduled_at: string; note?: string | null; created_by: string; created_at?: string }; Update: Partial<ModerationSessionRow>; Relationships: [] }
      ads: { Row: AdRow; Insert: { id?: string; title: string; description?: string | null; cta_label?: string | null; target_url?: string | null; image_url?: string | null; placement?: string; is_active?: boolean; starts_at?: string | null; ends_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }; Update: Partial<AdRow>; Relationships: [] }
      ownership_transfers: { Row: OwnershipTransferRow; Insert: { id?: string; location_id: string; from_owner_id: string; to_user_id: string; message?: string | null; status?: OwnershipTransferStatus; reviewed_at?: string | null; created_at?: string }; Update: Partial<OwnershipTransferRow>; Relationships: [{ foreignKeyName: 'ownership_transfers_location_id_fkey'; columns: ['location_id']; isOneToOne: false; referencedRelation: 'locations'; referencedColumns: ['id'] }] }
      rate_limit_events: { Row: RateLimitEventRow; Insert: { id?: number; actor_id: string; action: RateLimitAction; created_at?: string }; Update: Partial<RateLimitEventRow>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      increment_location_view: { Args: { p_location_id: string }; Returns: undefined }
      approve_location_claim: { Args: { p_claim_id: string }; Returns: undefined }
      request_ownership_transfer: { Args: { p_location_id: string; p_target_email: string; p_message?: string }; Returns: string }
      accept_ownership_transfer: { Args: { p_transfer_id: string }; Returns: undefined }
      reject_ownership_transfer: { Args: { p_transfer_id: string }; Returns: undefined }
      cancel_ownership_transfer: { Args: { p_transfer_id: string }; Returns: undefined }
      delete_my_account: { Args: Record<string, never>; Returns: undefined }
      enforce_user_rate_limit: { Args: Record<string, never>; Returns: undefined }
    }
    Enums: { app_role: AppRole; location_status: LocationStatus; report_status: ReportStatus; claim_status: ClaimStatus }
    CompositeTypes: Record<string, never>
  }
}
