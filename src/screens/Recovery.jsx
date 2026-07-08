import { useState } from 'react'
import { Activity, CheckCircle2, Circle, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { SUPPLEMENTS, TIMING_LABELS } from '../data/supplements'
import { showToast } from '../utils/toast'
import { getAIInsight } from '../ai/claude'
import { buildDailyCoachingSummary } from '../utils/fitnessCoach'

const SLEEP_OPTIONS = [5, 6, 7, 8, 9]
const TONE_CLASSES = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  red: 'border-red-500/30 bg-red-500/10 text-red-300',
  slate: 'border-slate-700 bg-slate-800/70 text-slate-300',
}

function RecoveryHabitList({ state, today, saveInflam, addCustomItem, removeCustomItem }) {
  const todayData = state.inflam[today] ?? {}
  const [habitForm, setHabitForm] = useState({ label: '', desc: '' })
  const habits = [
    { key: 'zone2', label: 'Zone 2 Cardio', desc: '25+ min low intensity' },
    { key: 'salmon', label: 'Protein + omega-3 meal', desc: 'Salmon, lean protein, or similar whole-food anchor' },
    { key: 'cold', label: 'Cold contrast', desc: 'Optional recovery exposure if it helps you feel better' },
    { key: 'breathing', label: 'Breathing downshift', desc: '5 min slow nasal breathing or box breathing' },
    ...(state.customItems?.inflammationHabits ?? []).map((item) => ({ ...item, key: item.id })),
  ]

  function toggle(field, label) {
    const newVal = !todayData[field]
    saveInflam(today, { [field]: newVal })
    showToast(`${label} ${newVal ? 'saved' : 'removed'}`)
  }

  function addHabit() {
    if (!habitForm.label.trim()) {
      showToast('Enter a habit name', 'warn')
      return
    }

    addCustomItem('inflammationHabits', {
      label: habitForm.label.trim(),
      desc: habitForm.desc.trim() || 'Custom recovery habit',
      custom: true,
    })
    setHabitForm({ label: '', desc: '' })
    showToast('Recovery habit added')
  }

  return (
    <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
      <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Recovery Levers</h3>
      <div className="space-y-2">
        {habits.map(({ key, label, desc, custom }) => {
          const active = Boolean(todayData[key])
          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                active ? 'border-emerald-500/30 bg-emerald-500/15' : 'border-transparent bg-slate-700/50'
              }`}
            >
              <button onClick={() => toggle(key, label)} className="shrink-0">
                {active ? <CheckCircle2 size={20} className="text-emerald-300" /> : <Circle size={20} className="text-slate-500" />}
              </button>
              <button onClick={() => toggle(key, label)} className="min-w-0 flex-1 text-left">
                <div className={`text-sm font-medium ${active ? 'text-emerald-200' : 'text-white'}`}>{label}</div>
                <div className="text-xs leading-relaxed text-slate-500">{desc}</div>
              </button>
              {custom && (
                <button onClick={() => { removeCustomItem('inflammationHabits', key); showToast('Habit deleted') }} className="text-red-300">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="space-y-2 border-t border-slate-700 pt-3">
        <div className="flex items-center gap-2 text-[10px] font-heading uppercase tracking-widest text-slate-500">
          <Plus size={13} />
          Add habit
        </div>
        <input value={habitForm.label} onChange={(e) => setHabitForm({ ...habitForm, label: e.target.value })}
          placeholder="Habit name" className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none" />
        <input value={habitForm.desc} onChange={(e) => setHabitForm({ ...habitForm, desc: e.target.value })}
          placeholder="Why it matters" className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none" />
        <button onClick={addHabit} className="w-full rounded-xl bg-slate-700 py-2 text-xs font-heading font-semibold text-white hover:bg-slate-600">
          Add Recovery Habit
        </button>
      </div>
    </section>
  )
}

function SleepSelector({ todayData, saveInflam, today }) {
  return (
    <section className="rounded-2xl bg-slate-800 p-4">
      <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Sleep</h3>
      <div className="grid grid-cols-5 gap-2">
        {SLEEP_OPTIONS.map((hours) => (
          <button
            key={hours}
            onClick={() => { saveInflam(today, { sleep: hours }); showToast(`Sleep: ${hours}h saved`) }}
            className={`rounded-xl py-2 text-sm font-bold font-heading transition-colors ${
              todayData.sleep === hours ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {hours}h
          </button>
        ))}
      </div>
    </section>
  )
}

