import { useEffect, useState } from 'react'
import { ExternalLink, Megaphone } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Advertisement = {
  id: string
  title: string
  description: string | null
  cta_label: string | null
  target_url: string | null
  image_url: string | null
  placement: 'home' | 'detail' | 'both'
}

export default function Advertisements({
  placement,
  variant = 'banner',
}: {
  placement: 'home' | 'detail'
  variant?: 'banner' | 'card'
}) {
  const [ads, setAds] = useState<Advertisement[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadAds() {
      if (!isSupabaseConfigured) return
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('ads')
        .select('id,title,description,cta_label,target_url,image_url,placement')
        .eq('is_active', true)
        .in('placement', [placement, 'both'])
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`[Sahaba Ads] Erreur de chargement (${placement}) :`, error)
        if (!cancelled) setAds([])
        return
      }
      if (!cancelled) setAds((data ?? []) as Advertisement[])
    }
    void loadAds()
    return () => { cancelled = true }
  }, [placement])

  if (!ads.length) return null

  if (variant === 'card') {
    return <>
      {ads.map(ad => <article key={ad.id} className="location-card group flex min-w-0 flex-col overflow-hidden border border-sahaba-100">
        <div className="relative block aspect-[1.55/1] overflow-hidden bg-sahaba-50">
          {ad.image_url
            ? <img src={ad.image_url} alt={ad.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.style.display = 'none' }} />
            : <div className="flex h-full items-center justify-center bg-gradient-to-br from-sahaba-100 via-emerald-50 to-amber-50"><Megaphone size={38} className="text-sahaba-700/40" aria-hidden="true"/></div>}
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-sahaba-800 shadow-sm">Sponsorisé</span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-1 font-semibold text-slate-900">{ad.title}</h3>
          {ad.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{ad.description}</p>}
          <div className="mt-auto flex items-center justify-end border-t border-slate-100 pt-3">
            {ad.target_url
              ? <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-sahaba-700">{ad.cta_label || 'En savoir plus'} <ExternalLink size={15}/></a>
              : <span className="text-xs text-slate-400">Annonce partenaire</span>}
          </div>
        </div>
      </article>)}
    </>
  }

  return <section aria-label="Publicités" className="container-shell py-5">
    <div className="space-y-3">
      {ads.map(ad => <article key={ad.id} className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 shadow-sm sm:flex">
        {ad.image_url && <img src={ad.image_url} alt={ad.title} loading="lazy" className="max-h-56 w-full object-cover sm:max-h-none sm:w-56" onError={() => console.error('[Sahaba Ads] Image impossible à charger :', ad.image_url)} />}
        <div className="flex min-w-0 flex-1 items-start gap-3 p-5">
          <Megaphone size={21} className="mt-1 shrink-0 text-amber-800" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Publicité</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{ad.title}</h2>
            {ad.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{ad.description}</p>}
            {ad.target_url && <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sahaba-800 underline underline-offset-4">{ad.cta_label || 'En savoir plus'} <ExternalLink size={15} /></a>}
          </div>
        </div>
      </article>)}
    </div>
  </section>
}
