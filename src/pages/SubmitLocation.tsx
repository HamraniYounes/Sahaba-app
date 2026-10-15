import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Info, Upload, Clock3 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { slugify } from '../lib/utils'
import { geocodeAddress } from '../lib/geocoding'
import type { LocationCategory } from '../types/database'

const categoryOptions: LocationCategory[] = ['restaurant','fast_food','cafe','boulangerie','boucherie','epicerie','mosquee','salle_priere','ecole_coran','association','funeraire','sante','bien_etre','vetements','librairie','finance','voyage','hebergement','services','autre']
const labels: Record<string,string> = {restaurant:'Restaurant',fast_food:'Restauration rapide',cafe:'Café',boulangerie:'Boulangerie',boucherie:'Boucherie',epicerie:'Épicerie',mosquee:'Mosquée',salle_priere:'Salle de prière',ecole_coran:'École coranique',association:'Association',funeraire:'Services funéraires',sante:'Santé',bien_etre:'Bien-être',vetements:'Vêtements',librairie:'Librairie',finance:'Finance',voyage:'Voyage',hebergement:'Hébergement',services:'Services',autre:'Autre'}
const days = [['monday','Lundi'],['tuesday','Mardi'],['wednesday','Mercredi'],['thursday','Jeudi'],['friday','Vendredi'],['saturday','Samedi'],['sunday','Dimanche']] as const
const blankHours = Object.fromEntries(days.map(([key])=>[key,''])) as Record<string,string>

