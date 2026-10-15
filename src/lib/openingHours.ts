import type { DayKey, LocationClosure, OpeningHours, OpeningInterval } from '../types/database'

export const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi',
  friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
}

const LEGACY_RANGE_RE = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/

export function emptyOpeningHours(): OpeningHours {
  return Object.fromEntries(DAY_KEYS.map(day => [day, []])) as OpeningHours
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function normalizeIntervals(value: unknown): OpeningInterval[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (!item || typeof item !== 'object') return []
      const candidate = item as { open?: unknown; close?: unknown }
      return validTime(candidate.open) && validTime(candidate.close) ? [{ open: candidate.open, close: candidate.close }] : []
    })
  }
  if (typeof value === 'string') {
    if (!value.trim() || /^(fermé|ferme)$/i.test(value.trim())) return []
    const match = value.trim().match(LEGACY_RANGE_RE)
    return match ? [{ open: match[1], close: match[2] }] : []
  }
  return []
}

export function normalizeOpeningHours(value: unknown): OpeningHours {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return Object.fromEntries(DAY_KEYS.map(day => [day, normalizeIntervals(source[day])])) as OpeningHours
}

export function validateOpeningHoursValue(hours: OpeningHours): string | null {
  for (const day of DAY_KEYS) {
    const intervals = hours[day] || []
    if (intervals.length > 4) return `${DAY_LABELS[day]} ne peut pas contenir plus de 4 plages horaires.`
    for (const interval of intervals) {
      if (!validTime(interval.open) || !validTime(interval.close)) return `Horaire invalide pour ${DAY_LABELS[day]}.`
      if (interval.open === interval.close) return `La plage ${DAY_LABELS[day]} ${interval.open}–${interval.close} est invalide.`
    }
  }
  return null
}

export function formatOpeningIntervals(intervals: OpeningInterval[]): string {
  return intervals.length ? intervals.map(interval => `${interval.open}–${interval.close}`).join(' · ') : 'Fermé'
}

function minutes(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
}

function localParts(date: Date, timeZone: string): { day: DayKey; date: string; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
    const weekdayMap: Record<string, DayKey> = { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday', Sat: 'saturday', Sun: 'sunday' }
    return { day: weekdayMap[values.weekday] || 'monday', date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) }
  } catch {
    const fallback = new Date(date)
    const day = DAY_KEYS[(fallback.getDay() + 6) % 7]
    return { day, date: fallback.toISOString().slice(0, 10), minutes: fallback.getHours() * 60 + fallback.getMinutes() }
  }
}

function previousDay(day: DayKey): DayKey {
  return DAY_KEYS[(DAY_KEYS.indexOf(day) + 6) % 7]
}

function intervalIsOpen(interval: OpeningInterval, currentMinutes: number, previousDayInterval = false): boolean {
  const start = minutes(interval.open)
  const end = minutes(interval.close)
  if (start < end) return !previousDayInterval && currentMinutes >= start && currentMinutes < end
  if (start > end) return previousDayInterval ? currentMinutes < end : currentMinutes >= start
  return false
}

export function isLocationClosedOnDate(closures: LocationClosure[], localDate: string): LocationClosure | null {
  return closures.find(closure => closure.starts_on <= localDate && (closure.ends_on === null || closure.ends_on >= localDate)) || null
}

export function getOpeningStatus(hoursValue: unknown, timeZone: string, closures: LocationClosure[] = [], now = new Date()): { isOpen: boolean; reason: 'open' | 'closed' | 'exceptional' | 'temporary' | 'definitive'; nextOpening: string | null } {
  const hours = normalizeOpeningHours(hoursValue)
  const current = localParts(now, timeZone)
  const closure = isLocationClosedOnDate(closures, current.date)
  if (closure) return { isOpen: false, reason: closure.closure_type, nextOpening: null }

  const todayIntervals = hours[current.day]
  const previousIntervals = hours[previousDay(current.day)]
  const openToday = todayIntervals.some(interval => intervalIsOpen(interval, current.minutes))
  const openFromYesterday = previousIntervals.some(interval => intervalIsOpen(interval, current.minutes, true))
  if (openToday || openFromYesterday) return { isOpen: true, reason: 'open', nextOpening: null }

  for (let offset = 0; offset < 8; offset += 1) {
    const day = DAY_KEYS[(DAY_KEYS.indexOf(current.day) + offset) % 7]
    if (hours[day].length) return { isOpen: false, reason: 'closed', nextOpening: hours[day][0].open }
  }
  return { isOpen: false, reason: 'closed', nextOpening: null }
}

export function timezoneOptions(): string[] {
  const values = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return values.length ? values : ['Europe/Brussels', 'Europe/Paris', 'Europe/London', 'Africa/Casablanca', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kuala_Lumpur', 'America/New_York', 'America/Los_Angeles']
}
