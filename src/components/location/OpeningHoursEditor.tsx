import { Plus, Trash2 } from 'lucide-react'
import { DAY_KEYS, emptyOpeningHours, formatOpeningIntervals, normalizeOpeningHours, validateOpeningHoursValue } from '../../lib/openingHours'
import type { DayKey, OpeningHours } from '../../types/database'

const labels: Record<DayKey, string> = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' }

type Props = { value: OpeningHours | unknown; onChange: (value: OpeningHours) => void }

export default function OpeningHoursEditor({ value, onChange }: Props) {
  const hours = normalizeOpeningHours(value)
  function update(day: DayKey, index: number, key: 'open' | 'close', next: string) {
    const intervals = hours[day].map((interval, currentIndex) => currentIndex === index ? { ...interval, [key]: next } : interval)
    onChange({ ...hours, [day]: intervals })
  }
  function add(day: DayKey) {
    if (hours[day].length >= 4) return
    const next = [...hours[day], { open: '09:00', close: '18:00' }]
    onChange({ ...hours, [day]: next })
  }
  function remove(day: DayKey, index: number) {
    onChange({ ...hours, [day]: hours[day].filter((_, currentIndex) => currentIndex !== index) })
  }
  const validationError = validateOpeningHoursValue(hours)
  return <div className="space-y-3">
    {DAY_KEYS.map(day => <div key={day} className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800">{labels[day]}</p><button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-sahaba-700" onClick={() => add(day)} disabled={hours[day].length >= 4}><Plus size={14} /> Ajouter une plage</button></div>
      {!hours[day].length && <p className="mt-2 text-xs text-slate-400">Fermé</p>}
      <div className="mt-2 space-y-2">{hours[day].map((interval, index) => <div key={`${day}-${index}`} className="flex items-center gap-2"><input className="form-control" type="time" value={interval.open} onChange={e => update(day, index, 'open', e.target.value)} aria-label={`${labels[day]} ouverture ${index + 1}`} /><span className="text-slate-400">à</span><input className="form-control" type="time" value={interval.close} onChange={e => update(day, index, 'close', e.target.value)} aria-label={`${labels[day]} fermeture ${index + 1}`} /><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Supprimer la plage ${labels[day]} ${index + 1}`} onClick={() => remove(day, index)}><Trash2 size={16} /></button></div>)}</div>
    </div>)}
    {validationError && <p role="alert" className="text-sm text-rose-700">{validationError}</p>}
    <p className="text-xs text-slate-500">Plusieurs plages par jour sont possibles, par exemple {formatOpeningIntervals([{ open: '11:30', close: '14:00' }, { open: '18:00', close: '22:30' }])}. Pour une fermeture complète, laissez le jour vide.</p>
  </div>
}
