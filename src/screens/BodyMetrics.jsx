import { useState } from 'react'
import { Plus, RefreshCw, Loader2, Upload, Target } from 'lucide-react'
import { Modal } from '../components/Modal'
import { calcBioAge } from '../utils/bioAge'
import { calcBodyProjection } from '../utils/projection'
import { getAIInsight } from '../ai/claude'
import { showToast } from '../utils/toast'
import { detectAndParseCSV } from '../lib/csvImport'

const TARGETS = { weight: 175, bodyFat: 15, visceralFat: 9, waist: null }

function StatCard({ label, value, unit, target, color = 'text-primary-color' }) {
  const diff = target != null && value != null ? value - target : null
  return (
    <div className="glass-elevated rounded-xl p-3">
      <div className={`font-heading text-xl font-bold ${color}`}>{value ?? '—'}{value != null ? unit : ''}</div>
      <div className="text-muted-color text-xs mt-0.5">{label}</div>
      {diff !== null && (
        <div className={`text-[10px] mt-1 ${diff > 0 ? 'text-amber-400' : 'text-accent'}`}>
          {diff > 0 ? `${diff.toFixed(1)}${unit} above target` : `${Math.abs(diff).toFixed(1)}${unit} below target ✓`}
        </div>
      )}
    </div>
  )
}

