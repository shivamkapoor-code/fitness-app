import { WORKOUT_SPLIT } from '../data/workouts.js'
import { MACRO_TARGETS } from '../data/meals.js'
import { calcInflamScore } from './bioAge.js'

export const DEFAULT_PLAN_PREFERENCES = {
  goal: 'Body recomposition: build visible muscle while reducing visceral fat',
  level: 'Intermediate',
  weekly_training_days: 5,
  equipment: 'Full gym',
  session_minutes: 75,
}

export function normalisePlanPreferences(preferences = {}) {
  const weeklyDays = Number(preferences.weekly_training_days)
  const sessionMinutes = Number(preferences.session_minutes)

  return {
    ...DEFAULT_PLAN_PREFERENCES,
    ...preferences,
    weekly_training_days: Number.isFinite(weeklyDays)
      ? Math.min(7, Math.max(1, Math.round(weeklyDays)))
      : DEFAULT_PLAN_PREFERENCES.weekly_training_days,
    session_minutes: Number.isFinite(sessionMinutes)
      ? Math.min(120, Math.max(20, Math.round(sessionMinutes)))
      : DEFAULT_PLAN_PREFERENCES.session_minutes,
  }
}

export function getDateWindow(today, days) {
  const dates = []
  const base = new Date(`${today}T00:00:00`)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  return dates
}

export function getWorkoutByDay(day) {
  return WORKOUT_SPLIT.find((workout) => workout.day === day) ?? WORKOUT_SPLIT[0]
}

export function moveWorkoutToToday(queue, selectedSeqIdx) {
  const seq = queue?.seq ?? []
  if (seq.length === 0) return queue
  if (selectedSeqIdx === queue.idx) return { ...queue }

  const currentIdx = queue.idx ?? 0
  const selectedDay = seq[selectedSeqIdx]
  if (selectedDay == null) return { ...queue }

  const orderedFromToday = seq.map((_, offset) => seq[(currentIdx + offset) % seq.length])
  const nextSeq = [
    selectedDay,
    ...orderedFromToday.filter((day) => day !== selectedDay),
  ]

  return {
    ...queue,
    seq: nextSeq,
    idx: 0,
  }
}

export function getTodayWorkoutState(state, today) {
  const queue = state.workoutQueue
  const completion = state.workoutCompletions?.[today] ?? null
  const queuedWorkout = getWorkoutByDay(queue.seq[queue.idx])
  const completedWorkout = completion ? getWorkoutByDay(completion.day) : null

  return {
    queuedWorkout,
    completion,
    completedWorkout,
    isCompletedToday: Boolean(completion),
  }
}

export function getSessionStats(state, date, workout) {
  const dayLog = state.workoutLog?.[date] ?? {}
  const plannedNames = [
    ...(workout?.exercises ?? []),
    ...(workout?.core ?? []),
  ].map((exercise) => exercise.name)

  const loggedExercises = plannedNames.filter((name) => (dayLog[name] ?? []).length > 0)
  const totalSets = Object.values(dayLog).reduce((sum, sets) => sum + (sets?.length ?? 0), 0)
  const plannedExerciseCount = plannedNames.length

  return {
    loggedExercises: loggedExercises.length,
    plannedExerciseCount,
    totalSets,
    percentComplete: plannedExerciseCount > 0
      ? Math.round((loggedExercises.length / plannedExerciseCount) * 100)
      : 100,
  }
}

export function getConsistencySummary(state, today, preferences = {}) {
  const prefs = normalisePlanPreferences(preferences)
  const last7 = getDateWindow(today, 7)
  const workoutDays = last7.filter((date) => {
    const hasSets = Object.keys(state.workoutLog?.[date] ?? {}).length > 0
    return hasSets || Boolean(state.workoutCompletions?.[date])
  })

  let streak = 0
  const reversed = [...last7].reverse()
  for (const date of reversed) {
    const hasWork = workoutDays.includes(date)
    if (!hasWork) break
    streak += 1
  }

  return {
    workoutDays: workoutDays.length,
    targetDays: prefs.weekly_training_days,
    streak,
    lastWorkoutDate: workoutDays.at(-1) ?? null,
    isOnTrack: workoutDays.length >= Math.min(prefs.weekly_training_days, 7),
  }
}