export default function SubmitLocation() {
  const { user } = useAuth(); const navigate = useNavigate()
  const [form,setForm] = useState({name:'',category:'restaurant' as LocationCategory,address:'',city:'',country:'Belgique',phone:'',email:'',website:'',description:'',halal_full:false,alcohol_free:false,women_only:false,prayer_room:false,wudu_facilities:false,burkini_friendly:false,vegetarian_options:false,vegan_options:false,accessible:false,parking:false})
  const [hours,setHours] = useState<Record<string,string>>(blankHours)
  const [photos,setPhotos] = useState<File[]>([])
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [success,setSuccess] = useState('')
  function update<K extends keyof typeof form>(key:K,value:typeof form[K]) { setForm(prev=>({...prev,[key]:value})) }
  async function geocode() {
    const query = [form.address,form.city,form.country].filter(Boolean).join(', ')
    return geocodeAddress(query)
  }
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('')
    if (!user) { navigate('/login'); return }
    if (!isSupabaseConfigured) { setError('Supabase n’est pas configuré.'); return }
    setBusy(true)
    try {
      const coordinates = await geocode()
      if (!coordinates) { setError('Adresse introuvable. Vérifiez l’adresse, la ville et le pays.'); setBusy(false); return }
      const slug = `${slugify(form.name)||'lieu'}-${Math.random().toString(36).slice(2,7)}`
      const uploaded: string[] = []
      for (const file of photos) {
        const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-')
        const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
        const {error:uploadError} = await supabase.storage.from('location-photos').upload(path,file,{upsert:false,contentType:file.type})
        if (uploadError) throw new Error(`Photo non envoyée : ${uploadError.message}`)
        const {data} = supabase.storage.from('location-photos').getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }
      const opening_hours = Object.fromEntries(Object.entries(hours).map(([day,value])=>[day,value.trim()||'Fermé']))
      const payload = {...form,slug,owner_id:null,created_by:user.id,status:'pending',latitude:coordinates.latitude,longitude:coordinates.longitude,photos:uploaded,cover_image:uploaded[0]||null,price_range:null,opening_hours}
      const {error:insertError} = await supabase.from('locations').insert(payload)
      if (insertError) throw new Error(insertError.message)
      setSuccess('Votre proposition a été envoyée et attend une validation par la modération.')
      setTimeout(()=>navigate('/profile'),1500)
    } catch (err) { setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.') }
    finally { setBusy(false) }
  }
  const booleanFields:[keyof typeof form,string][] = [['halal_full','Halal'],['alcohol_free','Sans alcool'],['women_only','Réservé aux femmes'],['prayer_room','Salle de prière'],['wudu_facilities','Installations wudu'],['burkini_friendly','Burkini accepté'],['vegetarian_options','Options végétariennes'],['vegan_options','Options véganes'],['accessible','Accessible aux personnes à mobilité réduite'],['parking','Parking']]
  return <div className="container-shell max-w-4xl py-10 sm:py-14">
    <Link to="/" className="text-sm font-medium text-sahaba-700 hover:underline">← Retour à l’exploration</Link>
    <div className="mt-5"><p className="eyebrow-light">Contribution communautaire</p><h1 className="mt-2 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Proposer un lieu</h1><p className="mt-3 max-w-2xl leading-7 text-slate-500">Partagez une adresse utile. La position est calculée automatiquement à partir de l’adresse et chaque proposition est vérifiée avant publication.</p></div>
    {!user&&<div className="notice-warning mt-6">Vous devez être connecté pour proposer un lieu. <Link to="/login" className="font-semibold underline">Se connecter</Link></div>}
    <form onSubmit={submit} className="mt-8 space-y-7">
      <section className="form-section"><h2 className="section-title">Informations générales</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="form-label sm:col-span-2">Nom de l’établissement *<input required maxLength={140} value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Ex. Centre culturel…"/></label>
        <label className="form-label">Catégorie *<select value={form.category} onChange={e=>update('category',e.target.value as LocationCategory)}>{categoryOptions.map(c=><option key={c} value={c}>{labels[c]}</option>)}</select></label>
        <label className="form-label">Téléphone<input type="tel" autoComplete="tel" value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="+32…"/></label>
        <label className="form-label">E-mail<input type="email" autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="contact@exemple.com"/></label>
        <label className="form-label">Site web<input type="url" value={form.website} onChange={e=>update('website',e.target.value)} placeholder="https://…"/></label>
        <label className="form-label sm:col-span-2">Description<textarea rows={4} maxLength={4000} value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Présentez les services et informations utiles…"/></label>
      </div></section>
      <section className="form-section"><h2 className="section-title">Localisation</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="form-label sm:col-span-2">Adresse<input autoComplete="street-address" value={form.address} onChange={e=>update('address',e.target.value)} placeholder="Rue et numéro"/></label>
        <label className="form-label">Ville *<input required autoComplete="address-level2" value={form.city} onChange={e=>update('city',e.target.value)} placeholder="Bruxelles"/></label>
        <label className="form-label">Pays *<input required autoComplete="country-name" value={form.country} onChange={e=>update('country',e.target.value)} placeholder="Belgique"/></label>
      </div><p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500"><Info size={15} className="mt-0.5 shrink-0"/>Aucun champ de coordonnées n’est nécessaire : le géocodage se fait lors de la soumission. Géocodage : <a className="underline" href="https://operations.osmfoundation.org/policies/nominatim/" target="_blank" rel="noreferrer">politique Nominatim</a>.</p></section>
      <section className="form-section"><h2 className="section-title flex items-center gap-2"><Upload size={18}/> Photos</h2><p className="mt-2 text-sm text-slate-500">Jusqu’à 5 photos JPEG, PNG ou WebP (5 Mo maximum chacune). La première sera utilisée comme photo principale.</p><label className="form-label mt-4">Ajouter des photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const selected=Array.from(e.target.files||[]);if(selected.length>5){setError('Vous pouvez choisir 5 photos au maximum.');return}if(selected.some(f=>f.size>5*1024*1024)){setError('Chaque photo doit faire 5 Mo maximum.');return}setError('');setPhotos(selected)}}/></label>{photos.length>0&&<ul className="mt-3 list-inside list-disc text-sm text-slate-600">{photos.map((p,i)=><li key={`${p.name}-${i}`}>{p.name}</li>)}</ul>}</section>
      <section className="form-section"><h2 className="section-title flex items-center gap-2"><Clock3 size={18}/> Horaires d’ouverture</h2><p className="mt-2 text-sm text-slate-500">Format libre, par exemple « 09:00–18:00 » ou « Fermé ».</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{days.map(([key,label])=><label key={key} className="form-label">{label}<input value={hours[key]} onChange={e=>setHours(prev=>({...prev,[key]:e.target.value}))} placeholder="09:00–18:00 ou Fermé"/></label>)}</div></section>
      <section className="form-section"><h2 className="section-title">Caractéristiques</h2><p className="mt-1 text-sm text-slate-500">Cochez uniquement les caractéristiques dont vous êtes raisonnablement certain.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{booleanFields.map(([key,label])=><label key={key} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 text-sm text-slate-700 hover:bg-sahaba-50/50"><input className="check-input mt-0.5" type="checkbox" checked={Boolean(form[key])} onChange={e=>update(key,e.target.checked as never)}/>{label}</label>)}</div></section>
      {error&&<div className="notice-error" role="alert">{error}</div>}{success&&<div className="notice-success" role="status">{success}</div>}
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row"><Link to="/" className="button-secondary justify-center">Annuler</Link><button type="submit" disabled={busy||!user} className="button-primary justify-center">{busy?'Géocodage et envoi…':'Soumettre à la modération'} <MapPin size={17}/></button></div>
    </form>
  </div>
}
