import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    if (!isSupabaseConfigured) { setError('Configurez Supabase dans .env.local avant de continuer.'); return }
    setBusy(true)
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (requestError) throw requestError
      setMessage('Si cette adresse correspond à un compte, un e-mail de réinitialisation va être envoyé.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'La demande a échoué.') }
    finally { setBusy(false) }
  }

  return <div className="container-shell max-w-lg py-16"><p className="eyebrow-light">Récupération du compte</p><h1 className="mt-2 font-display text-3xl font-semibold">Mot de passe oublié</h1><p className="mt-3 text-slate-600">Saisissez l’adresse associée à votre compte Sahaba.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="form-label">Adresse e-mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>{error && <div className="notice-error">{error}</div>}{message && <div className="notice-success">{message}</div>}<button className="button-primary" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer le lien'}</button></form><Link className="mt-5 inline-block text-sm text-sahaba-700 hover:underline" to="/login">Retour à la connexion</Link></div>
}

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    if (!isSupabaseConfigured) { setError('Configurez Supabase dans .env.local avant de continuer.'); return }
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setMessage('Mot de passe modifié. Redirection vers votre compte…')
      window.setTimeout(() => navigate('/profile', { replace: true }), 900)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'La modification a échoué. Ouvrez le lien reçu par e-mail et réessayez.') }
    finally { setBusy(false) }
  }

  return <div className="container-shell max-w-lg py-16"><p className="eyebrow-light">Sécurité du compte</p><h1 className="mt-2 font-display text-3xl font-semibold">Choisir un nouveau mot de passe</h1><form onSubmit={submit} className="mt-6 space-y-4"><label className="form-label">Nouveau mot de passe<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <div className="notice-error">{error}</div>}{message && <div className="notice-success">{message}</div>}<button className="button-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Modifier le mot de passe'}</button></form><Link className="mt-5 inline-block text-sm text-sahaba-700 hover:underline" to="/login">Retour à la connexion</Link></div>
}
