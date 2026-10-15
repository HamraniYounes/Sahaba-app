import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, Heart, PlusCircle, ShieldCheck } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Location } from '../types/database'
import { formatDate } from '../lib/utils'
import { getUserLocations, getUserStats, updateProfileDisplayName } from '../services/profileService'

export default function Profile(){
  const {user,profile,refreshProfile}=useAuth();const [name,setName]=useState(profile?.display_name||'');const [places,setPlaces]=useState<Location[]>([]);const [stats,setStats]=useState({reviews:0,favorites:0});const [message,setMessage]=useState('');const [loading,setLoading]=useState(true)
  useEffect(()=>{setName(profile?.display_name||'')},[profile])
  useEffect(()=>{let active=true;async function load(){if(!user||!isSupabaseConfigured){setLoading(false);return}
    const [p,counts]=await Promise.all([getUserLocations(user.id),getUserStats(user.id)])
    if(!active)return;setPlaces((p.data||[]) as Location[]);setStats({reviews:counts.reviews.count||0,favorites:counts.favorites.count||0});setLoading(false)
  }void load();return()=>{active=false}},[user])
  async function save(e:React.FormEvent){e.preventDefault();if(!user)return
    const {error}=await updateProfileDisplayName(user.id,name.trim())
    setMessage(error?error.message:'Profil mis à jour.');if(!error)await refreshProfile()
  }
  async function deleteAccount(){setMessage('La suppression de compte doit être implémentée côté serveur avec une Edge Function sécurisée. Contactez l’administrateur pour le moment.')}
  return <div className="container-shell max-w-5xl py-10 sm:py-14"><p className="eyebrow-light">Espace personnel</p><h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">Mon profil</h1><p className="mt-2 text-slate-500">Gérez vos informations et suivez vos contributions.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-3">{[{label:'Lieux proposés',value:places.length,icon:MapPin},{label:'Avis publiés',value:stats.reviews,icon:Star},{label:'Favoris',value:stats.favorites,icon:Heart}].map(item=><div key={item.label} className="stat-card"><span className="stat-icon"><item.icon size={20}/></span><p className="mt-4 text-3xl font-semibold text-slate-900">{item.value}</p><p className="mt-1 text-sm text-slate-500">{item.label}</p></div>)}</div>
    <div className="mt-7 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="form-section"><h2 className="section-title">Informations du compte</h2><form onSubmit={save} className="mt-5 space-y-4"><label className="form-label">Nom affiché<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Votre nom"/></label><label className="form-label">Adresse e-mail<input value={user?.email||''} disabled/></label><button className="button-primary">Enregistrer</button></form>{message&&<p className="mt-3 text-sm text-sahaba-700">{message}</p>}<button onClick={()=>void deleteAccount()} className="mt-6 text-sm text-rose-600 hover:underline">Demander la suppression du compte</button></section>
    <section className="form-section"><div className="flex items-center justify-between gap-3"><h2 className="section-title">Mes propositions</h2><Link to="/submit" className="button-secondary text-sm"><PlusCircle size={15}/> Ajouter</Link></div>{loading?<p className="mt-5 text-sm text-slate-500">Chargement…</p>:places.length?<div className="mt-4 divide-y divide-slate-100">{places.map(place=><div key={place.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{place.name}</p><p className="mt-1 text-xs text-slate-500">{place.city} · {formatDate(place.created_at)}</p></div><span className={`status-pill status-${place.status}`}>{place.status==='pending'?'En attente':place.status==='published'?'Publié':place.status==='claimed'?'Réclamé':'Refusé'}</span></div>)}</div>:<div className="py-10 text-center"><MapPin size={26} className="mx-auto text-slate-300"/><p className="mt-3 text-sm text-slate-500">Vous n’avez pas encore proposé de lieu.</p></div>}</section></div>
    {profile?.role==='admin'||profile?.role==='moderator'?<Link to="/admin" className="mt-6 flex items-center gap-3 rounded-2xl border border-sahaba-100 bg-sahaba-50 p-4 text-sahaba-900"><ShieldCheck/><span><strong>Administration</strong><span className="block text-sm">Accéder à la modération des lieux</span></span></Link>:null}
  </div>
}