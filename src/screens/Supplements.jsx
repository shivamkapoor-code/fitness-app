import { useState } from 'react'
import { CheckCircle2, Circle, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import { SUPPLEMENTS, TIMING_LABELS } from '../data/supplements'
import { showToast } from '../utils/toast'
import { getAIInsight } from '../ai/claude'

export function Supplements({ state, toggleSupp, today, addCustomItem, removeCustomItem }) {
  const checks = state.suppChecks[today] ?? {}
  const [suppForm, setSuppForm] = useState({ name: '', dose: '', timing: 'morning', note: '' })
  const allSupplements = [...SUPPLEMENTS, ...(state.customItems?.supplements ?? [])]
  const total = allSupplements.length
  const taken = allSupplements.filter((s) => checks[s.id]).length
  const pct = Math.round((taken / total) * 100)

  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadInsight() {
    setLoading(true)
    try {
      const text = await getAIInsight(
        `Based on my supplement stack and current data, give me a brief (3-4 sentence) insight about timing optimization or any synergies/conflicts I should know about today. Be specific to my inflammation and training day.`,
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

  function addSupplement() {
    if (!suppForm.name.trim()) { showToast('Enter a supplement name', 'warn'); return }
    addCustomItem('supplements', {
      name: suppForm.name.trim(),
      dose: suppForm.dose.trim() || 'Custom dose',
      timing: suppForm.timing,
      note: suppForm.note.trim() || 'Custom supplement',
      custom: true,
    })
    setSuppForm({ name: '', dose: '', timing: 'morning', note: '' })
    showToast('Supplement added')
  }

  const byTiming = TIMING_LABELS
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <h1 className="font-heading text-2xl font-bold text-white tracking-wide">Supplements</h1>

      {/* Progress ring */}
      <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-4">
        <svg width={96} height={96} className="-rotate-90">
          <circle cx={48} cy={48} r={r} stroke="#1e293b" strokeWidth={12} fill="none" />
          <circle
            cx={48} cy={48} r={r}
            stroke="#10b981" strokeWidth={12} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s' }}
          />
        </svg>
        <div>
          <div className="font-heading text-4xl font-bold text-white">{pct}%</div>
          <div className="text-slate-400 text-sm">{taken} of {total} taken today</div>
          {pct === 100 && <div className="text-emerald-400 text-xs mt-1">All done! Great consistency.</div>}
        </div>
      </div>

      {/* Grouped by timing */}
      {Object.entries(byTiming).map(([timing, label]) => {
        const supps = allSupplements.filter((s) => s.timing === timing)
        if (supps.length === 0) return null
        return (
          <div key={timing} className="bg-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">{label}</h3>
            {supps.map((s) => {
              const done = checks[s.id]
              return (
                <div
                  key={s.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${done ? 'bg-emerald-500/10' : 'bg-slate-700/50 hover:bg-slate-700'}`}
                >
                  <button onClick={() => { toggleSupp(today, s.id); showToast(done ? `${s.name} unchecked` : `${s.name} taken!`) }}>
                    {done ? <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" /> : <Circle size={20} className="text-slate-500 flex-shrink-0" />}
                  </button>
                  <button onClick={() => { toggleSupp(today, s.id); showToast(done ? `${s.name} unchecked` : `${s.name} taken!`) }} className="flex-1 text-left">
                    <div className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-white'}`}>{s.name}</div>
                    <div className="text-xs text-slate-500">{s.dose} · {s.note}</div>
                  </button>
                  {s.custom && (
                    <button onClick={() => { removeCustomItem('supplements', s.id); showToast('Supplement deleted') }} className="text-red-300">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Add Supplement</h3>
        <input value={suppForm.name} onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
          placeholder="Supplement name" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
        <input value={suppForm.dose} onChange={(e) => setSuppForm({ ...suppForm, dose: e.target.value })}
          placeholder="Dose" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
        <select value={suppForm.timing} onChange={(e) => setSuppForm({ ...suppForm, timing: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500">
          {Object.entries(TIMING_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input value={suppForm.note} onChange={(e) => setSuppForm({ ...suppForm, note: e.target.value })}
          placeholder="Note" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
        <button onClick={addSupplement} className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2 text-xs font-heading font-semibold">
          Add Supplement
        </button>
      </div>

      {/* AI insight */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">AI Timing Insight</h3>
          <button onClick={loadInsight} disabled={loading} className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {insight ? (
          <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-slate-500 text-sm italic">Tap Analyze for supplement timing insights.</p>
        )}
      </div>
    </div>
  )
}
