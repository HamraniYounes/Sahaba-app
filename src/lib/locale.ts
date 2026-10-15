/** Only French is fully enabled today. Do not add a locale here until its UI, email, legal and RTL checks pass. */
export const ACTIVE_LOCALES = ['fr'] as const
export type ActiveLocale = (typeof ACTIVE_LOCALES)[number]
const RTL_LOCALES = new Set(['ar', 'fa', 'ur', 'he'])

export function applyDocumentLocale(locale: string): void {
  const normalized = locale.toLowerCase().split('-')[0]
  document.documentElement.lang = normalized
  document.documentElement.dir = RTL_LOCALES.has(normalized) ? 'rtl' : 'ltr'
}
