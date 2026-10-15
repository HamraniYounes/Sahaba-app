import { Clock, Globe, Mail, MapPin, Phone } from 'lucide-react'
import type { Location } from '../../types/database'

type Props = { location: Location }

const dayLabels: Record<string, string> = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' }

export default function LocationInfoCard({ location }: Props) {
  const hasCoordinates = location.latitude !== null && location.latitude !== undefined && location.longitude !== null && location.longitude !== undefined
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
    <h2 className="font-display text-xl font-semibold">Informations pratiques</h2>
    <div className="mt-4 space-y-4 text-sm">
      {location.phone && <a className="flex items-center gap-3 text-slate-600 hover:text-sahaba-700" href={`tel:${location.phone}`}><Phone size={17} />{location.phone}</a>}
      {location.email && <a className="flex items-center gap-3 text-slate-600 hover:text-sahaba-700" href={`mailto:${location.email}`}><Mail size={17} />{location.email}</a>}
      {location.website && <a className="flex items-center gap-3 break-all text-slate-600 hover:text-sahaba-700" href={location.website} target="_blank" rel="noreferrer"><Globe size={17} />Site web</a>}
      <div className="flex items-start gap-3 text-slate-600"><Clock size={17} className="mt-0.5" /><div><p className="font-medium">Horaires d’ouverture</p>{Object.entries(location.opening_hours || {}).map(([day, hours]) => <p key={day} className="mt-1 text-xs">{dayLabels[day] || day}: {String(hours || 'Non renseigné')}</p>)}{!Object.keys(location.opening_hours || {}).length && <p className="mt-1 text-xs">Horaires non renseignés</p>}</div></div>
    </div>
    {hasCoordinates && <>
      <a className="button-primary mt-5 w-full justify-center" href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`} target="_blank" rel="noreferrer">Voir sur la carte <MapPin size={16} /></a>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200"><iframe title={`Carte de ${location.name}`} className="h-56 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude! - 0.01}%2C${location.latitude! - 0.006}%2C${location.longitude! + 0.01}%2C${location.latitude! + 0.006}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`} /></div>
    </>}
  </div>
}
