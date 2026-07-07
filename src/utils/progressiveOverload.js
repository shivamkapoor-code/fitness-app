export function calcProgressiveOverload(workoutLog, exerciseName) {
  // Gather all dates that have sets for this exercise
  const dates = Object.keys(workoutLog)
    .filter((d) => workoutLog[d][exerciseName]?.some((set) => Number(set.weight) > 0))
    .sort()

  if (dates.length === 0) return { lastWeight: null, suggestedWeight: null, recommendation: 'START', reasoning: 'No weighted history yet. Start light and focus on form.', history: [] }

  const history = dates.map((d) => ({
    date: d,
    sets: workoutLog[d][exerciseName].filter((set) => Number(set.weight) > 0),
  })).map((session) => ({
    ...session,
    maxWeight: Math.max(...session.sets.map((s) => Number(s.weight) || 0)),
    avgReps: session.sets.reduce((a, s) => a + (Number(s.reps) || 0), 0) / session.sets.length,
    avgRPE: session.sets.reduce((a, s) => a + (Number(s.rpe) || 7), 0) / session.sets.length,
  }))

  const window = history.slice(-3) // last 3 sessions
  const lastSession = window[window.length - 1]
  const lastWeight = lastSession.maxWeight
  const avgRPE = window.reduce((a, w) => a + w.avgRPE, 0) / window.length
  const avgReps = window.reduce((a, w) => a + w.avgReps, 0) / window.length

  // Determine if compound or isolation based on exercise name
  const compoundKeywords = ['Press', 'Row', 'Pulldown', 'Squat', 'Thrust', 'Extension', 'Carry']
  const isCompound = compoundKeywords.some((k) => exerciseName.includes(k))
  const increment = isCompound ? 5 : 2.5

  let recommendation, suggestedWeight, reasoning

  if (lastSession.avgRPE >= 9.25 || avgRPE >= 9) {
    recommendation = 'DECREASE'
    suggestedWeight = Math.max(0, lastWeight - increment)
    reasoning = `Avg RPE ${avgRPE.toFixed(1)} is too high. Reduce ${increment}lbs and rebuild clean reps.`
  } else if (avgRPE <= 7.5) {
    recommendation = 'INCREASE'
    suggestedWeight = lastWeight + increment
    reasoning = `Avg RPE ${avgRPE.toFixed(1)} with ${avgReps.toFixed(1)} avg reps. Add ${increment}lbs if form stays crisp.`
  } else {
    recommendation = 'MAINTAIN'
    suggestedWeight = lastWeight
    reasoning = `Avg RPE ${avgRPE.toFixed(1)} is the productive zone. Maintain ${lastWeight}lbs and earn more reps before loading.`
  }

  return { lastWeight, suggestedWeight, recommendation, reasoning, history }
}
