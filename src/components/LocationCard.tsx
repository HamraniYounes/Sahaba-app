import { Link } from 'react-router-dom'
import { MapPin, Star, Heart, ArrowUpRight } from 'lucide-react'
import type { LocationSummary } from '../types/database'
import { categoryLabel } from '../lib/utils'

type Props = { location: LocationSummary; favorite?: boolean; onFavorite?: (id:string)=>void; isOpen?: boolean }

export default function LocationCard({ location, favorite, onFavorite, isOpen }: Props) {
  return <article className="location-card group">
    <Link to={`/location/${location.slug}`} className="relative block aspect-[1.55/1] overflow-hidden bg-sahaba-50">
      {location.cover_image ? <img src={location.cover_image} alt={location.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-sahaba-100 via-emerald-50 to-amber-50"><MapPin size={38} className="text-sahaba-700/40"/></div>}
      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-sahaba-800 shadow-sm">{categoryLabel(location.category)}</span>
      {location.halal_full && <span className="absolute bottom-3 left-3 rounded-full bg-sahaba-700 px-3 py-1 text-xs font-semibold text-white">Halal certifié / déclaré</span>}
    </Link>
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><Link to={`/location/${location.slug}`} className="line-clamp-1 font-semibold text-slate-900 hover:text-sahaba-700">{location.name}</Link><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} className="shrink-0"/><span className="truncate">{[location.city,location.country].filter(Boolean).join(', ')}</span></p></div>
        {onFavorite && <button type="button" className={`rounded-full p-2 transition hover:bg-sahaba-50 ${favorite?'text-rose-600':'text-slate-400'}`} aria-label={favorite?'Retirer des favoris':'Ajouter aux favoris'} onClick={()=>onFavorite(location.id)}><Heart size={18} fill={favorite?'currentColor':'none'}/></button>}
      </div>
      <div className="mt-3 flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{isOpen ? 'Ouvert maintenant' : 'Fermé actuellement'}</span></div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1 text-sm font-semibold text-slate-700"><Star size={15} className="fill-amber-400 text-amber-400"/>{location.review_count ? location.average_rating.toFixed(1) : 'Nouveau'} <span className="font-normal text-slate-400">{location.review_count ? `(${location.review_count})` : ''}</span></span>
        <Link to={`/location/${location.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-sahaba-700">Découvrir <ArrowUpRight size={15}/></Link>
      </div>
    </div>
  </article>
}
