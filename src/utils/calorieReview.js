export function calcCalorieReview(bodyMetrics) {
  if (bodyMetrics.length < 14) return null

  const sorted = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sorted.slice(-14)
  const first7 = recent.slice(0, 7)
  const last7 = recent.slice(7)

  const avg = (arr, key) => arr.reduce((a, e) => a + (e[key] ?? 0), 0) / arr.length

  const avgWeightFirst = avg(first7, 'weight')
  const avgWeightLast = avg(last7, 'weight')
  const weeklyChange = avgWeightLast - avgWeightFirst

  if (weeklyChange > -0.2 && weeklyChange < 0.2) {
    return {
      type: 'STALL',
      weeklyChange,
      message: `Weight stalled: ${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(2)} lbs/week over 14 days. Consider reducing calories 150-200 kcal.`,
    }
  }

  if (weeklyChange < -2) {
    return {
      type: 'TOO_FAST',
      weeklyChange,
      message: `Losing too fast: ${weeklyChange.toFixed(2)} lbs/week. Risk of lean mass loss. Consider adding 100-200 kcal.`,
    }
  }

  return null
}
