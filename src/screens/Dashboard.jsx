import { useState } from 'react'
import { RefreshCw, Loader2, AlertTriangle, ChevronRight, Zap } from 'lucide-react'
import { MacroRings } from '../components/MacroRings'
import { calcInflamScore, calcBioAge } from '../utils/bioAge'
import { calcCalorieReview } from '../utils/calorieReview'
import { calcBodyProjection } from '../utils/projection'
import { getAIInsight } from '../ai/claude'
import { showToast } from '../utils/toast'
import { WORKOUT_SPLIT } from '../data/workouts'
import { SUPPLEMENTS } from '../data/supplements'

const STIFFNESS_LABELS = ['', 'Minimal', 'Mild', 'Moderate', 'Significant', 'Severe']
const STIFFNESS_COLORS = ['', 'text-emerald-400', 'text-emerald-400', 'text-amber-400', 'text-red-400', 'text-red-500']

export function Dashboard({ state, setStiffness, today, onNavigate }) {
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)

  const todayNutrition = state.nutrition[today]?.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const stiffness = state.morningStiffness[today] ?? null

  // Today's workout
  const queue = state.workoutQueue
  const todayWorkoutIdx = queue.seq[queue.idx]
  const todayWorkout = WORKOUT_SPLIT[todayWorkoutIdx]

  // Inflammation score
  const todayInflam = calcInflamScore(state.inflam[today])
  const inflamScoreInt = Math.round(todayInflam)
  const inflam7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    inflam7.push(calcInflamScore(state.inflam[dateStr]))
  }

  // Supplement progress
  const checks = state.suppChecks[today] ?? {}
  const suppTaken = SUPPLEMENTS.filter((s) => checks[s.id]).length
  const suppTotal = SUPPLEMENTS.length
  const suppPct = Math.round((suppTaken / suppTotal) * 100)

  // Calorie review
  const calorieAlert = calcCalorieReview(state.bodyMetrics)

  // Projection
  const projection = calcBodyProjection(state.bodyMetrics)

  // Bio age
  const bioAge = calcBioAge(state.bodyMetrics, state.inflam)

  // Remaining macros
  const { kcal: tKcal, protein: tPro, carbs: tCarbs, fat: tFat } = { kcal: 2200, protein: 185, carbs: 220, fat: 62 }
  const remKcal = tKcal - (todayNutrition.kcal ?? 0)
  const remPro = tPro - (todayNutrition.protein ?? 0)
  const remCarbs = tCarbs - (todayNutrition.carbs ?? 0)
  const remFat = tFat - (todayNutrition.fat ?? 0)

  async function loadInsight() {
    if (!state.apiKey) { showToast('Add API key in Settings', 'warn'); return }
    setLoadingInsight(true)
    try {
      const text = await getAIInsight(
        state.apiKey,
        `Give me one specific, actionable insight for today based on my current data. Focus on the single highest-leverage action I can take right now. 2-3 sentences max. Be specific and direct.`,
        state,
        today
      )
      setInsight(text)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoadingInsight(false)
    }
  }

  const inflamColor = inflam7[6] <= 2 ? 'bg-emerald-500' : inflam7[6] <= 3.5 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white tracking-wide">Dashboard</h1>
          <p className="text-slate-400 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <div className={`font-heading text-lg font-bold ${bioAge < 36 ? 'text-emerald-400' : bioAge <= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            Bio Age {bioAge}
          </div>
          <div className="text-slate-500 text-[10px]">vs actual 36</div>
        </div>
      </div>

      {/* 14-day calorie alert */}
      {calorieAlert && (
        <div className={`rounded-xl p-3 flex gap-2 items-start ${calorieAlert.type === 'STALL' ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
          <AlertTriangle size={16} className={calorieAlert.type === 'STALL' ? 'text-amber-400 flex-shrink-0 mt-0.5' : 'text-red-400 flex-shrink-0 mt-0.5'} />
          <p className="text-sm text-slate-200">{calorieAlert.message}</p>
        </div>
      )}

      {/* Today's workout card */}
      <button
        onClick={() => onNavigate('workout')}
        className="w-full bg-slate-800 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-700 transition-colors"
      >
        <div className="text-left">
          <div className="text-slate-400 text-xs uppercase tracking-widest font-heading mb-1">Today's Workout</div>
          <div className="font-heading text-xl font-bold text-white">{todayWorkout.name}</div>
          <div className="text-emerald-400 text-xs mt-1">{todayWorkout.exercises?.length ?? 0} exercises{todayWorkout.cardio?.type !== 'none' ? ` · ${todayWorkout.cardio?.desc}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-heading text-sm font-semibold">
            Start
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </div>
      </button>

      {/* Morning stiffness */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Morning Stiffness</h3>
          {stiffness !== null && (
            <span className={`font-heading text-sm font-bold ${STIFFNESS_COLORS[stiffness]}`}>
              {stiffness}/5 — {STIFFNESS_LABELS[stiffness]}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => { setStiffness(today, v); showToast(`Stiffness: ${v}/5 — ${STIFFNESS_LABELS[v]}`) }}
              className={`flex-1 py-2.5 rounded-xl font-heading text-sm font-bold transition-colors ${
                stiffness === v
                  ? v <= 2 ? 'bg-emerald-500 text-white' : v === 3 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {stiffness >= 4 && (
          <div className="flex gap-2 bg-red-500/15 border border-red-500/30 rounded-xl p-3">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-xs">High stiffness: Skip Hack Squat → use Leg Press. Skip Ab Wheel. Extend warm-up to 15 min.</p>
          </div>
        )}
      </div>

      {/* Macro rings */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Today's Macros</h3>
          <button onClick={() => onNavigate('nutrition')} className="text-emerald-400 text-xs font-medium">Add food →</button>
        </div>
        <MacroRings totals={todayNutrition} />
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { label: 'Kcal left', val: remKcal, unit: '' },
            { label: 'Protein', val: remPro, unit: 'g' },
            { label: 'Carbs', val: remCarbs, unit: 'g' },
            { label: 'Fat', val: remFat, unit: 'g' },
          ].map(({ label, val, unit }) => (
            <div key={label} className="text-center">
              <div className={`font-heading text-base font-bold ${val < 0 ? 'text-red-400' : 'text-white'}`}>{val > 0 ? val : 0}{unit}</div>
              <div className="text-slate-500 text-[9px]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inflammation score */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Inflammation</h3>
          <button onClick={() => onNavigate('inflammation')} className="text-emerald-400 text-xs font-medium">Log →</button>
        </div>
        <div className="flex items-center gap-3">
          <div className={`font-heading text-4xl font-bold ${inflam7[6] <= 2 ? 'text-emerald-400' : inflam7[6] <= 3.5 ? 'text-amber-400' : 'text-red-400'}`}>
            {todayInflam.toFixed(1)}
          </div>
          <div className="flex-1">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${inflamColor}`}
                style={{ width: `${(todayInflam / 5) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-slate-600 text-[9px] mt-1">
              <span>0</span><span>2.5</span><span>5</span>
            </div>
          </div>
        </div>
        {/* 7-day trend dots */}
        <div className="flex gap-1">
          {inflam7.map((s, i) => {
            const color = s <= 2 ? 'bg-emerald-500' : s <= 3.5 ? 'bg-amber-500' : 'bg-red-500'
            return <div key={i} className={`flex-1 h-1.5 rounded-full ${color}`} />
          })}
        </div>
        <div className="text-slate-500 text-[10px] text-center">7-day trend (older → today)</div>
      </div>

      {/* Supplement ring */}
      <button onClick={() => onNavigate('supplements')} className="w-full bg-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:bg-slate-700 transition-colors">
        <div className="relative w-14 h-14">
          <svg width={56} height={56} className="-rotate-90">
            <circle cx={28} cy={28} r={22} stroke="#1e293b" strokeWidth={8} fill="none" />
            <circle cx={28} cy={28} r={22} stroke="#10b981" strokeWidth={8} fill="none"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={2 * Math.PI * 22 * (1 - suppPct / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-heading text-xs font-bold text-white">{suppPct}%</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="font-heading text-sm font-semibold text-white">Supplements</div>
          <div className="text-slate-400 text-xs">{suppTaken} of {suppTotal} taken today</div>
        </div>
        <ChevronRight size={16} className="text-slate-500" />
      </button>

      {/* Body composition projection */}
      {projection && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Body Projection</h3>
          <div className="text-slate-400 text-xs">At current rate: {projection.weeklyRate > 0 ? '+' : ''}{projection.weeklyRate} lbs/week</div>
          <div className="grid grid-cols-3 gap-2">
            {projection.projections.map((p) => (
              <div key={p.weeks} className="bg-slate-700 rounded-xl p-3 text-center">
                <div className="font-heading text-lg font-bold text-white">{p.weight} lbs</div>
                <div className="text-emerald-400 text-xs">{p.bodyFat}% BF</div>
                <div className="text-slate-500 text-[10px] mt-0.5">{p.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI daily insight */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-400" />
            <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Daily AI Leverage</h3>
          </div>
          <button onClick={loadInsight} disabled={loadingInsight} className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            {loadingInsight ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loadingInsight ? 'Thinking...' : 'Refresh'}
          </button>
        </div>
        {insight ? (
          <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-slate-500 text-sm italic">Tap Refresh for today's highest-leverage action.</p>
        )}
      </div>

      {/* The 3 Levers */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">The 3 Levers</h3>
        {[
          { lever: 'Training', action: 'Progressive overload + protect L5-S1', color: 'bg-blue-500/20 text-blue-300' },
          { lever: 'Nutrition', action: '185g protein daily, adjust carbs first', color: 'bg-amber-500/20 text-amber-300' },
          { lever: 'Recovery', action: 'Zone 2, sleep 8h, reduce inflammation', color: 'bg-purple-500/20 text-purple-300' },
        ].map(({ lever, action, color }) => (
          <div key={lever} className={`rounded-xl px-3 py-2.5 flex items-center gap-3 ${color}`}>
            <span className="font-heading text-sm font-bold w-20 flex-shrink-0">{lever}</span>
            <span className="text-xs">{action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
