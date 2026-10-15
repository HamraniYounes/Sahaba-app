import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { LocationClosure } from '../../types/database'
import { createLocationClosure, deleteLocationClosure, getLocationClosures } from '../../services/locationService'

const typeLabels = { exceptional: 'Exceptionnelle', temporary: 'Temporaire', definitive: 'Définitive' } as const

type Props = { locationId: string; userId: string }

export default function LocationClosuresEditor({ locationId, userId }: Props) {
  const [closures, setClosures] = useState<LocationClosure[]>([])
  const [type, setType] = useState<LocationClosure['closure_type']>('exceptional')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error: loadError } = await getLocationClosures(locationId)
    if (loadError) setError(loadError.message)
    else setClosures(data || [])
  }

  useEffect(() => { void load() }, [locationId])

  async function addClosure(event: React.FormEvent) {
    event.preventDefault(); setError('')
    if (!startsOn || (type !== 'definitive' && !endsOn)) { setError('Renseignez les dates de fermeture.'); return }
    if (type !== 'definitive' && endsOn < startsOn) { setError('La date de fin doit être postérieure ou égale à la date de début.'); return }
    setBusy(true)
    const { error: insertError } = await createLocationClosure({ location_id: locationId, closure_type: type, starts_on: startsOn, ends_on: type === 'definitive' ? null : endsOn, reason: reason.trim() || null, created_by: userId })
    if (insertError) setError(insertError.message)
    else { setStartsOn(''); setEndsOn(''); setReason(''); await load() }
    setBusy(false)
  }

  async function removeClosure(id: string) {
    setError(''); const { error: deleteError } = await deleteLocationClosure(id); if (deleteError) setError(deleteError.message); else setClosures(current => current.filter(item => item.id !== id))
  }

  return <section className="space-y-4 rounded-xl border border-slate-200 p-4">
    <div><h2 className="font-semibold">Fermetures exceptionnelles</h2><p className="mt-1 text-sm text-slate-500">Ajoutez une fermeture ponctuelle, une période temporaire ou indiquez une fermeture définitive.</p></div>
    <form onSubmit={addClosure} className="grid gap-3 sm:grid-cols-2">
      <label className="form-label">Type<select value={type} onChange={e => setType(e.target.value as LocationClosure['closure_type'])}>{Object.entries(typeLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="form-label">Début<input type="date" required value={startsOn} onChange={e => setStartsOn(e.target.value)} /></label>
      {type !== 'definitive' && <label className="form-label">Fin<input type="date" required value={endsOn} onChange={e => setEndsOn(e.target.value)} min={startsOn || undefined} /></label>}
      <label className="form-label sm:col-span-2">Motif (facultatif)<input maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Jour férié, travaux, congés…" /></label>
      <button disabled={busy} className="button-secondary sm:col-span-2">{busy ? 'Enregistrement…' : 'Ajouter la fermeture'}</button>
    </form>
    {closures.length > 0 && <div className="space-y-2">{closures.map(closure => <div key={closure.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-sm"><div><p className="font-medium">{typeLabels[closure.closure_type]} · {closure.starts_on}{closure.ends_on ? ` → ${closure.ends_on}` : ''}</p>{closure.reason && <p className="mt-1 text-xs text-slate-500">{closure.reason}</p>}</div><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label="Supprimer la fermeture" onClick={() => void removeClosure(closure.id)}><Trash2 size={16} /></button></div>)}</div>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </section>
}
