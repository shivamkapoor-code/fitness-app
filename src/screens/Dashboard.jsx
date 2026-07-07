import { AlertTriangle, CheckCircle2, ChevronRight, Dumbbell, Flame, Target, TrendingUp } from 'lucide-react'
import { showToast } from '../utils/toast'
import { buildTodayOverview } from '../utils/trainingInsights'

const STIFFNESS_LABELS = ['', 'Minimal', 'Mild', 'Moderate', 'Significant', 'Severe']
const READINESS_STYLES = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  red: 'border-red-500/30 bg-red-500/10 text-red-300',
  slate: 'border-slate-600 bg-slate-800/70 text-slate-300',
}

function ProgressBar({ value, max, color = 'bg-emerald-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
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
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target size={15} className="text-accent" />
        <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Plan Basis</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span key={chip} className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[11px] text-slate-300">
            {chip}
          </span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        Today’s recommendation uses your current queue, planned equipment, session length, stiffness check-in, and recent consistency.
        {workout.cardio?.type === 'mandatory' ? ` Zone 2 is included because this ${workout.shortName} day is written as conditioning support, not extra punishment.` : ''}
      </p>
    </div>
  )
}

function TodayHero({ overview, onNavigate }) {
  const { queuedWorkout, completedWorkout, isCompletedToday, session, readiness, activeWorkout } = overview
  const workout = isCompletedToday ? completedWorkout : queuedWorkout

  return (
    <section className={`rounded-2xl border p-4 space-y-4 ${isCompletedToday ? 'border-emerald-500/35 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/80'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-heading uppercase tracking-widest text-slate-500">
            {isCompletedToday ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Dumbbell size={14} className="text-emerald-400" />}
            {isCompletedToday ? 'Done today' : 'Today'}
          </div>
          <h2 className="font-heading text-3xl font-bold leading-none text-white">{workout.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{workout.goal}</p>
        </div>
        <span className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-heading font-semibold text-emerald-300">
          {workout.duration}
        </span>
      </div>

      {isCompletedToday ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-950/50 p-3 text-center">
            <div className="font-heading text-lg font-bold text-white">{session.totalSets}</div>
            <div className="text-[10px] text-slate-500">sets logged</div>
          </div>
          <div className="rounded-xl bg-slate-950/50 p-3 text-center">
            <div className="font-heading text-lg font-bold text-white">{session.loggedExercises}/{session.plannedExerciseCount}</div>
            <div className="text-[10px] text-slate-500">movements</div>
          </div>
          <div className="rounded-xl bg-slate-950/50 p-3 text-center">
            <div className="font-heading text-lg font-bold text-white">{overview.queuedWorkout.shortName}</div>
            <div className="text-[10px] text-slate-500">next up</div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Session progress</span>
            <span className="font-heading font-semibold text-white">{session.percentComplete}%</span>
          </div>
          <ProgressBar value={session.loggedExercises} max={session.plannedExerciseCount || 1} />
          <p className="text-xs text-slate-500">
            {session.totalSets > 0
              ? `${session.totalSets} sets logged. Keep moving through the remaining planned exercises.`
              : `${activeWorkout.exercises?.length ?? 0} main lifts${activeWorkout.core?.length ? ` + ${activeWorkout.core.length} core moves` : ''}. Readiness: ${readiness.verdict}.`}
          </p>
        </div>
      )}

      <button
        onClick={() => onNavigate(isCompletedToday ? overview.nextAction.route : 'workout')}
        className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm"
      >
        {isCompletedToday ? overview.nextAction.label : 'Start Guided Workout'}
        <ChevronRight size={16} />
      </button>
    </section>
  )
}

function StiffnessCheck({ stiffness, today, setStiffness, readiness }) {
  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Readiness</h3>
          <p className="mt-1 text-xs text-slate-500">Simple check-in, not a medical score.</p>
        </div>
        <span className={`rounded-lg border px-2.5 py-1 text-xs font-heading font-semibold ${READINESS_STYLES[readiness.tone]}`}>
          {readiness.verdict}
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
      <p className="text-xs leading-relaxed text-slate-400">{readiness.message}</p>
      {stiffness >= 4 && (
        <div className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">Modify today: extend warm-up, avoid loaded spinal flexion, and stop on burning or tingling symptoms.</p>
        </div>
      )}
    </div>
  )
}

function ConsistencyCard({ consistency }) {
  const color = consistency.isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-accent" />
          <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Consistency</h3>
        </div>
        <span className={`text-xs font-heading font-semibold ${consistency.isOnTrack ? 'text-emerald-300' : 'text-amber-300'}`}>
          {consistency.workoutDays}/{consistency.targetDays} days
        </span>
      </div>
      <ProgressBar value={consistency.workoutDays} max={consistency.targetDays} color={color} />
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-800/70 p-3">
          <div className="font-heading text-xl font-bold text-white">{consistency.streak}</div>
          <div className="text-[10px] text-slate-500">day streak</div>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3">
          <div className="font-heading text-xl font-bold text-white">{consistency.lastWorkoutDate ?? '—'}</div>
          <div className="text-[10px] text-slate-500">last workout</div>
        </div>
      </div>
    </div>
  )
}

function NextActionCard({ overview, onNavigate }) {
  return (
    <button onClick={() => onNavigate(overview.nextAction.route)} className="glass w-full p-4 text-left transition-opacity hover:opacity-90">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
          <Flame size={18} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-widest text-white">Next Action</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{overview.nextAction.text}</p>
        </div>
        <ChevronRight size={16} className="mt-1 text-slate-500" />
      </div>
    </button>
  )
}

function ProgressSnapshot({ overview, onNavigate }) {
  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest">Progress Snapshot</h3>
        <button onClick={() => onNavigate('review')} className="text-xs font-medium text-accent">Review</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-800/70 p-3 text-center">
          <div className="font-heading text-lg font-bold text-white">{overview.session.totalSets}</div>
          <div className="text-[10px] text-slate-500">sets today</div>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3 text-center">
          <div className={`font-heading text-lg font-bold ${overview.protein.isOnTrack ? 'text-emerald-300' : 'text-amber-300'}`}>
            {overview.protein.protein}g
          </div>
          <div className="text-[10px] text-slate-500">protein</div>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3 text-center">
          <div className="font-heading text-lg font-bold text-white">{overview.consistency.workoutDays}</div>
          <div className="text-[10px] text-slate-500">7d workouts</div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Deep body metrics, projections, and weekly coaching live on the Progress/Body screens so Home stays about today.
      </p>
    </div>
  )
}

export function Dashboard({ state, setStiffness, today, onNavigate, user }) {
  const overview = buildTodayOverview(state, today, user?.plan_preferences)
  const stiffness = state.morningStiffness[today] ?? null

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <header className="pr-28">
        <h1 className="font-heading text-2xl font-bold tracking-wide text-primary-color">Home</h1>
        <p className="text-xs text-muted-color">
          {new Date(`${today}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {user?.display_name ? ` · ${user.display_name}` : ''}
        </p>
      </header>

      <TodayHero overview={overview} onNavigate={onNavigate} />
      <NextActionCard overview={overview} onNavigate={onNavigate} />
      <StiffnessCheck stiffness={stiffness} today={today} setStiffness={setStiffness} readiness={overview.readiness} />
      <ConsistencyCard consistency={overview.consistency} />
      <ProgressSnapshot overview={overview} onNavigate={onNavigate} />
      <PlanBasis preferences={overview.preferences} workout={overview.queuedWorkout} />
    </div>
  )
}
