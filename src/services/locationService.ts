import { supabase } from '../lib/supabase'
import { geocodeAddress } from '../lib/geocoding'
import { slugify } from '../lib/utils'
import { validateLocationForm, validateOpeningHours, validatePhotos, type LocationForm } from '../lib/validation'
import { normalizeOpeningHours } from '../lib/openingHours'
import type { Database } from '../types/supabase'
import type { Location, LocationClosure, OpeningHours } from '../types/database'

export type LocationFeatures = Pick<Location, 'halal_full' | 'alcohol_free' | 'women_only' | 'prayer_room' | 'wudu_facilities' | 'burkini_friendly' | 'vegetarian_options' | 'vegan_options' | 'accessible' | 'parking'>

export type SubmitLocationInput = LocationForm & {
  features: LocationFeatures
  hours: OpeningHours
  photos: File[]
  userId: string
  timezone: string
}

export async function uploadLocationPhotos(userId: string, files: File[]): Promise<string[]> {
  const validation = validatePhotos(files)
  if (!validation.ok) throw new Error(validation.message)
  const uploaded: string[] = []
  for (const file of files) {
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from('location-photos').upload(path, file, { upsert: false, contentType: file.type })
    if (error) throw new Error(`Photo non envoyée : ${error.message}`)
    uploaded.push(supabase.storage.from('location-photos').getPublicUrl(path).data.publicUrl)
  }
  return uploaded
}

function ensureTimezone(timezone: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format() } catch { throw new Error('Le fuseau horaire sélectionné est invalide.') }
}

export async function createLocation(input: SubmitLocationInput) {
  const formValidation = validateLocationForm(input)
  if (!formValidation.ok) throw new Error(formValidation.message)
  const hoursValidation = validateOpeningHours(input.hours)
  if (!hoursValidation.ok) throw new Error(hoursValidation.message)
  const photoValidation = validatePhotos(input.photos)
  if (!photoValidation.ok) throw new Error(photoValidation.message)
  ensureTimezone(input.timezone)

  const query = [input.address, input.city, input.country].filter(Boolean).join(', ')
  const coordinates = await geocodeAddress(query)
  if (!coordinates) throw new Error('Adresse introuvable. Vérifiez l’adresse, la ville et le pays.')

  const photos = await uploadLocationPhotos(input.userId, input.photos)
  const opening_hours = normalizeOpeningHours(input.hours)
  const payload: Database['public']['Tables']['locations']['Insert'] = {
    name: input.name.trim(), category: input.category, address: input.address.trim() || null,
    city: input.city.trim(), country: input.country.trim(), phone: input.phone.trim() || null,
    email: input.email.trim() || null, website: input.website.trim() || null,
    description: input.description.trim() || null, slug: `${slugify(input.name) || 'lieu'}-${Math.random().toString(36).slice(2, 7)}`,
    owner_id: null, created_by: input.userId, status: 'pending', latitude: coordinates.latitude,
    longitude: coordinates.longitude, photos, cover_image: photos[0] || null, price_range: null,
    opening_hours, timezone: input.timezone, ...input.features,
  }
  const { error } = await supabase.from('locations').insert(payload)
  if (error) throw new Error(error.message)
}

type UpdateLocationInput = LocationForm & {
  hours: OpeningHours
  photos: File[]
  existingPhotos: string[]
  userId: string
  timezone: string
}

export async function updateLocation(locationId: string, input: UpdateLocationInput) {
  const formValidation = validateLocationForm(input)
  if (!formValidation.ok) throw new Error(formValidation.message)
  const hoursValidation = validateOpeningHours(input.hours)
  if (!hoursValidation.ok) throw new Error(hoursValidation.message)
  const photoValidation = validatePhotos(input.photos, input.existingPhotos.length)
  if (!photoValidation.ok) throw new Error(photoValidation.message)
  ensureTimezone(input.timezone)

  const query = [input.address, input.city, input.country].filter(Boolean).join(', ')
  const coordinates = await geocodeAddress(query)
  if (!coordinates) throw new Error('Adresse introuvable : vérifiez l’adresse, la ville et le pays.')
  const uploaded = await uploadLocationPhotos(input.userId, input.photos)
  const photos = [...input.existingPhotos, ...uploaded]
  const opening_hours = normalizeOpeningHours(input.hours)
  const { error } = await supabase.from('locations').update({
    name: input.name.trim(), category: input.category, address: input.address.trim() || null,
    city: input.city.trim(), country: input.country.trim(), phone: input.phone.trim() || null,
    email: input.email.trim() || null, website: input.website.trim() || null,
    description: input.description.trim() || null, latitude: coordinates.latitude, longitude: coordinates.longitude,
    photos, cover_image: photos[0] || null, opening_hours, timezone: input.timezone,
  }).eq('id', locationId)
  if (error) throw new Error(error.message)
}

export async function getLocationClosures(locationId: string) {
  return supabase.from('location_closures').select('*').eq('location_id', locationId).order('starts_on', { ascending: true })
}

export async function getLocationClosuresForLocations(locationIds: string[]) {
  if (!locationIds.length) return { data: [] as LocationClosure[], error: null }
  return supabase.from('location_closures').select('*').in('location_id', locationIds).order('starts_on', { ascending: true })
}

export async function createLocationClosure(input: Omit<Database['public']['Tables']['location_closures']['Insert'], 'created_by'> & { created_by: string }) {
  const { data, error } = await supabase.from('location_closures').insert(input).select('*').single()
  return { data, error }
}

export async function deleteLocationClosure(closureId: string) {
  return supabase.from('location_closures').delete().eq('id', closureId)
}
