import { supabase } from '../lib/supabase'
import { geocodeAddress } from '../lib/geocoding'
import { slugify } from '../lib/utils'
import { validateLocationForm, validateOpeningHours, validatePhotos, type LocationForm } from '../lib/validation'
import type { Location } from '../types/database'

export type LocationFeatures = Pick<Location, 'halal_full' | 'alcohol_free' | 'women_only' | 'prayer_room' | 'wudu_facilities' | 'burkini_friendly' | 'vegetarian_options' | 'vegan_options' | 'accessible' | 'parking'>

export type SubmitLocationInput = LocationForm & {
  features: LocationFeatures
  hours: Record<string, string>
  photos: File[]
  userId: string
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

export async function createLocation(input: SubmitLocationInput) {
  const formValidation = validateLocationForm(input)
  if (!formValidation.ok) throw new Error(formValidation.message)
  const hoursValidation = validateOpeningHours(input.hours)
  if (!hoursValidation.ok) throw new Error(hoursValidation.message)
  const photoValidation = validatePhotos(input.photos)
  if (!photoValidation.ok) throw new Error(photoValidation.message)

  const query = [input.address, input.city, input.country].filter(Boolean).join(', ')
  const coordinates = await geocodeAddress(query)
  if (!coordinates) throw new Error('Adresse introuvable. Vérifiez l’adresse, la ville et le pays.')

  const photos = await uploadLocationPhotos(input.userId, input.photos)
  const opening_hours = Object.fromEntries(Object.entries(input.hours).map(([day, value]) => [day, value.trim() || 'Fermé']))
  const payload = {
    name: input.name.trim(), category: input.category, address: input.address.trim() || null,
    city: input.city.trim(), country: input.country.trim(), phone: input.phone.trim() || null,
    email: input.email.trim() || null, website: input.website.trim() || null,
    description: input.description.trim() || null, slug: `${slugify(input.name) || 'lieu'}-${Math.random().toString(36).slice(2, 7)}`,
    owner_id: null, created_by: input.userId, status: 'pending', latitude: coordinates.latitude,
    longitude: coordinates.longitude, photos, cover_image: photos[0] || null, price_range: null,
    opening_hours, ...input.features,
  }
  const { error } = await supabase.from('locations').insert(payload)
  if (error) throw new Error(error.message)
}

type UpdateLocationInput = LocationForm & {
  hours: Record<string, string>
  photos: File[]
  existingPhotos: string[]
  userId: string
}

export async function updateLocation(locationId: string, input: UpdateLocationInput) {
  const formValidation = validateLocationForm(input)
  if (!formValidation.ok) throw new Error(formValidation.message)
  const hoursValidation = validateOpeningHours(input.hours)
  if (!hoursValidation.ok) throw new Error(hoursValidation.message)
  const photoValidation = validatePhotos(input.photos, input.existingPhotos.length)
  if (!photoValidation.ok) throw new Error(photoValidation.message)

  const query = [input.address, input.city, input.country].filter(Boolean).join(', ')
  const coordinates = await geocodeAddress(query)
  if (!coordinates) throw new Error('Adresse introuvable : vérifiez l’adresse, la ville et le pays.')
  const uploaded = await uploadLocationPhotos(input.userId, input.photos)
  const photos = [...input.existingPhotos, ...uploaded]
  const opening_hours = Object.fromEntries(Object.entries(input.hours).map(([day, value]) => [day, value.trim() || 'Fermé']))
  const { error } = await supabase.from('locations').update({
    name: input.name.trim(), category: input.category, address: input.address.trim() || null,
    city: input.city.trim(), country: input.country.trim(), phone: input.phone.trim() || null,
    email: input.email.trim() || null, website: input.website.trim() || null,
    description: input.description.trim() || null, latitude: coordinates.latitude, longitude: coordinates.longitude,
    photos, cover_image: photos[0] || null, opening_hours,
  }).eq('id', locationId)
  if (error) throw new Error(error.message)
}
