import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Dumbbell, Target, TrendingUp, Utensils } from 'lucide-react'
import { showToast } from '../utils/toast'
import { buildDailyCoachingSummary } from '../utils/fitnessCoach'

const STIFFNESS_LABELS = ['', 'Minimal', 'Mild', 'Moderate', 'Significant', 'Severe']
const TONE_CLASSES = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  red: 'border-red-500/30 bg-red-500/10 text-red-300',
  slate: 'border-slate-700 bg-slate-800/70 text-slate-300',
}

function ProgressBar({ value, max, color = 'bg-emerald-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-900/80">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function PrimaryRecommendation({ summary, onNavigate }) {
  const { primary, activeWorkout, session, workoutState } = summary
  const isDone = workoutState.isCompletedToday

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-slate-900 p-5 shadow-2xl shadow-emerald-950/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-heading uppercase tracking-widest text-emerald-300">
            {isDone ? <CheckCircle2 size={14} /> : <Target size={14} />}
            Today’s decision
          </div>
          <h2 className="font-heading text-3xl font-bold leading-none text-white">{primary.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{primary.reason}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-right">
          <div className="font-heading text-sm font-bold text-white">{activeWorkout.shortName}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">{activeWorkout.duration}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Session progress</span>
          <span className="font-heading font-semibold text-white">{session.percentComplete}%</span>
        </div>
        <ProgressBar value={session.loggedExercises} max={session.plannedExerciseCount || 1} />
      </div>

      <button
        onClick={() => onNavigate(primary.ctaRoute)}
        className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm"
      >
        {primary.cta}
        <ChevronRight size={16} />
      </button>
    </section>
  )
}

function TeamGuidance({ guidance }) {
  const items = [
    { key: 'training', label: 'Training', icon: <Dumbbell size={16} /> },
    { key: 'nutrition', label: 'Meals', icon: <Utensils size={16} /> },
    { key: 'recovery', label: 'Recovery', icon: <Activity size={16} /> },
    { key: 'progress', label: 'Progress', icon: <TrendingUp size={16} /> },
  ]

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-heading text-sm font-semibold uppercase tracking-widest text-slate-400">Fitness Team Guidance</h3>
        <p className="mt-1 text-xs text-slate-500">One useful cue from each coach, based on today’s data.</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {items.map(({ key, label, icon }) => {
          const item = guidance[key]
          return (
            <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl border p-2 ${TONE_CLASSES[item.tone] ?? TONE_CLASSES.slate}`}>
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-heading text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
                    <div className="text-xs font-medium text-slate-300">{item.title}</div>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.text}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StiffnessCheck({ stiffness, today, setStiffness, summary }) {
  return (
    <section className="glass p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Readiness Check</h3>
          <p className="mt-1 text-xs text-slate-500">This adjusts intensity. It is not a medical score.</p>
        </div>
        <span className={`rounded-lg border px-2.5 py-1 text-xs font-heading font-semibold ${TONE_CLASSES[summary.teamGuidance.recovery.tone]}`}>
          {summary.recoveryLoadLabel}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => {
              setStiffness(today, value)
              showToast(`Stiffness: ${value}/5 - ${STIFFNESS_LABELS[value]}`)
            }}
            className={`h-11 rounded-xl font-heading text-sm font-bold transition-colors ${
              stiffness === value
                ? value <= 2 ? 'bg-emerald-500 text-white' : value === 3 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      {stiffness >= 4 && (
        <div className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">Modify today: extend warm-up, avoid loaded spinal flexion, and stop on burning or tingling symptoms.</p>
        </div>
      )}
    </section>
  )
}

function WeeklyPulse({ summary, onNavigate }) {
  const { consistency, protein, averages } = summary
  return (
    <section className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Weekly Pulse</h3>
        <button onClick={() => onNavigate('body')} className="text-xs font-medium text-accent">Progress</button>
      </div>
      <ProgressBar value={consistency.workoutDays} max={consistency.targetDays} color={consistency.isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'} />
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-800/70 p-3 text-center">
          <div className="font-heading text-lg font-bold text-white">{consistency.workoutDays}/{consistency.targetDays}</div>
          <div className="text-[10px] text-slate-500">workouts</div>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3 text-center">
          <div className={`font-heading text-lg font-bold ${protein.isOnTrack ? 'text-emerald-300' : 'text-amber-300'}`}>{protein.protein}g</div>
          <div className="text-[10px] text-slate-500">protein today</div>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3 text-center">
          <div className="font-heading text-lg font-bold text-white">{summary.recoveryLoadLabel}</div>
          <div className="text-[10px] text-slate-500">recovery load</div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Seven-day averages: {averages.avgProtein || '—'}g protein, {averages.avgCalories || '—'} kcal, {averages.avgSleep ? `${averages.avgSleep.toFixed(1)}h sleep` : 'sleep not logged'}.
      </p>
    </section>
  )
}

function PlanBasis({ preferences, workout }) {
  const chips = [
    preferences.goal,
    preferences.level,
    preferences.equipment,
    `${preferences.weekly_training_days} days/week`,
    `${preferences.session_minutes} min target`,
  ]

  return (
    <section className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target size={15} className="text-accent" />
        <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Why This Plan</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span key={chip} className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[11px] text-slate-300">
            {chip}
          </span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        Today’s recommendation uses the current workout queue, plan preferences, logged sets, protein progress, and recovery check-ins. The app stays conservative when signals are missing.
        {workout.cardio?.type === 'mandatory' ? ` Zone 2 is included because this ${workout.shortName} day supports conditioning and recovery, not extra punishment.` : ''}
      </p>
    </section>
  )
}

export function Dashboard({ state, setStiffness, today, onNavigate, user }) {
  const summary = buildDailyCoachingSummary(state, today, user?.plan_preferences)
  const stiffness = state.morningStiffness[today] ?? null

  return (
    <div className="px-4 py-4 pb-20 space-y-5">
      <header className="pr-28">
        <h1 className="font-heading text-2xl font-bold tracking-wide text-primary-color">Home</h1>
        <p className="text-xs text-muted-color">
          {new Date(`${today}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {user?.display_name ? ` · ${user.display_name}` : ''}
        </p>
      </header>

      <PrimaryRecommendation summary={summary} onNavigate={onNavigate} />
      <TeamGuidance guidance={summary.teamGuidance} />
      <StiffnessCheck stiffness={stiffness} today={today} setStiffness={setStiffness} summary={summary} />
      <WeeklyPulse summary={summary} onNavigate={onNavigate} />
      <PlanBasis preferences={summary.preferences} workout={summary.workoutState.queuedWorkout} />
    </div>
  )
}
