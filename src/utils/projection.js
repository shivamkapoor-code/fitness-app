export function calcBodyProjection(bodyMetrics) {
  if (bodyMetrics.length < 2) return null

  const sorted = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const firstDate = new Date(first.date)
  const lastDate = new Date(last.date)
  const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24))

  const totalWeightChange = (last.weight ?? 192) - (first.weight ?? 192)
  const weeklyRate = (totalWeightChange / daysDiff) * 7

  const now = new Date()
  const project = (weeks) => {
    const projectedWeight = (last.weight ?? 192) + weeklyRate * weeks
    const startBf = first.bodyFat ?? 23.7
    const endBf = last.bodyFat ?? 23.7
    const bfRate = daysDiff > 0 ? ((endBf - startBf) / daysDiff) * 7 : 0
    const projectedBf = (last.bodyFat ?? 23.7) + bfRate * weeks
    return {
      weeks,
      weight: Math.round(projectedWeight * 10) / 10,
      bodyFat: Math.round(projectedBf * 10) / 10,
      date: new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  }

  return {
    weeklyRate: Math.round(weeklyRate * 100) / 100,
    projections: [project(4), project(8), project(12)],
  }
}
