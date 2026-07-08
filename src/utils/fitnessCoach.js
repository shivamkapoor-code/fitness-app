import { calcInflamScore } from './bioAge.js'
import {
  getConsistencySummary,
  getProteinSnapshot,
  getSessionStats,
  getTodayWorkoutState,
  normalisePlanPreferences,
} from './trainingInsights.js'

export function getWeeklyDates(today) {
  const dates = []
  const base = new Date(`${today}T00:00:00`)

  for (let i = 6; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  return dates
}

export function getRecoveryLoadLabel(load) {
  if (load >= 3.75) return 'High'
  if (load >= 2.25) return 'Moderate'
  return 'Low'
}

function getSevenDayAverages(state, today) {
  const dates = getWeeklyDates(today)
  const proteinValues = dates
    .map((date) => state.nutrition?.[date]?.totals?.protein)
    .filter((value) => Number.isFinite(value))
  const caloriesValues = dates
    .map((date) => state.nutrition?.[date]?.totals?.kcal)
    .filter((value) => Number.isFinite(value))
  const recoveryLoads = dates.map((date) => calcInflamScore(state.inflam?.[date]))
  const sleepValues = dates
    .map((date) => state.inflam?.[date]?.sleep)
    .filter((value) => Number.isFinite(value))

  return {
    avgProtein: proteinValues.length
      ? Math.round(proteinValues.reduce((sum, value) => sum + value, 0) / proteinValues.length)
      : 0,
    avgCalories: caloriesValues.length
      ? Math.round(caloriesValues.reduce((sum, value) => sum + value, 0) / caloriesValues.length)
      : 0,
    avgRecoveryLoad: recoveryLoads.reduce((sum, value) => sum + value, 0) / recoveryLoads.length,
    avgSleep: sleepValues.length
      ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length
      : null,
  }
}

function buildPrimaryRecommendation({ workoutState, session, protein, stiffness, recoveryLoad }) {
  if (workoutState.isCompletedToday) {
    if (protein.remaining > 0) {
      return {
        kind: 'nutrition',
        title: 'Close the protein gap',
        cta: 'Log food',
        ctaRoute: 'nutrition',
        reason: `${workoutState.completedWorkout.name} is done. You still have ${protein.remaining}g protein left, so make the next action food, not more training.`,
      }
    }

    return {
      kind: 'review',
      title: 'Recover and review',
      cta: 'Open progress',
      ctaRoute: 'body',
      reason: `${workoutState.completedWorkout.name} is complete. Keep recovery simple and check the weekly pattern before changing the plan.`,
    }
  }

  if (stiffness == null) {
    return {
      kind: 'check-in',
      title: 'Do a readiness check first',
      cta: 'Log stiffness',
      ctaRoute: 'dashboard',
      reason: 'The plan needs one honest stiffness input before deciding whether to push, maintain, or modify today.',
    }
  }

  if (stiffness >= 4 || recoveryLoad >= 4) {
    return {
      kind: 'modify',
      title: `Modify ${workoutState.queuedWorkout.shortName}`,
      cta: 'Open workout',
      ctaRoute: 'workout',
      reason: 'High stiffness or recovery load means today should be clean reps, longer warm-up, and no grinding.',
    }
  }

  if (session.totalSets > 0) {
    return {
      kind: 'finish',
      title: 'Finish the guided session',
      cta: 'Continue workout',
      ctaRoute: 'workout',
      reason: `${session.totalSets} sets are logged. Finish the remaining planned movements, then mark the session complete.`,
    }
  }

  if (workoutState.queuedWorkout.day === 0) {
    return {
      kind: 'recovery',
      title: 'Take the rest day seriously',
      cta: 'Open recovery',
      ctaRoute: 'recovery',
      reason: 'Today is not a missed training day. Easy steps, mobility only if it helps, and sleep are the work.',
    }
  }

  return {
    kind: 'train',
    title: `Train ${workoutState.queuedWorkout.shortName}`,
    cta: 'Start workout',
    ctaRoute: 'workout',
    reason: `${workoutState.queuedWorkout.name} fits the current queue. Use progression only if warm-ups feel crisp.`,
  }
}

export function buildDailyCoachingSummary(state, today, preferences = {}) {
  const prefs = normalisePlanPreferences(preferences)
  const workoutState = getTodayWorkoutState(state, today)
  const activeWorkout = workoutState.completedWorkout ?? workoutState.queuedWorkout
  const session = getSessionStats(state, today, activeWorkout)
  const consistency = getConsistencySummary(state, today, prefs)
  const protein = getProteinSnapshot(state, today)
  const stiffness = state.morningStiffness?.[today] ?? null
  const recoveryLoad = calcInflamScore(state.inflam?.[today])
  const recoveryLoadLabel = getRecoveryLoadLabel(recoveryLoad)
  const averages = getSevenDayAverages(state, today)
  const primary = buildPrimaryRecommendation({
    workoutState,
    session,
    protein,
    stiffness,
    recoveryLoad,
  })

  const recoveryTone = stiffness == null
    ? 'slate'
    : stiffness >= 4 || recoveryLoad >= 4
      ? 'red'
      : stiffness === 3 || recoveryLoad >= 3
        ? 'amber'
        : 'emerald'

  return {
    preferences: prefs,
    workoutState,
    activeWorkout,
    session,
    consistency,
    protein,
    stiffness,
    recoveryLoad,
    recoveryLoadLabel,
    averages,
    primary,
    teamGuidance: {
      training: {
        title: activeWorkout.shortName,
        text: workoutState.isCompletedToday
          ? 'Training is done for today. The next useful training decision is recovery quality.'
          : activeWorkout.goal,
        tone: workoutState.isCompletedToday ? 'emerald' : 'slate',
      },
      nutrition: {
        title: protein.remaining > 0 ? `${protein.remaining}g protein left` : 'Protein target covered',
        text: protein.remaining > 0
          ? 'Make the next meal protein-led, then adjust carbs around the session instead of chasing perfect macros.'
          : 'Keep the rest of the day boring: hydration, normal portions, and no victory snacking.',
        tone: protein.isOnTrack ? 'emerald' : 'amber',
      },
      recovery: {
        title: `${recoveryLoadLabel} recovery load`,
        text: stiffness == null
          ? 'Log stiffness to make the recovery call transparent.'
          : stiffness >= 4
            ? 'Back off intensity and avoid spine-sensitive work today.'
            : 'Recovery signals support the planned session if reps stay clean.',
        tone: recoveryTone,
      },
      progress: {
        title: consistency.isOnTrack ? 'On pace this week' : 'Consistency gap',
        text: `${consistency.workoutDays}/${consistency.targetDays} planned training days logged. The next improvement is execution, not another metric.`,
        tone: consistency.isOnTrack ? 'emerald' : 'amber',
      },
    },
  }
}
