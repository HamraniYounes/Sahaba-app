import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Location } from '../types/database'
import LocationCard from '../components/LocationCard'
import { listFavorites, removeFavorite } from '../services/communityService'

export default function Favorites(){
  const {user}=useAuth();const [locations,setLocations]=useState<Location[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('')
  useEffect(()=>{let active=true;async function load(){if(!user||!isSupabaseConfigured){setLoading(false);return}
    const {data,error}=await listFavorites(user.id)
    if(!active)return
    if(error)setError(error.message)
    else setLocations((data||[]).map(row=>row.location).filter(Boolean) as unknown as Location[])
    setLoading(false)
  }void load();return()=>{active=false}},[user])
  async function remove(id:string){if(!user)return;const {error}=await removeFavorite(user.id,id);if(error){setError(error.message);return}setLocations(prev=>prev.filter(x=>x.id!==id))}
  return <div className="container-shell py-10 sm:py-14"><p className="eyebrow-light">Votre sélection</p><h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">Mes favoris</h1><p className="mt-2 text-slate-500">Retrouvez rapidement les lieux que vous avez enregistrés.</p>{error&&<div className="notice-error mt-5">{error}</div>}
    {loading?<div className="loading-block mt-6">Chargement des favoris…</div>:locations.length?<div className="location-grid mt-7">{locations.map(location=><LocationCard key={location.id} location={location} favorite onFavorite={remove}/>)}</div>:<div className="empty-state mt-8"><span className="empty-icon"><Heart size={26}/></span><h3>Votre liste est vide</h3><p>Ajoutez des lieux à vos favoris depuis la page d’exploration.</p></div>}
  </div>
}