function SVGChart({ data, color = '#10b981', label, unit = '' }) {
  if (data.length < 2) return <div className="text-muted-color text-sm text-center py-4">Need 2+ entries to show chart</div>

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 320; const H = 80; const PAD = 8

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.value - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-muted-color text-[10px]">
        <span>{data[0]?.date}</span>
        <span>{label}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => {
          const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
          const y = H - PAD - ((d.value - min) / range) * (H - PAD * 2)
          return <circle key={i} cx={x} cy={y} r={3} fill={color} />
        })}
      </svg>
      <div className="flex justify-between text-muted-color text-xs">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export function BodyMetrics({ state, addBodyMetric, today, user }) {
  const [showCheckin, setShowCheckin] = useState(false)
  const [form, setForm] = useState({ date: today, weight: '', bodyFat: '', visceralFat: '', waist: '', neck: '', muscleMass: '' })
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [csvPreview, setCsvPreview] = useState(null) // { rows, unmappedColumns, type }

  const metrics = state.bodyMetrics
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null
  const bioAge = calcBioAge(state.bodyMetrics, state.inflam)
  const projection = calcBodyProjection(state.bodyMetrics)

  function submit() {
    const entry = {
      date: form.date,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
      visceralFat: form.visceralFat ? parseFloat(form.visceralFat) : undefined,
      waist: form.waist ? parseFloat(form.waist) : undefined,
      neck: form.neck ? parseFloat(form.neck) : undefined,
      muscleMass: form.muscleMass ? parseFloat(form.muscleMass) : undefined,
    }
    // Remove undefined keys
    Object.keys(entry).forEach((k) => entry[k] === undefined && delete entry[k])
    addBodyMetric(entry)
    showToast('Check-in saved')
    setShowCheckin(false)
    setForm({ date: today, weight: '', bodyFat: '', visceralFat: '', waist: '', neck: '', muscleMass: '' })
  }

  function handleCSVFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = detectAndParseCSV(ev.target.result)
      setCsvPreview(result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function confirmImport() {
    if (!csvPreview?.rows?.length) return
    csvPreview.rows.forEach(row => {
      // Map csvImport field names to app field names
      addBodyMetric({
        date: row.date,
        weight: row.weight_lbs,
        bodyFat: row.body_fat_pct,
        visceralFat: row.visceral_fat,
        muscleMass: row.muscle_mass_lbs,
        waist: row.waist_inches,
        neck: row.neck_inches,
      })
    })
    showToast(`Imported ${csvPreview.rows.length} entries`)
    setCsvPreview(null)
  }

  async function loadInsight() {
    if (!state.apiKey) { showToast('Add API key in Settings', 'warn'); return }
    setLoading(true)
    try {
      const latestStr = latest ? `Current: ${latest.weight}lbs, ${latest.bodyFat}% BF, visceral fat ${latest.visceralFat}` : 'No measurements yet'
      const text = await getAIInsight(
        state.apiKey,
        `${latestStr}. Biological age: ${bioAge}. Target: 175lbs, 15% BF, visceral fat <9. Give me root cause analysis of my current body composition and the most important intervention to reach my targets. 3-4 sentences, specific and actionable.`,
        state,
        today
      )
      setInsight(text)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const weightData = metrics.filter((m) => m.weight != null).map((m) => ({ date: m.date, value: m.weight }))
  const bfData = metrics.filter((m) => m.bodyFat != null).map((m) => ({ date: m.date, value: m.bodyFat }))

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-primary-color tracking-wide">Body Metrics</h1>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 btn-ghost rounded-xl px-3 py-2 text-xs font-medium cursor-pointer" style={{ fontSize: 12, padding: '8px 12px' }}>
            <Upload size={14} style={{ color: 'var(--accent)' }} />
            Import Any CSV
            <input type="file" accept=".csv" onChange={handleCSVFile} className="hidden" />
          </label>
          <button onClick={() => setShowCheckin(true)} className="flex items-center gap-1.5 btn-primary rounded-xl px-3 py-2 text-xs font-medium">
            <Plus size={14} />
            Check-in
          </button>
        </div>
      </div>

      {csvPreview && (
        <div className="glass" style={{ padding: 16 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            CSV Preview — {csvPreview.type !== 'unknown' ? csvPreview.type.replace('_', ' ') : 'Unknown format'}
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
              Found {csvPreview.rows?.length ?? 0} {(csvPreview.rows?.length ?? 0) === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          {csvPreview.rows?.length > 0 && csvPreview.rows[0] && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Mapped fields:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(csvPreview.rows[0]).filter(k => k !== 'raw_data' && csvPreview.rows[0][k] != null).map(k => (
                  <span key={k} style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                    ✓ {k.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          {csvPreview.unmappedColumns?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Unmapped (ignored):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {csvPreview.unmappedColumns.map(c => (
                  <span key={c} style={{ background: 'rgba(71,85,105,0.3)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                    — {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={confirmImport}
              disabled={!csvPreview.rows?.length}
              className="btn-primary"
              style={{ flex: 1, padding: '10px 0', fontSize: 13, cursor: !csvPreview.rows?.length ? 'not-allowed' : 'pointer', opacity: !csvPreview.rows?.length ? 0.5 : 1 }}
            >
              Import {csvPreview.rows?.length ?? 0} entries
            </button>
            <button
              onClick={() => setCsvPreview(null)}
              className="btn-ghost"
              style={{ flex: 1, padding: '10px 0', fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bio Age */}
      <div className={`glass rounded-2xl p-4 flex items-center justify-between ${bioAge < 36 ? 'bg-emerald-500/15' : bioAge <= 40 ? 'bg-amber-500/15' : 'bg-red-500/15'}`}>
        <div>
          <div className="text-muted-color text-xs uppercase font-heading tracking-widest">Functional Bio Age</div>
          <div className={`font-heading text-5xl font-bold mt-1 ${bioAge < 36 ? 'text-accent' : bioAge <= 40 ? 'text-amber-400' : 'text-red-400'}`}>{bioAge}</div>
          <div className="text-muted-color text-xs mt-1">Actual age: {user?.actual_age ?? 36} · Target: &lt;30</div>
        </div>
        <div className="text-right">
          <div className="text-muted-color text-xs">Key drivers</div>
          <div className="text-primary-color text-xs mt-1">BF%, Visceral Fat,</div>
          <div className="text-primary-color text-xs">Inflammation, Sleep</div>
        </div>
      </div>

      {/* Latest stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Weight" value={latest?.weight} unit=" lbs" target={TARGETS.weight} color={latest?.weight > 185 ? 'text-amber-400' : 'text-primary-color'} />
        <StatCard label="Body Fat" value={latest?.bodyFat} unit="%" target={TARGETS.bodyFat} color={latest?.bodyFat > 22 ? 'text-amber-400' : 'text-accent'} />
        <StatCard label="Visceral Fat" value={latest?.visceralFat} unit="" target={TARGETS.visceralFat} color={latest?.visceralFat > 11 ? 'text-red-400' : 'text-amber-400'} />
        <StatCard label="Waist" value={latest?.waist} unit='"' target={null} />
      </div>

      {/* Weight chart */}
      <div className="glass p-4 space-y-3">
        <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Weight Trend</h3>
        <SVGChart data={weightData.slice(-20)} color="#10b981" label="Weight (lbs)" unit=" lbs" />
      </div>

      {/* BF chart */}
      <div className="glass p-4 space-y-3">
        <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Body Fat Trend</h3>
        <SVGChart data={bfData.slice(-20)} color="#3b82f6" label="Body Fat (%)" unit="%" />
      </div>

      {/* Projection */}
      {projection && (
        <div className="glass p-4 space-y-3">
          <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">16-Week Projection</h3>
          <div className="text-muted-color text-xs">Rate: {projection.weeklyRate > 0 ? '+' : ''}{projection.weeklyRate} lbs/week</div>
          <div className="grid grid-cols-3 gap-2">
            {projection.projections.map((p) => (
              <div key={p.weeks} className="glass-elevated rounded-xl p-3 text-center">
                <div className="text-muted-color text-[10px] mb-1">Week {p.weeks}</div>
                <div className="font-heading text-base font-bold text-primary-color">{p.weight} lbs</div>
                <div className="text-blue-400 text-xs">{p.bodyFat}% BF</div>
                <div className="text-muted-color text-[10px] mt-0.5">{p.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 16-week targets */}
      <div className="glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-accent" />
          <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">16-Week Targets</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: 'Weight', target: '175 lbs', current: latest?.weight ? `${latest.weight} lbs` : '—' },
            { label: 'Body Fat', target: '15%', current: latest?.bodyFat ? `${latest.bodyFat}%` : '—' },
            { label: 'Visceral Fat', target: '<9', current: latest?.visceralFat ?? '—' },
            { label: 'Bio Age', target: '<30', current: bioAge },
          ].map(({ label, target, current }) => (
            <div key={label} className="glass-elevated rounded-xl p-3">
              <div className="text-muted-color text-xs">{label}</div>
              <div className="text-primary-color font-medium mt-0.5">{current}</div>
              <div className="text-accent text-xs mt-0.5">→ {target}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI analysis */}
      <div className="glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">AI Root Cause</h3>
          <button onClick={loadInsight} disabled={loading} className="flex items-center gap-1.5 text-accent text-xs font-medium">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {insight ? (
          <p className="text-primary-color text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-muted-color text-sm italic">Tap Analyze for body composition insights.</p>
        )}
      </div>

      {/* Check-in modal */}
      <Modal open={showCheckin} onClose={() => setShowCheckin(false)} title="Body Check-in">
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-slate-400 text-xs">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          {[
            { key: 'weight', label: 'Weight (lbs)', placeholder: '192' },
            { key: 'bodyFat', label: 'Body Fat %', placeholder: '23.7' },
            { key: 'visceralFat', label: 'Visceral Fat', placeholder: '11' },
            { key: 'waist', label: 'Waist (inches)', placeholder: '34' },
            { key: 'neck', label: 'Neck (inches)', placeholder: '16' },
            { key: 'muscleMass', label: 'Muscle Mass (lbs)', placeholder: '146' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <label className="text-slate-400 text-xs">{label}</label>
              <input
                type="number"
                step="0.1"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          ))}
          <button onClick={submit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-heading font-semibold text-sm mt-2">
            Save Check-in
          </button>
        </div>
      </Modal>
    </div>
  )
}