export function getReadinessGuidance(state, today) {
  const stiffness = state.morningStiffness?.[today] ?? null
  const inflamEntry = state.inflam?.[today] ?? null
  const inflammation = inflamEntry ? calcInflamScore(inflamEntry) : null
  const sleep = inflamEntry?.sleep ?? null

  if (stiffness >= 4) {
    return {
      verdict: 'Back off',
      tone: 'red',
      message: 'High stiffness today. Use the modified plan: longer warm-up, no grinding reps, and swap spine-sensitive lower-body work.',
    }
  }

  if (stiffness === 3 || inflammation >= 3.5 || (sleep !== null && sleep < 6)) {
    return {
      verdict: 'Maintain',
      tone: 'amber',
      message: 'Train, but keep the session clean. Leave one to two reps in reserve and use Zone 2 as written.',
    }
  }

  if (stiffness === null && inflammation === null) {
    return {
      verdict: 'Check in first',
      tone: 'slate',
      message: 'Log stiffness before training so today’s recommendation can adjust intensity transparently.',
    }
  }

  return {
    verdict: 'Push',
    tone: 'emerald',
    message: 'Readiness looks good. Follow the planned lifts and use progressive overload only when reps stay crisp.',
  }
}

export function getProteinSnapshot(state, today) {
  const protein = state.nutrition?.[today]?.totals?.protein ?? 0
  const remaining = Math.max(0, MACRO_TARGETS.protein - protein)
  return {
    protein,
    remaining,
    target: MACRO_TARGETS.protein,
    isOnTrack: remaining <= 40,
  }
}

export function buildTodayOverview(state, today, preferences = {}) {
  const prefs = normalisePlanPreferences(preferences)
  const workoutState = getTodayWorkoutState(state, today)
  const activeWorkout = workoutState.completedWorkout ?? workoutState.queuedWorkout
  const session = getSessionStats(state, today, activeWorkout)
  const consistency = getConsistencySummary(state, today, prefs)
  const readiness = getReadinessGuidance(state, today)
  const protein = getProteinSnapshot(state, today)

  let nextAction = {
    label: 'Start workout',
    route: 'workout',
    text: `Start ${workoutState.queuedWorkout.name}.`,
  }

  if (workoutState.isCompletedToday) {
    nextAction = protein.remaining > 0
      ? {
          label: 'Log food',
          route: 'nutrition',
          text: `${workoutState.completedWorkout.name} is done. Next: close the protein gap (${protein.remaining}g left).`,
        }
      : {
          label: 'Review progress',
          route: 'review',
          text: `${workoutState.completedWorkout.name} is done. Keep recovery boring and check the weekly pattern.`,
        }
  } else if (readiness.verdict === 'Check in first') {
    nextAction = {
      label: 'Log stiffness',
      route: 'dashboard',
      text: 'Log morning stiffness so the plan can decide whether to push, maintain, or back off.',
    }
  } else if (session.totalSets > 0) {
    nextAction = {
      label: 'Finish session',
      route: 'workout',
      text: `${session.totalSets} sets logged. Finish the remaining planned movements, then mark the workout done.`,
    }
  } else if (activeWorkout.day === 0) {
    nextAction = {
      label: 'Open plan',
      route: 'workout',
      text: 'Today is a rest day. Keep steps easy and use the mobility work only if it helps you feel better.',
    }
  }

  return {
    preferences: prefs,
    ...workoutState,
    activeWorkout,
    session,
    consistency,
    readiness,
    protein,
    nextAction,
  }
}
