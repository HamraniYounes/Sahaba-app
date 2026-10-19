import { useMemo, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { CSV_LOCATION_COLUMNS, parseCsvForPreview, type CsvLocationInsert } from '../lib/csvImport'
import { importLocationsInBatches, prepareLocationsWithGeocoding, BATCH_SIZE, type ImportLogEntry, type ImportResult } from '../services/locationImportService'

const TEMPLATE = `${CSV_LOCATION_COLUMNS.join(',')}\n\n`
function downloadTemplate() { const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'sahaba-locations-template.csv'; anchor.click(); URL.revokeObjectURL(url) }

export default function AdminLocationImport() {
  const { user } = useAuth(); const [fileName, setFileName] = useState(''); const [rows, setRows] = useState<CsvLocationInsert[]>([]); const [validationErrors, setValidationErrors] = useState<string[]>([]); const [parseNotice, setParseNotice] = useState(''); const [preparationLog, setPreparationLog] = useState<ImportLogEntry[]>([]); const [preparing, setPreparing] = useState(false); const [importing, setImporting] = useState(false); const [geocodingPrepared, setGeocodingPrepared] = useState(false); const [result, setResult] = useState<ImportResult | null>(null)
  const previewRows = useMemo(() => rows.slice(0, 20), [rows])
  async function handleFile(file: File) {
    setFileName(file.name); setResult(null); setParseNotice(''); setValidationErrors([]); setRows([]); setPreparationLog([]); setGeocodingPrepared(false)
    if (!file.name.toLowerCase().endsWith('.csv')) { setValidationErrors(['Sélectionnez un fichier .csv.']); return }
    const text = await file.text(); if (!user) { setValidationErrors(['Session administrateur introuvable.']); return }
    const parsed = parseCsvForPreview(text, user.id); setRows(parsed.rows); setValidationErrors(parsed.errors)
    if (!parsed.errors.length) setParseNotice(`${parsed.rows.length} ligne(s) validée(s). Préparez le géocodage avant toute insertion.`)
    else if (parsed.rows.length) setParseNotice(`${parsed.rows.length} ligne(s) valides sont prêtes. Les lignes en erreur seront exclues et ajoutées au journal.`)
  }
  async function prepareImport() {
    if (!rows.length || preparing || importing) return
    setPreparing(true); setResult(null)
    try {
      const prepared = await prepareLocationsWithGeocoding(rows)
      setRows(prepared.rows); setPreparationLog(prepared.log); setGeocodingPrepared(true)
      setParseNotice(`${prepared.rows.length} ligne(s) prêtes pour insertion · ${prepared.geocoded} géocodée(s) · ${prepared.errors} erreur(s) de géocodage exclue(s).`)
    } finally { setPreparing(false) }
  }
  async function startImport() {
    if (!rows.length || importing || !geocodingPrepared) return
    setImporting(true); setResult(null)
    try {
      const imported = await importLocationsInBatches(rows)
      const validationLog = validationErrors.map(message => ({ row: Number(message.match(/^Ligne (\d+)/)?.[1] ?? 1), status: 'error' as const, message }))
      const preparationErrors = preparationLog.filter(entry => entry.status === 'error').length
      const geocoded = preparationLog.filter(entry => entry.status === 'geocoded').length
      setResult({ ...imported, geocoded, errors: imported.errors + validationLog.length + preparationErrors, log: [...validationLog, ...preparationLog, ...imported.log].sort((a, b) => a.row - b.row) })
    } finally { setImporting(false) }
  }
  return <section className="mt-6 space-y-5">
    <div className="form-section">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="section-title">Import CSV de lieux</h2><p className="mt-1 text-sm text-slate-500">Accès limité à l’espace admin/modération. Les lignes importées restent <strong>en attente de modération</strong> et passent par les RLS Supabase.</p></div><button type="button" className="button-secondary shrink-0" onClick={downloadTemplate}><Download size={16}/> Télécharger le modèle</button></div>
      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center hover:border-sahaba-300"><FileSpreadsheet className="text-sahaba-700" size={30}/><span className="mt-3 font-semibold text-slate-800">Choisir un CSV</span><span className="mt-1 text-sm text-slate-500">Colonnes strictes, coordonnées facultatives. Les lignes sans coordonnées sont géocodées une par une avec cache et limitation de débit.</span><input className="sr-only" type="file" accept=".csv,text/csv" onChange={event => { const file = event.target.files?.[0]; if (file) void handleFile(file) }} /></label>
      {fileName && <p className="text-sm text-slate-600">Fichier : <strong>{fileName}</strong></p>}
      {validationErrors.length > 0 && <div className="notice-error"><p className="font-semibold">Lignes exclues de l’insertion</p><ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.slice(0, 20).map(error => <li key={error}>{error}</li>)}{validationErrors.length > 20 && <li>… {validationErrors.length - 20} autre(s) erreur(s)</li>}</ul></div>}
      {parseNotice && <div className="notice-success">{parseNotice}</div>}
    </div>
    {rows.length > 0 && <div className="form-section overflow-hidden"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="section-title">Aperçu avant insertion</h3><p className="text-sm text-slate-500">{rows.length} ligne(s) prêtes · aperçu des 20 premières · lots de {BATCH_SIZE}.</p></div><div className="flex flex-wrap gap-2"><button className="button-secondary" disabled={preparing || importing} onClick={() => void prepareImport()}><FileSpreadsheet size={16}/>{preparing ? 'Géocodage en cours…' : geocodingPrepared ? 'Recalculer le géocodage' : 'Préparer le géocodage'}</button><button className="button-primary" disabled={!rows.length || importing || preparing || !geocodingPrepared} onClick={() => void startImport()}><Upload size={16}/>{importing ? 'Import en cours…' : 'Lancer l’import'}</button></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Ville</th><th className="px-3 py-2">Pays</th><th className="px-3 py-2">Adresse</th><th className="px-3 py-2">Coordonnées</th><th className="px-3 py-2">Statut</th></tr></thead><tbody>{previewRows.map((row, index) => <tr key={`${row.slug}-${index}`} className="border-b border-slate-100"><td className="px-3 py-2 font-medium">{row.name}</td><td className="px-3 py-2">{row.category}</td><td className="px-3 py-2">{row.city}</td><td className="px-3 py-2">{row.country}</td><td className="px-3 py-2">{row.address || '—'}</td><td className="px-3 py-2">{row.latitude == null ? '—' : `${row.latitude}, ${row.longitude}`}</td><td className="px-3 py-2 text-amber-700">pending</td></tr>)}</tbody></table></div></div>}
    {result && <div className="form-section"><h3 className="section-title">Journal de l’import</h3><div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-sahaba-50 p-4"><CheckCircle2 size={18}/><p className="mt-2 text-2xl font-semibold">{result.inserted}</p><p className="text-sm text-slate-500">insérés</p></div><div className="rounded-xl bg-slate-50 p-4"><FileSpreadsheet size={18}/><p className="mt-2 text-2xl font-semibold">{result.skipped}</p><p className="text-sm text-slate-500">ignorés (doublons)</p></div><div className="rounded-xl bg-blue-50 p-4"><FileSpreadsheet size={18}/><p className="mt-2 text-2xl font-semibold">{result.geocoded}</p><p className="text-sm text-slate-500">géocodés</p></div><div className="rounded-xl bg-rose-50 p-4"><XCircle size={18}/><p className="mt-2 text-2xl font-semibold">{result.errors}</p><p className="text-sm text-slate-500">erreurs</p></div></div><div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-200">{result.log.map(entry => <div key={`${entry.row}-${entry.status}-${entry.message}`} className="border-b border-slate-100 px-4 py-3 text-sm"><span className="font-semibold">Ligne {entry.row}</span> · <span className={entry.status === 'inserted' ? 'text-sahaba-700' : entry.status === 'skipped' ? 'text-amber-700' : entry.status === 'geocoded' ? 'text-blue-700' : 'text-rose-700'}>{entry.status}</span> · {entry.message}</div>)}</div></div>}
  </section>
}
