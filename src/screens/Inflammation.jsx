import { useState } from 'react'
import { RefreshCw, Loader2, Flame, Trash2 } from 'lucide-react'
import { calcInflamScore } from '../utils/bioAge'
import { showToast } from '../utils/toast'
import { getAIInsight } from '../ai/claude'

const SCORE_COLORS = ['text-emerald-400', 'text-emerald-400', 'text-amber-400', 'text-amber-400', 'text-red-400', 'text-red-400']
const SCORE_BG = ['bg-emerald-500/20', 'bg-emerald-500/20', 'bg-amber-500/20', 'bg-amber-500/20', 'bg-red-500/20', 'bg-red-500/20']
const SCORE_LABELS = ['Excellent', 'Good', 'Moderate', 'Elevated', 'High', 'Critical']
const SLEEP_OPTIONS = [5, 6, 7, 8, 9]

export function Inflammation({ state, saveInflam, today, addCustomItem, removeCustomItem }) {
  const todayData = state.inflam[today] ?? {}
  const score = calcInflamScore(todayData)
  const scoreInt = Math.round(score)

  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [habitForm, setHabitForm] = useState({ label: '', desc: '', icon: '+' })

  function toggle(field, labelOverride = null) {
    const newVal = !todayData[field]
    saveInflam(today, { [field]: newVal })
    showToast(`${labelOverride ?? (field === 'zone2' ? 'Zone 2' : field === 'salmon' ? 'Wild Salmon' : field === 'cold' ? 'Cold Contrast' : 'Box Breathing')} ${newVal ? 'saved' : 'removed'}`)
  }

  function setSleep(h) {
    saveInflam(today, { sleep: h })
    showToast(`Sleep: ${h}h saved`)
  }

  // Last 7 days scores
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const s = calcInflamScore(state.inflam[dateStr])
    last7.push({ date: dateStr, score: s, label: d.toLocaleDateString('en', { weekday: 'short' }) })
  }

  const last30 = Object.keys(state.inflam).sort().slice(-30)
  const avg30 = last30.length > 0
    ? last30.reduce((a, d) => a + calcInflamScore(state.inflam[d]), 0) / last30.length
    : null

  async function loadInsight() {
    setLoading(true)
    try {
      const text = await getAIInsight(
        `Analyze my inflammation patterns. My current score is ${score.toFixed(1)}/5. Give me 3-4 sentences identifying the root cause of my inflammation and the single most impactful action I can take this week. Be specific to my L5-S1 condition and training load.`,
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

  const habits = [
    { key: 'zone2', label: 'Zone 2 Cardio', desc: '25+ min low intensity', icon: '🏃' },
    { key: 'salmon', label: 'Wild Salmon', desc: 'Anti-inflammatory omega-3', icon: '🐟' },
    { key: 'cold', label: 'Cold Contrast', desc: 'Cold shower / contrast therapy', icon: '🧊' },
    { key: 'breathing', label: 'Box Breathing', desc: '5 min 4/4/4/4 pattern', icon: '🫁' },
    ...(state.customItems?.inflammationHabits ?? []).map((item) => ({ ...item, key: item.id })),
  ]

  function addHabit() {
    if (!habitForm.label.trim()) { showToast('Enter a habit name', 'warn'); return }
    addCustomItem('inflammationHabits', {
      label: habitForm.label.trim(),
      desc: habitForm.desc.trim() || 'Custom recovery habit',
      icon: habitForm.icon.trim() || '+',
      custom: true,
    })
    setHabitForm({ label: '', desc: '', icon: '+' })
    showToast('Inflammation habit added')
  }

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <h1 className="font-heading text-2xl font-bold text-white tracking-wide">Inflammation</h1>

      {/* Score card */}
      <div className={`rounded-2xl p-5 ${SCORE_BG[scoreInt]}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-heading text-5xl font-bold ${SCORE_COLORS[scoreInt]}`}>{score.toFixed(1)}</div>
            <div className={`font-heading text-lg font-semibold ${SCORE_COLORS[scoreInt]}`}>{SCORE_LABELS[scoreInt]}</div>
            <div className="text-slate-400 text-xs mt-1">Today's inflammation score (0-5)</div>
          </div>
          <Flame size={48} className={`${SCORE_COLORS[scoreInt]} opacity-40`} />
        </div>
        {avg30 !== null && (
          <div className="mt-3 text-sm text-slate-400">30-day avg: <span className="text-white font-medium">{avg30.toFixed(1)}</span></div>
        )}
      </div>

      {/* Habit toggles */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Today's Habits</h3>
        {habits.map(({ key, label, desc, icon, custom }) => {
          const active = !!todayData[key]
          return (
            <div
              key={key}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'}`}
            >
              <button onClick={() => toggle(key, label)} className="text-xl">{icon}</button>
              <button onClick={() => toggle(key, label)} className="flex-1 text-left">
                <div className={`text-sm font-medium ${active ? 'text-emerald-300' : 'text-white'}`}>{label}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </button>
              <button onClick={() => toggle(key, label)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                {active && <div className="w-2 h-2 bg-white rounded-full" />}
              </button>
              {custom && (
                <button onClick={() => { removeCustomItem('inflammationHabits', key); showToast('Habit deleted') }} className="text-red-300">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
        <div className="pt-2 space-y-2 border-t border-slate-700">
          <input value={habitForm.label} onChange={(e) => setHabitForm({ ...habitForm, label: e.target.value })}
            placeholder="New habit" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
          <input value={habitForm.desc} onChange={(e) => setHabitForm({ ...habitForm, desc: e.target.value })}
            placeholder="Description" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
          <input value={habitForm.icon} onChange={(e) => setHabitForm({ ...habitForm, icon: e.target.value })}
            placeholder="Icon" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
          <button onClick={addHabit} className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2 text-xs font-heading font-semibold">
            Add Habit
          </button>
        </div>
      </div>

      {/* Sleep selector */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Sleep Hours</h3>
        <div className="flex gap-2">
          {SLEEP_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => setSleep(h)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold font-heading transition-colors ${todayData.sleep === h ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Weekly streak */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Weekly Streak</h3>
        <div className="flex gap-1.5">
          {last7.map(({ label, score: s, date }) => {
            const si = Math.round(s)
            const dotColor = si <= 1 ? 'bg-emerald-500' : si <= 3 ? 'bg-amber-500' : 'bg-red-500'
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full ${dotColor} flex items-center justify-center`}>
                  <span className="text-white text-[10px] font-bold">{s.toFixed(1)}</span>
                </div>
                <span className="text-slate-500 text-[9px]">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI analysis */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">AI Root Cause</h3>
          <button onClick={loadInsight} disabled={loading} className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {insight ? (
          <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-slate-500 text-sm italic">Tap Analyze for personalized inflammation insights.</p>
        )}
      </div>
    </div>
  )
}
