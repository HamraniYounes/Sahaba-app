import { useEffect, useState } from 'react'
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createModerationSession, deleteModerationSession, listModerationSessions, updateModerationSession, type ModerationSession } from '../services/moderationSessionService'

const emptyForm = { title: '', scheduled_at: '', note: '' }
type SessionForm = typeof emptyForm

function toLocalInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

export default function ModerationSessions() {
  const [sessions, setSessions] = useState<ModerationSession[]>([])
  const [form, setForm] = useState<SessionForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await listModerationSessions()
    if (queryError) setError(queryError.message)
    else setSessions(data ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function editSession(session: ModerationSession) {
    setEditingId(session.id)
    setForm({ title: session.title, scheduled_at: toLocalInput(session.scheduled_at), note: session.note ?? '' })
    setError('')
    setNotice('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const payload = { title: form.title.trim(), scheduled_at: new Date(form.scheduled_at).toISOString(), note: form.note.trim() || null }
    const result = editingId ? await updateModerationSession(editingId, payload) : await createModerationSession(payload)
    if (result.error) setError(result.error.message)
    else {
      setNotice(editingId ? 'Session mise à jour.' : 'Session créée.')
      resetForm()
      await load()
    }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!window.confirm('Supprimer cette session de modération ?')) return
    setError('')
    setNotice('')
    const { error: deleteError } = await deleteModerationSession(id)
    if (deleteError) setError(deleteError.message)
    else {
      setSessions(previous => previous.filter(session => session.id !== id))
      setNotice('Session supprimée.')
    }
  }

  return <div className="container-shell py-10 sm:py-14">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow-light">Administration</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">Sessions de modération</h1>
        <p className="mt-2 text-slate-500">Planifiez les créneaux de revue et gardez une note opérationnelle pour l’équipe.</p>
      </div>
      <a className="button-secondary" href="/admin">Retour à l’administration</a>
    </div>

    {error && <div role="alert" className="notice-error mt-5">{error}</div>}
    {notice && <div role="status" className="notice-success mt-5">{notice}</div>}

    <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.8fr)]">
      <section className="space-y-3">
        {loading ? <div className="loading-block">Chargement des sessions…</div> : sessions.map(session => <article key={session.id} className="admin-row">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-sahaba-700" />
              <p className="font-semibold text-slate-800">{session.title}</p>
            </div>
            <p className="mt-2 text-sm text-slate-500">{new Date(session.scheduled_at).toLocaleString('fr-BE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            {session.note && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{session.note}</p>}
          </div>
          <div className="flex gap-2">
            <button className="icon-button text-sahaba-700" onClick={() => editSession(session)} title="Modifier" aria-label={`Modifier ${session.title}`}><Pencil size={17} /></button>
            <button className="icon-button text-rose-600" onClick={() => void remove(session.id)} title="Supprimer" aria-label={`Supprimer ${session.title}`}><Trash2 size={17} /></button>
          </div>
        </article>)}
        {!loading && !sessions.length && <div className="empty-state"><CalendarClock size={28} className="mx-auto text-sahaba-600" /><h2>Aucune session planifiée</h2><p>Créez le prochain créneau de modération.</p></div>}
      </section>

      <form onSubmit={save} className="form-section space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">{editingId ? 'Modifier la session' : 'Nouvelle session'}</h2>
          {editingId && <button type="button" className="icon-button" onClick={resetForm} title="Annuler" aria-label="Annuler la modification"><X size={17} /></button>}
        </div>
        <label className="form-label">Titre *<input required minLength={2} maxLength={160} value={form.title} onChange={e => setForm(previous => ({ ...previous, title: e.target.value }))} /></label>
        <label className="form-label">Date et heure *<input required type="datetime-local" value={form.scheduled_at} onChange={e => setForm(previous => ({ ...previous, scheduled_at: e.target.value }))} /></label>
        <label className="form-label">Note interne<textarea rows={5} maxLength={4000} value={form.note} onChange={e => setForm(previous => ({ ...previous, note: e.target.value }))} placeholder="Points à vérifier, répartition de la file, décisions attendues…" /></label>
        <button className="button-primary" disabled={saving}><Plus size={17} />{saving ? 'Enregistrement…' : editingId ? 'Enregistrer les changements' : 'Planifier la session'}</button>
      </form>
    </div>
  </div>
}
