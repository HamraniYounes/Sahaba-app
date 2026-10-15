import { Fragment, useEffect, useState } from 'react'
import { Search, SlidersHorizontal, MapPin, ShieldCheck, ChevronDown, X } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { LocationCategory, LocationSummary } from '../types/database'
import LocationCard from '../components/LocationCard'
import { categoryLabel, escapePostgrestSearchTerm } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import Advertisements from '../components/Advertisements'
import { listFavoriteIds, setFavorite } from '../services/communityService'

const categories: LocationCategory[] = ['restaurant','fast_food','cafe','boucherie','epicerie','mosquee','salle_priere','ecole_coran','funeraire','sante','services']
const emptyFilters = { halal:false, alcohol:false, prayer:false, vegan:false }
const LOCATION_LIST_SELECT = 'id,slug,name,category,city,country,cover_image,halal_full,average_rating,review_count'
const PAGE_SIZE = 24

export default function Home() {
  const [locations,setLocations] = useState<LocationSummary[]>([])
  const [totalCount,setTotalCount] = useState(0)
  const [page,setPage] = useState(0)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [query,setQuery] = useState('')
  const [city,setCity] = useState('')
  const [category,setCategory] = useState<LocationCategory | ''>('')
  const [filters,setFilters] = useState(emptyFilters)
  const [showFilters,setShowFilters] = useState(false)
  const [favorites,setFavorites] = useState<string[]>([])
  const { user } = useAuth()

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      if (page !== 0) {
        setPage(0)
        return
      }
      async function load() {
        if (!isSupabaseConfigured) { setLoading(false); setError('Configurez Supabase dans .env.local pour charger les lieux.'); return }
        setLoading(true); setError('')
        let request = supabase.from('locations').select(LOCATION_LIST_SELECT,{count:'exact'}).in('status',['published','claimed']).order('created_at',{ascending:false}).range(0,PAGE_SIZE-1)
        if (category) request = request.eq('category',category)
        if (filters.halal) request = request.eq('halal_full',true)
        if (filters.alcohol) request = request.eq('alcohol_free',true)
        if (filters.prayer) request = request.eq('prayer_room',true)
        if (filters.vegan) request = request.eq('vegan_options',true)
        const cityTerm = city.trim()
        const queryTerm = query.trim()
        if (cityTerm) request = request.ilike('city',`%${escapePostgrestSearchTerm(cityTerm)}%`)
        if (queryTerm) {
          const term = escapePostgrestSearchTerm(queryTerm)
          request = request.or(`name.ilike.%${term}%,description.ilike.%${term}%,address.ilike.%${term}%`)
        }
        const {data,error:queryError,count} = await request
        if (!active) return
        if (queryError) setError(queryError.message)
        else { setLocations(data || []); setTotalCount(count ?? 0) }
        setLoading(false)
      }
      void load()
    }, 300)
    return ()=>{active=false;window.clearTimeout(timer)}
  },[query,city,category,filters,page])

  useEffect(()=>{
    let active = true
    if (!user || !isSupabaseConfigured) {setFavorites([]);return ()=>{active=false}}
    void listFavoriteIds(user.id).then(({data})=>{if(active)setFavorites((data||[]).map(item=>item.location_id))})
    return ()=>{active=false}
  },[user])

  async function toggleFavorite(id:string) {
    if (!user) { window.location.href='/login'; return }
    const exists=favorites.includes(id)
    setFavorites(prev=>exists?prev.filter(x=>x!==id):[...prev,id])
    const result=await setFavorite(user.id,id,!exists)
    if (result.error) setFavorites(prev=>exists?[...prev,id]:prev.filter(x=>x!==id))
  }
  const hasNextPage=(page+1)*PAGE_SIZE<totalCount
  const hasPreviousPage=page>0

  return <div>
    <section className="hero-section">
      <div className="container-shell relative z-10 py-14 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <span className="eyebrow"><span className="h-2 w-2 rounded-full bg-emerald-300"/> L'annuaire communautaire européen</span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">Les lieux qui vous <span className="text-emerald-200">rassemblent.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/80 sm:text-lg">Mosquées, restaurants halal, commerces et services de confiance. Découvrez les adresses utiles près de vous.</p>
        </div>
        <div className="search-panel mt-9 max-w-5xl">
          <label className="search-field"><Search size={20}/><span className="sr-only">Rechercher</span><input value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} placeholder="Un lieu, un service, un nom…"/></label>
          <span className="search-divider"/>
          <label className="search-field"><MapPin size={19}/><span className="sr-only">Ville</span><input value={city} maxLength={120} onChange={e=>setCity(e.target.value)} placeholder="Ville ou région"/></label>
          <button className="button-primary search-submit" onClick={()=>document.getElementById('results')?.scrollIntoView({behavior:'smooth'})}>Rechercher <Search size={17}/></button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/75"><span className="mr-1">Recherches fréquentes :</span>{['Restaurant halal','Mosquée','Salle de prière','Boucherie'].map((label,i)=><button key={label} className="hero-chip" onClick={()=>{setCategory(['restaurant','mosquee','salle_priere','boucherie'][i] as LocationCategory);document.getElementById('results')?.scrollIntoView({behavior:'smooth'})}}>{label}</button>)}</div>
      </div>
    </section>
    <section className="container-shell py-10 sm:py-14" id="results">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow-light">Explorer la communauté</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Des adresses à découvrir</h2><p className="mt-2 text-slate-500">Une sélection de lieux partagés par la communauté.</p></div><button className={`button-secondary self-start ${showFilters?'border-sahaba-600 text-sahaba-700':''}`} onClick={()=>setShowFilters(!showFilters)}><SlidersHorizontal size={17}/> Filtres <ChevronDown size={16} className={showFilters?'rotate-180':''}/></button></div>
      {showFilters && <div className="filter-panel mt-6">
        <label className="filter-label">Catégorie<select value={category} onChange={e=>setCategory(e.target.value as LocationCategory | '')}><option value="">Toutes les catégories</option>{categories.map(c=><option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
        <div className="flex flex-wrap gap-x-5 gap-y-3 sm:col-span-2">{([{key:'halal',label:'Halal'},{key:'alcohol',label:'Sans alcool'},{key:'prayer',label:'Salle de prière'},{key:'vegan',label:'Options véganes'}] as const).map(item=><label key={item.key} className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="check-input" checked={filters[item.key]} onChange={e=>setFilters(prev=>({...prev,[item.key]:e.target.checked}))}/>{item.label}</label>)}</div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold text-sahaba-700" onClick={()=>{setCategory('');setCity('');setQuery('');setFilters(emptyFilters)}}><X size={15}/> Effacer les filtres</button>
      </div>}
      <div className="mt-7 flex items-center justify-between"><p className="text-sm text-slate-500">{loading?'Chargement…':`${totalCount} lieu${totalCount!==1?'x':''} trouvé${totalCount!==1?'s':''}`}</p><span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck size={14}/> Lieux soumis à modération</span></div>
      {!isSupabaseConfigured && <div className="notice-warning mt-5"><strong>Configuration requise.</strong> {error} Copiez `.env.example` vers `.env.local`, puis ajoutez les identifiants de votre projet Supabase.</div>}
      {error && isSupabaseConfigured && <div className="notice-warning mt-5">{error}</div>}
      {loading ? <div className="location-grid mt-6">{[1,2,3,4,5,6].map(n=><div key={n} className="skeleton-card animate-pulse"><div className="aspect-[1.55/1] bg-slate-100"/><div className="space-y-3 p-4"><div className="h-4 w-2/3 rounded bg-slate-100"/><div className="h-3 w-1/2 rounded bg-slate-100"/></div></div>)}</div>
      : locations.length ? <>
        <div className="location-grid mt-6">{locations.map((location,index)=><Fragment key={location.id}><LocationCard location={location} favorite={favorites.includes(location.id)} onFavorite={toggleFavorite}/>{locations.length > 0 && index === Math.min(2, locations.length - 1) && <Advertisements placement="home" variant="card"/>}</Fragment>)}</div>
        {(hasPreviousPage || hasNextPage) && <div className="mt-8 flex items-center justify-center gap-3"><button className="button-secondary" disabled={!hasPreviousPage} onClick={()=>{setPage(value=>value-1);document.getElementById('results')?.scrollIntoView({behavior:'smooth'})}}>Précédent</button><span className="text-sm text-slate-500">Page {page+1} sur {Math.max(1,Math.ceil(totalCount/PAGE_SIZE))}</span><button className="button-secondary" disabled={!hasNextPage} onClick={()=>{setPage(value=>value+1);document.getElementById('results')?.scrollIntoView({behavior:'smooth'})}}>Suivant</button></div>}
      </>
      : <div className="empty-state mt-8"><span className="empty-icon"><MapPin size={26}/></span><h3>Aucun lieu pour le moment</h3><p>Essayez de modifier vos filtres ou proposez le premier lieu de votre secteur.</p><a href="/submit" className="button-primary mt-4">Proposer un lieu</a></div>}
    </section>
    <section className="container-shell"><div className="contribute-banner"><div><p className="eyebrow-light">Construisons ensemble</p><h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Votre adresse peut aider quelqu'un.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Ajoutez un lieu utile et contribuez à rendre l'annuaire plus complet pour toute la communauté.</p></div><a href="/submit" className="button-primary shrink-0">Ajouter un lieu <MapPin size={17}/></a></div></section>
  </div>
}