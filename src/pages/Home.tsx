import { Fragment, useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, MapPin, ShieldCheck, ChevronDown, X } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Location, LocationCategory } from '../types/database'
import LocationCard from '../components/LocationCard'
import { categoryLabel } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import Advertisements from '../components/Advertisements'

const categories: LocationCategory[] = ['restaurant','fast_food','cafe','boucherie','epicerie','mosquee','salle_priere','ecole_coran','funeraire','sante','services']
const emptyFilters = { halal:false, alcohol:false, prayer:false, vegan:false }
export default function Home() {
  const [locations,setLocations] = useState<Location[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [query,setQuery] = useState('')
  const [city,setCity] = useState('')
  const [category,setCategory] = useState('')
  const [filters,setFilters] = useState(emptyFilters)
  const [showFilters,setShowFilters] = useState(false)
  const [favorites,setFavorites] = useState<string[]>([])
  const { user } = useAuth()

  useEffect(() => {
    let active = true
    async function load() {
      if (!isSupabaseConfigured) { setLoading(false); setError('Configurez Supabase dans .env.local pour charger les lieux.'); return }
      setLoading(true); setError('')
      let request = supabase.from('locations').select('*').in('status',['published','claimed']).order('created_at',{ascending:false}).limit(1000)
      if (category) request = request.eq('category',category)
      if (filters.halal) request = request.eq('halal_full',true)
      if (filters.alcohol) request = request.eq('alcohol_free',true)
      if (filters.prayer) request = request.eq('prayer_room',true)
      if (filters.vegan) request = request.eq('vegan_options',true)
      if (city.trim()) request = request.ilike('city',`%${city.trim()}%`)
      if (query.trim()) request = request.or(`name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%,address.ilike.%${query.trim()}%`)
      const {data,error:queryError} = await request
      if (!active) return
      if (queryError) setError(queryError.message)
      else setLocations((data || []) as Location[])
      setLoading(false)
    }
    void load()
    return ()=>{active=false}
  },[query,city,category,filters])

  useEffect(()=>{ if (!user || !isSupabaseConfigured) {setFavorites([]);return}
    supabase.from('favorites').select('location_id').eq('user_id',user.id).then(({data})=>setFavorites((data||[]).map(x=>x.location_id)))
  },[user])

  const displayed = useMemo(()=>locations,[locations])
  async function toggleFavorite(id:string) {
    if (!user) { window.location.href='/login'; return }
    const exists=favorites.includes(id)
    setFavorites(prev=>exists?prev.filter(x=>x!==id):[...prev,id])
    const result=exists
      ? await supabase.from('favorites').delete().eq('location_id',id).eq('user_id',user.id)
      : await supabase.from('favorites').insert({location_id:id,user_id:user.id})
    if (result.error) setFavorites(prev=>exists?[...prev,id]:prev.filter(x=>x!==id))
  }
  return <div>
    <section className="hero-section">
      <div className="container-shell relative z-10 py-14 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <span className="eyebrow"><span className="h-2 w-2 rounded-full bg-emerald-300"/> L'annuaire communautaire européen</span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">Les lieux qui vous <span className="text-emerald-200">rassemblent.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/80 sm:text-lg">Mosquées, restaurants halal, commerces et services de confiance. Découvrez les adresses utiles près de vous.</p>
        </div>
        <div className="search-panel mt-9 max-w-5xl">
          <label className="search-field"><Search size={20}/><span className="sr-only">Rechercher</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Un lieu, un service, un nom…"/></label>
          <span className="search-divider"/>
          <label className="search-field"><MapPin size={19}/><span className="sr-only">Ville</span><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ville ou région"/></label>
          <button className="button-primary search-submit" onClick={()=>document.getElementById('results')?.scrollIntoView({behavior:'smooth'})}>Rechercher <Search size={17}/></button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/75"><span className="mr-1">Recherches fréquentes :</span>{['Restaurant halal','Mosquée','Salle de prière','Boucherie'].map((label,i)=><button key={label} className="hero-chip" onClick={()=>{setCategory(['restaurant','mosquee','salle_priere','boucherie'][i]);document.getElementById('results')?.scrollIntoView({behavior:'smooth'})}}>{label}</button>)}</div>
      </div>
    </section>
    <section className="container-shell py-10 sm:py-14" id="results">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow-light">Explorer la communauté</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Des adresses à découvrir</h2><p className="mt-2 text-slate-500">Une sélection de lieux partagés par la communauté.</p></div><button className={`button-secondary self-start ${showFilters?'border-sahaba-600 text-sahaba-700':''}`} onClick={()=>setShowFilters(!showFilters)}><SlidersHorizontal size={17}/> Filtres <ChevronDown size={16} className={showFilters?'rotate-180':''}/></button></div>
      {showFilters && <div className="filter-panel mt-6">
        <label className="filter-label">Catégorie<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Toutes les catégories</option>{categories.map(c=><option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
        <div className="flex flex-wrap gap-x-5 gap-y-3 sm:col-span-2">{([{key:'halal',label:'Halal'},{key:'alcohol',label:'Sans alcool'},{key:'prayer',label:'Salle de prière'},{key:'vegan',label:'Options véganes'}] as const).map(item=><label key={item.key} className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="check-input" checked={filters[item.key]} onChange={e=>setFilters(prev=>({...prev,[item.key]:e.target.checked}))}/>{item.label}</label>)}</div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold text-sahaba-700" onClick={()=>{setCategory('');setCity('');setQuery('');setFilters(emptyFilters)}}><X size={15}/> Effacer les filtres</button>
      </div>}
      <div className="mt-7 flex items-center justify-between"><p className="text-sm text-slate-500">{loading?'Chargement…':`${displayed.length} lieu${displayed.length!==1?'x':''} trouvé${displayed.length!==1?'s':''}`}</p><span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck size={14}/> Lieux soumis à modération</span></div>
      {!isSupabaseConfigured && <div className="notice-warning mt-5"><strong>Configuration requise.</strong> {error} Copiez `.env.example` vers `.env.local`, puis ajoutez les identifiants de votre projet Supabase.</div>}
      {error && isSupabaseConfigured && <div className="notice-warning mt-5">{error}</div>}
      {loading ? <div className="location-grid mt-6">{[1,2,3,4,5,6].map(n=><div key={n} className="skeleton-card animate-pulse"><div className="aspect-[1.55/1] bg-slate-100"/><div className="space-y-3 p-4"><div className="h-4 w-2/3 rounded bg-slate-100"/><div className="h-3 w-1/2 rounded bg-slate-100"/></div></div>)}</div>
      : displayed.length ? <div className="location-grid mt-6">{displayed.map((location,index)=><Fragment key={location.id}><LocationCard location={location} favorite={favorites.includes(location.id)} onFavorite={toggleFavorite}/>{displayed.length > 0 && index === Math.min(2, displayed.length - 1) && <Advertisements placement="home" variant="card"/>}</Fragment>)}</div>
      : <div className="empty-state mt-8"><span className="empty-icon"><MapPin size={26}/></span><h3>Aucun lieu pour le moment</h3><p>Essayez de modifier vos filtres ou proposez le premier lieu de votre secteur.</p><a href="/submit" className="button-primary mt-4">Proposer un lieu</a></div>}
    </section>
    <section className="container-shell"><div className="contribute-banner"><div><p className="eyebrow-light">Construisons ensemble</p><h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Votre adresse peut aider quelqu'un.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Ajoutez un lieu utile et contribuez à rendre l'annuaire plus complet pour toute la communauté.</p></div><a href="/submit" className="button-primary shrink-0">Ajouter un lieu <MapPin size={17}/></a></div></section>
  </div>
}