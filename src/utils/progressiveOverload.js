export function calcProgressiveOverload(workoutLog, exerciseName) {
  // Gather all dates that have sets for this exercise
  const dates = Object.keys(workoutLog)
    .filter((d) => workoutLog[d][exerciseName]?.length > 0)
    .sort()

  if (dates.length === 0) return { lastWeight: null, suggestedWeight: null, recommendation: 'START', reasoning: 'No history yet. Start light and focus on form.', history: [] }

  const history = dates.map((d) => ({
    date: d,
    sets: workoutLog[d][exerciseName],
    maxWeight: Math.max(...workoutLog[d][exerciseName].map((s) => s.weight ?? 0)),
    avgRPE: workoutLog[d][exerciseName].reduce((a, s) => a + (s.rpe ?? 7), 0) / workoutLog[d][exerciseName].length,
  }))

  const window = history.slice(-3) // last 3 sessions
  const lastSession = window[window.length - 1]
  const lastWeight = lastSession.maxWeight
  const avgRPE = window.reduce((a, w) => a + w.avgRPE, 0) / window.length

  // Determine if compound or isolation based on exercise name
  const compoundKeywords = ['Press', 'Row', 'Pulldown', 'Squat', 'Thrust', 'Extension', 'Carry']
  const isCompound = compoundKeywords.some((k) => exerciseName.includes(k))
  const increment = isCompound ? 5 : 2.5

  let recommendation, suggestedWeight, reasoning

  if (avgRPE >= 8) {
    recommendation = 'INCREASE'
    suggestedWeight = lastWeight + increment
    reasoning = `Avg RPE ${avgRPE.toFixed(1)} across last ${window.length} sessions. Ready for +${increment}lbs.`
  } else if (avgRPE < 7) {
    recommendation = 'INCREASE'
    suggestedWeight = lastWeight + increment
    reasoning = `Avg RPE ${avgRPE.toFixed(1)} — feeling too easy. Bump up +${increment}lbs.`
  } else {
    recommendation = 'MAINTAIN'
    suggestedWeight = lastWeight
    reasoning = `Avg RPE ${avgRPE.toFixed(1)} — in the optimal range. Maintain ${lastWeight}lbs and aim for more reps.`
  }

  return { lastWeight, suggestedWeight, recommendation, reasoning, history }
}
