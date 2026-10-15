import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Flag, Heart, Share2 } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Location } from '../types/database'
import { categoryLabel } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import Advertisements from '../components/Advertisements'
import LocationGallery from '../components/location/LocationGallery'
import LocationInfoCard from '../components/location/LocationInfoCard'
import LocationReviews from '../components/location/LocationReviews'
import { getFavoriteState, getLocationBySlug, getLocationReviews, incrementLocationViews, setFavorite, submitClaim as createClaim, submitReport as createReport, upsertOwnerReply, upsertReview, type Review } from '../services/communityService'

const features = [
  ['halal_full', 'Halal'], ['alcohol_free', 'Sans alcool'], ['prayer_room', 'Salle de prière'], ['wudu_facilities', 'Installations wudu'],
  ['women_only', 'Réservé aux femmes'], ['burkini_friendly', 'Burkini accepté'], ['vegetarian_options', 'Options végétariennes'], ['vegan_options', 'Options véganes'],
  ['accessible', 'Accessible'], ['parking', 'Parking'],
] as const

export default function LocationDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [place, setPlace] = useState<Location | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [notice, setNotice] = useState('')
  const [favorite, setFavoriteState] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('incorrect')
  const [claimOpen, setClaimOpen] = useState(false)
  const [claimMessage, setClaimMessage] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const viewedSlug = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!isSupabaseConfigured || !slug) { setLoading(false); return }
      setLoading(true); setError('')
      const { data, error: locationError } = await getLocationBySlug(slug)
      if (!active) return
      if (locationError || !data) { setError('Ce lieu est introuvable ou n’est pas accessible.'); setLoading(false); return }
      setPlace(data)
      document.title = `${data.name} — Sahaba`
      const description = [data.name, data.address, data.city, data.country, data.description].filter(Boolean).join(' · ').slice(0, 300)
      let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (!descriptionTag) { descriptionTag = document.createElement('meta'); descriptionTag.name = 'description'; document.head.appendChild(descriptionTag) }
      descriptionTag.content = description
      if (viewedSlug.current !== slug) { viewedSlug.current = slug; void incrementLocationViews(data.id) }
      const { data: reviewData } = await getLocationReviews(data.id)
      if (active) setReviews((reviewData || []) as Review[])
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!place || !user) { setFavoriteState(false); return }
    let active = true
    void getFavoriteState(place.id, user.id).then(({ data }) => { if (active) setFavoriteState(Boolean(data)) })
    return () => { active = false }
  }, [place, user])

  async function reloadReviews(locationId: string) {
    const { data, error: reviewError } = await getLocationReviews(locationId)
    if (reviewError) { setNotice(reviewError.message); return }
    setReviews((data || []) as Review[])
  }
  async function submitReview(event: React.FormEvent) {
    event.preventDefault(); if (!user || !place) { setNotice('Connectez-vous pour publier un avis.'); return }
    const { error: reviewError } = await upsertReview(place.id, user.id, rating, comment.trim() || null)
    if (reviewError) { setNotice(reviewError.message); return }
    setNotice('Votre avis a été enregistré.'); setComment(''); await reloadReviews(place.id)
  }
  async function toggleFavorite() {
    if (!user) { setNotice('Connectez-vous pour gérer vos favoris.'); return }
    if (!place) return
    const result = await setFavorite(user.id, place.id, !favorite)
    if (result.error) setNotice(result.error.message); else setFavoriteState(!favorite)
  }
  async function submitReport(event: React.FormEvent) {
    event.preventDefault(); if (!place) return
    const { error: reportError } = await createReport(place.id, user?.id || null, reportReason)
    setNotice(reportError ? reportError.message : 'Signalement envoyé pour examen.'); setReportOpen(false)
  }
  async function submitClaim(event: React.FormEvent) {
    event.preventDefault(); if (!user || !place) { setNotice('Connectez-vous pour réclamer cette fiche.'); return }
    const { error: claimError } = await createClaim(place.id, user.id, claimMessage.trim() || null)
    setNotice(claimError ? 'Votre demande n’a pas pu être envoyée.' : 'Votre demande de réclamation a été envoyée à la modération.')
    if (!claimError) { setClaimOpen(false); setClaimMessage('') }
  }
  async function submitOwnerReply(event: React.FormEvent, reviewId: string) {
    event.preventDefault(); if (!user || !place) return
    const body = (replyDrafts[reviewId] || '').trim(); if (!body) return
    const { error: replyError } = await upsertOwnerReply(reviewId, user.id, body)
    if (replyError) { setNotice(replyError.message); return }
    setReplyDrafts(previous => ({ ...previous, [reviewId]: '' })); setNotice('Réponse du propriétaire enregistrée.'); await reloadReviews(place.id)
  }
  async function shareLocation() {
    if (!navigator.clipboard) { setNotice('La copie du lien n’est pas disponible sur ce navigateur.'); return }
    try { await navigator.clipboard.writeText(window.location.href); setNotice('Lien copié.') } catch { setNotice('Impossible de copier le lien.') }
  }

  if (loading) return <div className="page-wrap"><div className="loading-block">Chargement du lieu…</div></div>
  if (!place) return <div className="page-wrap"><div className="empty-state"><h2>Lieu indisponible</h2><p>{error || 'Ce lieu n’existe pas.'}</p><Link to="/" className="button-primary mt-4">Retour à l’exploration</Link></div></div>

  const canClaim = Boolean(user && place.status === 'published' && !place.owner_id)
  const enabledFeatures = features.filter(([key]) => place[key])

  return <div>
    <Advertisements placement="detail" />
    <div className="container-shell py-8 sm:py-12">
      <Link to="/" className="text-sm font-medium text-sahaba-700 hover:underline">← Retour aux résultats</Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.3fr_.7fr]">
        <main>
          <LocationGallery name={place.name} coverImage={place.cover_image} photos={place.photos || []} />
          <div className="mt-7">
            <span className="eyebrow-light">{categoryLabel(place.category)}</span>
            <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{place.name}</h1>
            <p className="mt-3 text-slate-500">{[place.address, place.city, place.country].filter(Boolean).join(', ')}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">{place.review_count ? `${place.average_rating.toFixed(1)} · ${place.review_count} avis` : 'Pas encore noté'}</span>
              {place.status === 'claimed' && <span className="inline-flex items-center gap-1 rounded-full bg-sahaba-50 px-3 py-1.5 text-sm font-semibold text-sahaba-800"><CheckCircle2 size={15} /> Propriétaire vérifié</span>}
              {user && (place.owner_id === user.id || place.created_by === user.id) && <Link to={`/location/${place.slug}/edit`} className="button-secondary">Modifier la fiche</Link>}
            </div>
          </div>
          <section className="mt-8 border-t border-slate-200 pt-7"><h2 className="font-display text-2xl font-semibold">À propos</h2><p className="mt-3 whitespace-pre-line leading-7 text-slate-600">{place.description || 'Aucune description disponible pour le moment.'}</p></section>
          <section className="mt-8 border-t border-slate-200 pt-7"><h2 className="font-display text-2xl font-semibold">Caractéristiques</h2><div className="mt-4 flex flex-wrap gap-2">{enabledFeatures.map(([key, label]) => <span key={key} className="rounded-full border border-sahaba-100 bg-sahaba-50 px-3 py-2 text-sm text-sahaba-800"><CheckCircle2 size={14} className="mr-1.5 inline" />{label}</span>)}{!enabledFeatures.length && <p className="text-sm text-slate-500">Aucune caractéristique renseignée.</p>}</div></section>
          <LocationReviews reviews={reviews} userId={user?.id} ownerId={place.owner_id} rating={rating} comment={comment} onRatingChange={setRating} onCommentChange={setComment} onSubmitReview={submitReview} replyDrafts={replyDrafts} onReplyDraftChange={(id, value) => setReplyDrafts(previous => ({ ...previous, [id]: value }))} onSubmitReply={submitOwnerReply} />
        </main>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <LocationInfoCard location={place} />
          {canClaim && <button className="button-secondary w-full justify-center" onClick={() => setClaimOpen(value => !value)}>Réclamer cette fiche</button>}
          {claimOpen && canClaim && <form onSubmit={submitClaim} className="rounded-2xl border border-slate-200 p-4"><label className="form-label">Informations pour vérifier votre lien avec l’établissement<textarea rows={3} maxLength={3000} value={claimMessage} onChange={e => setClaimMessage(e.target.value)} placeholder="Décrivez votre rôle ou les justificatifs disponibles…" /></label><button className="button-primary mt-3 w-full justify-center">Envoyer la demande</button></form>}
          <div className="grid grid-cols-2 gap-2"><button className="button-secondary justify-center" onClick={() => void toggleFavorite()}><Heart size={16} fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'Enregistré' : 'Favoris'}</button><button className="button-secondary justify-center" onClick={() => void shareLocation()}><Share2 size={16} />Partager</button></div>
          <button className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-rose-600" onClick={() => setReportOpen(value => !value)}><Flag size={15} /> Signaler une erreur</button>
          {reportOpen && <form onSubmit={submitReport} className="space-y-3"><select className="form-control" value={reportReason} onChange={e => setReportReason(e.target.value)}><option value="incorrect">Informations incorrectes</option><option value="obsolete">Informations obsolètes</option><option value="duplicate">Doublon</option><option value="other">Autre</option></select><button className="button-secondary w-full justify-center">Envoyer le signalement</button></form>}
          {notice && <p className="text-sm text-sahaba-700">{notice}</p>}
        </aside>
      </div>
    </div>
  </div>
}
