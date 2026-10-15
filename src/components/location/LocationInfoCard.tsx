import { useEffect, useState } from 'react'
import { Clock, Globe, Mail, MapPin, Phone } from 'lucide-react'
import type { Location, LocationClosure } from '../../types/database'
import { DAY_KEYS, formatOpeningIntervals, getLocalDate, getOpeningStatus, normalizeOpeningHours } from '../../lib/openingHours'

type Props = { location: Location; closures?: LocationClosure[] }

const dayLabels: Record<string, string> = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' }

export default function LocationInfoCard({ location, closures = [] }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setTick(value => value + 1), 60_000); return () => window.clearInterval(timer) }, [])
  const status = getOpeningStatus(location.opening_hours, location.timezone, closures)
  const hours = normalizeOpeningHours(location.opening_hours)
  const activeClosure = closures.find(closure => closure.starts_on <= getLocalDate(new Date(), location.timezone) && (closure.ends_on === null || closure.ends_on >= getLocalDate(new Date(), location.timezone)))
  const statusLabel = status.reason === 'definitive' ? 'Définitivement fermé' : status.reason === 'temporary' ? 'Fermé temporairement' : status.reason === 'exceptional' ? 'Fermé exceptionnellement' : status.isOpen ? 'Ouvert maintenant' : 'Fermé actuellement'
  const hasCoordinates = location.latitude !== null && location.latitude !== undefined && location.longitude !== null && location.longitude !== undefined
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
    <h2 className="font-display text-xl font-semibold">Informations pratiques</h2>
    <div className="mt-4 space-y-4 text-sm">
      {location.phone && <a className="flex items-center gap-3 text-slate-600 hover:text-sahaba-700" href={`tel:${location.phone}`}><Phone size={17} />{location.phone}</a>}
      {location.email && <a className="flex items-center gap-3 text-slate-600 hover:text-sahaba-700" href={`mailto:${location.email}`}><Mail size={17} />{location.email}</a>}
      {location.website && <a className="flex items-center gap-3 break-all text-slate-600 hover:text-sahaba-700" href={location.website} target="_blank" rel="noreferrer"><Globe size={17} />Site web</a>}
      <div className="flex items-start gap-3 text-slate-600"><Clock size={17} className="mt-0.5" /><div className="min-w-0"><p className="font-medium">Horaires d’ouverture</p><div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{statusLabel}</div>{activeClosure && <p className="mt-2 text-xs text-amber-700">{activeClosure.reason || 'Fermeture planifiée'}</p>}<div className="mt-3 space-y-1">{DAY_KEYS.map(day => <p key={day} className="text-xs"><span className="inline-block w-20 font-medium text-slate-700">{dayLabels[day]}</span>{formatOpeningIntervals(hours[day])}</p>)}</div><p className="mt-2 text-[11px] text-slate-400">Fuseau : {location.timezone}</p></div></div>
    </div>
    {hasCoordinates && <>
      <a className="button-primary mt-5 w-full justify-center" href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`} target="_blank" rel="noreferrer">Voir sur la carte <MapPin size={16} /></a>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200"><iframe title={`Carte de ${location.name}`} className="h-56 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude! - 0.01}%2C${location.latitude! - 0.006}%2C${location.longitude! + 0.01}%2C${location.latitude! + 0.006}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`} /></div>
    </>}
  </div>
}