function SupplementChecklist({ state, today, toggleSupp, addCustomItem, removeCustomItem }) {
  const checks = state.suppChecks[today] ?? {}
  const [suppForm, setSuppForm] = useState({ name: '', dose: '', timing: 'morning', note: '' })
  const allSupplements = [...SUPPLEMENTS, ...(state.customItems?.supplements ?? [])]
  const total = allSupplements.length
  const taken = allSupplements.filter((supplement) => checks[supplement.id]).length
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0

  function addSupplement() {
    if (!suppForm.name.trim()) {
      showToast('Enter a supplement name', 'warn')
      return
    }

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

  return (
    <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Supplement Routine</h3>
          <p className="mt-1 text-xs text-slate-500">Checklist only. This app does not validate supplement safety.</p>
        </div>
        <div className="text-right">
          <div className="font-heading text-2xl font-bold text-white">{pct}%</div>
          <div className="text-[10px] text-slate-500">{taken}/{total}</div>
        </div>
      </div>

      {Object.entries(TIMING_LABELS).map(([timing, label]) => {
        const supplements = allSupplements.filter((supplement) => supplement.timing === timing)
        if (supplements.length === 0) return null
        return (
          <div key={timing} className="space-y-2">
            <div className="text-[10px] font-heading uppercase tracking-widest text-slate-500">{label}</div>
            {supplements.map((supplement) => {
              const done = checks[supplement.id]
              return (
                <div key={supplement.id} className={`flex items-center gap-3 rounded-xl p-3 ${done ? 'bg-emerald-500/10' : 'bg-slate-700/50'}`}>
                  <button onClick={() => { toggleSupp(today, supplement.id); showToast(done ? `${supplement.name} unchecked` : `${supplement.name} taken`) }}>
                    {done ? <CheckCircle2 size={19} className="text-emerald-300" /> : <Circle size={19} className="text-slate-500" />}
                  </button>
                  <button onClick={() => { toggleSupp(today, supplement.id); showToast(done ? `${supplement.name} unchecked` : `${supplement.name} taken`) }} className="min-w-0 flex-1 text-left">
                    <div className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-white'}`}>{supplement.name}</div>
                    <div className="text-xs text-slate-500">{supplement.dose} · {supplement.note}</div>
                  </button>
                  {supplement.custom && (
                    <button onClick={() => { removeCustomItem('supplements', supplement.id); showToast('Supplement deleted') }} className="text-red-300">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="space-y-2 border-t border-slate-700 pt-3">
        <input value={suppForm.name} onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
          placeholder="Supplement name" className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <input value={suppForm.dose} onChange={(e) => setSuppForm({ ...suppForm, dose: e.target.value })}
            placeholder="Dose" className="rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none" />
          <select value={suppForm.timing} onChange={(e) => setSuppForm({ ...suppForm, timing: e.target.value })}
            className="rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none">
            {Object.entries(TIMING_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <input value={suppForm.note} onChange={(e) => setSuppForm({ ...suppForm, note: e.target.value })}
          placeholder="Note" className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none" />
        <button onClick={addSupplement} className="w-full rounded-xl bg-slate-700 py-2 text-xs font-heading font-semibold text-white hover:bg-slate-600">
          Add Supplement
        </button>
      </div>
    </section>
  )
}

export function Recovery({ state, saveInflam, toggleSupp, today, addCustomItem, removeCustomItem, user }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const todayData = state.inflam[today] ?? {}
  const summary = buildDailyCoachingSummary(state, today, user?.plan_preferences)
  const recovery = summary.teamGuidance.recovery

  async function loadInsight() {
    setLoading(true)
    try {
      const text = await getAIInsight(
        `Give me a practical recovery adjustment for today. Use cautious language: no diagnosis, no medical certainty. Consider my workout queue, stiffness, sleep, recent training, and nutrition. Return 3 short sentences with one action to take now.`,
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

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <header>
        <h1 className="font-heading text-2xl font-bold text-white tracking-wide">Recovery</h1>
        <p className="mt-1 text-xs text-slate-500">Decide whether to push, maintain, modify, or rest.</p>
      </header>

      <section className={`rounded-2xl border p-5 ${TONE_CLASSES[recovery.tone]}`}>
        <div className="flex items-start gap-3">
          <Activity size={22} className="mt-1 shrink-0" />
          <div>
            <div className="font-heading text-xs font-semibold uppercase tracking-widest">Today’s recovery call</div>
            <h2 className="mt-1 font-heading text-3xl font-bold leading-none text-white">{recovery.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{recovery.text}</p>
          </div>
        </div>
      </section>

      <SleepSelector todayData={todayData} saveInflam={saveInflam} today={today} />
      <RecoveryHabitList state={state} today={today} saveInflam={saveInflam} addCustomItem={addCustomItem} removeCustomItem={removeCustomItem} />

      <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Coach Check</h3>
          <button onClick={loadInsight} disabled={loading} className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Checking...' : 'Check'}
          </button>
        </div>
        {insight ? (
          <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-slate-500 text-sm italic">Use this when the day feels unclear. It sends a summarized fitness context to the configured AI function.</p>
        )}
      </section>

      <SupplementChecklist state={state} today={today} toggleSupp={toggleSupp} addCustomItem={addCustomItem} removeCustomItem={removeCustomItem} />
    </div>
  )
}
