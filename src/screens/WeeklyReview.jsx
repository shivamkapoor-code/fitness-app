import { useState } from 'react'
import { RefreshCw, Loader2, BarChart3 } from 'lucide-react'
import { calcInflamScore } from '../utils/bioAge'
import { showToast } from '../utils/toast'
import { getAIInsight } from '../ai/claude'
import { WORKOUT_SPLIT } from '../data/workouts'

export function WeeklyReview({ state, today }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  // Calculate last 7 days stats
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7.push(d.toISOString().slice(0, 10))
  }

  const workoutDays = last7.filter((d) => Object.keys(state.workoutLog[d] ?? {}).length > 0).length

  const totalSets = last7.reduce((acc, d) => {
    const day = state.workoutLog[d] ?? {}
    return acc + Object.values(day).reduce((a, sets) => a + (sets?.length ?? 0), 0)
  }, 0)

  const proteinValues = last7.map((d) => state.nutrition[d]?.totals?.protein).filter(Boolean)
  const avgProtein = proteinValues.length > 0 ? Math.round(proteinValues.reduce((a, b) => a + b, 0) / proteinValues.length) : 0

  const calorieValues = last7.map((d) => state.nutrition[d]?.totals?.kcal).filter(Boolean)
  const avgCalories = calorieValues.length > 0 ? Math.round(calorieValues.reduce((a, b) => a + b, 0) / calorieValues.length) : 0

  const zone2Days = last7.filter((d) => state.inflam[d]?.zone2).length

  const sleepValues = last7.map((d) => state.inflam[d]?.sleep).filter(Boolean)
  const avgSleep = sleepValues.length > 0 ? (sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1) : '—'

  const inflam7 = last7.map((d) => calcInflamScore(state.inflam[d]))
  const avgInflam = (inflam7.reduce((a, b) => a + b, 0) / 7).toFixed(1)

  const totalSupps = 12
  const suppDays = last7.filter((d) => {
    const checks = state.suppChecks[d] ?? {}
    return Object.values(checks).filter(Boolean).length >= totalSupps * 0.8
  }).length

  const weights = last7.map((d) => state.bodyMetrics.find((m) => m.date === d)?.weight).filter(Boolean)
  const weightChange = weights.length >= 2 ? `${(weights[weights.length - 1] - weights[0] > 0 ? '+' : '')}${(weights[weights.length - 1] - weights[0]).toFixed(1)} lbs` : '—'

  const stats = [
    { label: 'Workout Days', value: `${workoutDays}/7`, good: workoutDays >= 5 },
    { label: 'Total Sets', value: totalSets, good: totalSets >= 80 },
    { label: 'Avg Protein', value: `${avgProtein}g`, good: avgProtein >= 175 },
    { label: 'Avg Calories', value: `${avgCalories} kcal`, good: avgCalories >= 2000 && avgCalories <= 2400 },
    { label: 'Zone 2 Sessions', value: `${zone2Days}/7`, good: zone2Days >= 4 },
    { label: 'Avg Sleep', value: `${avgSleep}h`, good: parseFloat(avgSleep) >= 7.5 },
    { label: 'Avg Inflammation', value: avgInflam, good: parseFloat(avgInflam) <= 2.5 },
    { label: 'Supps 80%+ Days', value: `${suppDays}/7`, good: suppDays >= 5 },
    { label: 'Weight Change', value: weightChange, good: null },
  ]

  async function generateAnalysis() {
    if (!state.apiKey) { showToast('Add API key in Settings', 'warn'); return }
    setLoading(true)
    try {
      const statsText = stats.map((s) => `${s.label}: ${s.value}`).join(', ')
      const text = await getAIInsight(
        state.apiKey,
        `Here are my stats for the past 7 days: ${statsText}.

Please provide a comprehensive weekly review with:
1. What worked well (2-3 specific wins)
2. Key gaps and why they matter for my goals
3. Root cause analysis of any issues
4. ONE specific focus area for next week

Be direct and specific to my L5-S1 condition, body composition goals, and training program.`,
        state,
        today
      )
      setAnalysis(text)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <h1 className="font-heading text-2xl font-bold text-white tracking-wide">Weekly Review</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, good }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-3">
            <div className={`font-heading text-lg font-bold ${good === null ? 'text-white' : good ? 'text-emerald-400' : 'text-amber-400'}`}>
              {value}
            </div>
            <div className="text-slate-500 text-[10px] mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* AI analysis */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-400" />
            <h3 className="font-heading text-sm font-semibold text-white uppercase tracking-widest">AI Weekly Analysis</h3>
          </div>
          <button onClick={generateAnalysis} disabled={loading} className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {analysis ? (
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{analysis}</p>
        ) : (
          <p className="text-slate-500 text-sm italic">Tap Generate for your personalized weekly analysis from your AI coach.</p>
        )}
      </div>
    </div>
  )
}
