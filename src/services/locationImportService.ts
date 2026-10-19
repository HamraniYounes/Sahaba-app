import { geocodeAddress } from '../lib/geocoding'
import { supabase } from '../lib/supabase'
import type { CsvLocationInsert } from '../lib/csvImport'

const BATCH_SIZE = 50

export type ImportLogEntry = { row: number; status: 'inserted' | 'skipped' | 'geocoded' | 'error'; message: string }
export type ImportResult = { inserted: number; skipped: number; geocoded: number; errors: number; log: ImportLogEntry[] }
export type GeocodingPreparationResult = { rows: CsvLocationInsert[]; geocoded: number; errors: number; log: ImportLogEntry[] }

function csvRowLabel(payload: CsvLocationInsert, index: number) {
  return `${payload.name} — ${payload.city} (ligne ${index + 2})`
}

export async function prepareLocationsWithGeocoding(rows: CsvLocationInsert[]): Promise<GeocodingPreparationResult> {
  const result: GeocodingPreparationResult = { rows: [], geocoded: 0, errors: 0, log: [] }
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE)
    for (let index = 0; index < batch.length; index += 1) {
      const row = batch[index]
      const line = offset + index + 2
      if (row.latitude != null || row.longitude != null) {
        result.rows.push(row)
        continue
      }
      const query = [row.address, row.city, row.country].filter(Boolean).join(', ')
      if (!query) {
        result.rows.push(row)
        result.log.push({ row: line, status: 'skipped', message: `${csvRowLabel(row, offset + index)} : aucune adresse à géocoder.` })
        continue
      }
      try {
        const coordinates = await geocodeAddress(query)
        if (!coordinates) {
          result.errors += 1
          result.log.push({ row: line, status: 'error', message: `${csvRowLabel(row, offset + index)} : aucune correspondance de géocodage.` })
          continue
        }
        result.rows.push({ ...row, latitude: coordinates.latitude, longitude: coordinates.longitude })
        result.geocoded += 1
        result.log.push({ row: line, status: 'geocoded', message: `${csvRowLabel(row, offset + index)} : coordonnées obtenues via le géocodage contrôlé.` })
      } catch (error) {
        result.errors += 1
        result.log.push({ row: line, status: 'error', message: `${csvRowLabel(row, offset + index)} : ${error instanceof Error ? error.message : 'géocodage impossible.'}` })
      }
    }
  }
  return result
}

export async function importLocationsInBatches(rows: CsvLocationInsert[]): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, geocoded: 0, errors: 0, log: [] }
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE)
    const slugs = batch.map(row => row.slug)
    const { data: existing, error: lookupError } = await supabase.from('locations').select('slug').in('slug', slugs)
    if (lookupError) {
      for (let index = 0; index < batch.length; index += 1) {
        result.errors += 1
        result.log.push({ row: offset + index + 2, status: 'error', message: `${csvRowLabel(batch[index], offset + index)} : ${lookupError.message}` })
      }
      continue
    }
    const existingSlugs = new Set((existing ?? []).map(row => row.slug))
    const pending = batch.filter(row => {
      const index = batch.indexOf(row)
      if (!row.slug || existingSlugs.has(row.slug)) {
        result.skipped += 1
        result.log.push({ row: offset + index + 2, status: 'skipped', message: `${csvRowLabel(row, offset + index)} : doublon déjà présent.` })
        return false
      }
      return true
    })
    if (!pending.length) continue

    const { error } = await supabase.from('locations').insert(pending)
    if (!error) {
      for (const row of pending) {
        result.inserted += 1
        result.log.push({ row: offset + batch.indexOf(row) + 2, status: 'inserted', message: `${row.name} — importé en attente de modération.` })
      }
      continue
    }

    // Keep the import journal useful: isolate row-level RLS/constraint failures without bypassing RLS.
    for (const row of pending) {
      const { error: rowError } = await supabase.from('locations').insert(row)
      const line = offset + batch.indexOf(row) + 2
      if (rowError) {
        result.errors += 1
        result.log.push({ row: line, status: 'error', message: `${csvRowLabel(row, offset + batch.indexOf(row))} : ${rowError.message}` })
      } else {
        result.inserted += 1
        result.log.push({ row: line, status: 'inserted', message: `${row.name} — importé en attente de modération.` })
      }
    }
  }
  return result
}

export { BATCH_SIZE }
