import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const source = await readFile(path.join(process.cwd(), 'src/lib/openingHours.ts'), 'utf8')

test('opening hours normalizer keeps an explicit OpeningHours shape', () => {
  assert.match(source, /return \{ monday: \[\], tuesday: \[\], wednesday: \[\], thursday: \[\], friday: \[\], saturday: \[\], sunday: \[\] \}/)
  assert.doesNotMatch(source, /Object\.fromEntries\([^\n]*as OpeningHours/)
})

test('opening hours normalizer assigns every known day explicitly', () => {
  assert.match(source, /for \(const day of DAY_KEYS\) normalized\[day\] = normalizeIntervals\(source\[day\]\)/)
})
