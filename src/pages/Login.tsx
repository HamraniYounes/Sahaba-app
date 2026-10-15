import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, LockKeyhole, ArrowRight, MapPin } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [mode,setMode]=useState<'login'|'register'>('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const {user, configured}=useAuth()
  const navigate=useNavigate()
  const location=useLocation()
  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user, navigate])
  async function submit(e:React.FormEvent) {
    e.preventDefault();setError('');setMessage('')
    if(!configured || !isSupabaseConfigured){setError('Configurez Supabase dans .env.local, puis redémarrez le serveur Vite.');return}
    setBusy(true)
    try {
      if(mode==='login') {
        const {error}=await supabase.auth.signInWithPassword({email,password})
        if(error) throw error
        navigate((location.state as {from?:string}|null)?.from||'/',{replace:true})
      } else {
        const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:`${window.location.origin}/`}})
        if(error) throw error
        if(data.session) navigate('/',{replace:true})
        else setMessage('Compte créé. Consultez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.')
      }
    } catch(err) {setError(err instanceof Error?err.message:'Une erreur est survenue.')}
    finally {setBusy(false)}
  }
  return <div className="auth-page"><div className="auth-aside"><Link to="/" className="inline-flex items-center gap-2 text-white"><MapPin/><span className="font-display text-2xl font-bold">Sahaba</span></Link><div className="mt-auto max-w-md pb-12"><p className="eyebrow">Une communauté, mille adresses</p><h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-white">Retrouvez les lieux qui comptent pour vous.</h1><p className="mt-4 leading-7 text-white/70">Conservez vos adresses favorites et contribuez à un annuaire plus utile.</p></div></div>
    <div className="auth-form-wrap"><div className="w-full max-w-md"><Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sahaba-700">← Retour à l'exploration</Link><p className="eyebrow-light">{mode==='login'?'Bon retour':'Rejoindre Sahaba'}</p><h2 className="mt-2 font-display text-3xl font-semibold text-slate-900">{mode==='login'?'Connectez-vous':'Créer un compte'}</h2><p className="mt-2 text-sm text-slate-500">{mode==='login'?'Accédez à vos favoris et contributions.':'Participez à la vie de l’annuaire communautaire.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">{mode==='register'&&<label className="form-label">Nom affiché<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom" autoComplete="name"/></label>}<label className="form-label">Adresse e-mail<span className="input-with-icon"><Mail size={18}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email"/></span></label><label className="form-label">Mot de passe<span className="input-with-icon"><LockKeyhole size={18}/><input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="8 caractères minimum" autoComplete={mode==='login'?'current-password':'new-password'}/></span></label>
      {error&&<div className="notice-error">{error}</div>}{message&&<div className="notice-success">{message}</div>}<button disabled={busy} className="button-primary w-full justify-center py-3">{busy?'Veuillez patienter…':mode==='login'?'Se connecter':'Créer mon compte'} <ArrowRight size={17}/></button></form>
      {mode==='login'&&<div className="mt-4 text-right"><Link to="/forgot-password" className="text-sm font-medium text-sahaba-700 hover:underline">Mot de passe oublié ?</Link></div>}
      <p className="mt-7 text-center text-sm text-slate-500">{mode==='login'?'Pas encore de compte ?':'Vous avez déjà un compte ?'} <button className="font-semibold text-sahaba-700 hover:underline" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setMessage('')}}>{mode==='login'?'Créer un compte':'Se connecter'}</button></p>
    </div></div></div>
}