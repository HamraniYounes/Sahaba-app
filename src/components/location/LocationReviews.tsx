import { Star } from 'lucide-react'
import type { Review } from '../../services/communityService'

type Props = {
  reviews: Review[]
  userId?: string
  ownerId: string | null
  rating: number
  comment: string
  onRatingChange: (value: number) => void
  onCommentChange: (value: string) => void
  onSubmitReview: (event: React.FormEvent) => void
  replyDrafts: Record<string, string>
  onReplyDraftChange: (reviewId: string, value: string) => void
  onSubmitReply: (event: React.FormEvent, reviewId: string) => void
}

export default function LocationReviews({ reviews, userId, ownerId, rating, comment, onRatingChange, onCommentChange, onSubmitReview, replyDrafts, onReplyDraftChange, onSubmitReply }: Props) {
  return <section className="mt-8 border-t border-slate-200 pt-7">
    <h2 className="font-display text-2xl font-semibold">Avis de la communauté</h2>
    {userId ? <form onSubmit={onSubmitReview} className="mt-4 rounded-2xl border border-slate-200 p-4">
      <label className="form-label">Votre note<select value={rating} onChange={e => onRatingChange(Number(e.target.value))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label>
      <label className="form-label mt-3">Votre avis<textarea rows={3} value={comment} onChange={e => onCommentChange(e.target.value)} maxLength={5000} placeholder="Partagez votre expérience…" /></label>
      <button className="button-primary mt-3">Publier l’avis</button>
    </form> : <p className="mt-3 text-sm text-slate-500">Connectez-vous pour laisser un avis.</p>}
    <div className="mt-5 space-y-4">
      {reviews.map(review => <article key={review.id} className="rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-800">Membre de la communauté</span><span className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString('fr-BE')}</span></div>
        <div className="mt-2 flex gap-0.5">{[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} className={n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />)}</div>
        {review.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>}
        {review.owner_replies?.map(reply => <div key={reply.id} className="mt-3 rounded-xl bg-sahaba-50 p-3"><p className="text-xs font-semibold text-sahaba-800">Réponse du propriétaire</p><p className="mt-1 text-sm text-slate-700">{reply.body}</p></div>)}
        {userId && ownerId === userId && <form onSubmit={e => onSubmitReply(e, review.id)} className="mt-3"><label className="form-label">Répondre à cet avis<textarea rows={2} maxLength={2000} value={replyDrafts[review.id] || ''} onChange={e => onReplyDraftChange(review.id, e.target.value)} placeholder="Réponse du propriétaire…" /></label><button className="button-secondary mt-2">Publier la réponse</button></form>}
      </article>)}
      {!reviews.length && <p className="mt-4 text-sm text-slate-500">Aucun avis publié. Soyez le premier à partager votre expérience.</p>}
    </div>
  </section>
}
