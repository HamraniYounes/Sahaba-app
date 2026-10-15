import { supabase } from '../lib/supabase'
import type { CsvLocationInsert } from '../lib/csvImport'

const BATCH_SIZE = 50

export type ImportLogEntry = { row: number; status: 'inserted' | 'skipped' | 'error'; message: string }
export type ImportResult = { inserted: number; skipped: number; errors: number; log: ImportLogEntry[] }

function csvRowLabel(payload: CsvLocationInsert, index: number) {
  return `${payload.name} — ${payload.city} (ligne ${index + 2})`
}

export async function importLocationsInBatches(rows: CsvLocationInsert[]): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, errors: 0, log: [] }
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
      if (!row.slug || existingSlugs.has(row.slug)) {
        result.skipped += 1
        result.log.push({ row: offset + batch.indexOf(row) + 2, status: 'skipped', message: `${csvRowLabel(row, offset + batch.indexOf(row))} : doublon déjà présent.` })
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
