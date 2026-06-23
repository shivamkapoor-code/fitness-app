const FIELD_LABELS = {
  weight_lbs: 'Weight',
  body_fat_pct: 'Body fat',
  bmi: 'BMI',
  muscle_mass_lbs: 'Muscle mass',
  skeletal_muscle_pct: 'Skeletal muscle',
  subcutaneous_fat_pct: 'Subcutaneous fat',
  visceral_fat: 'Visceral fat',
  body_water_pct: 'Body water',
  bmr: 'BMR',
  metabolic_age: 'Metabolic age',
  fat_free_body_weight_lbs: 'Fat-free body weight',
  protein_pct: 'Protein',
  bone_mass_lbs: 'Bone mass',
}

const FIELD_UNITS = {
  weight_lbs: 'lb',
  body_fat_pct: '%',
  bmi: '',
  muscle_mass_lbs: 'lb',
  skeletal_muscle_pct: '%',
  subcutaneous_fat_pct: '%',
  visceral_fat: '',
  body_water_pct: '%',
  bmr: 'kcal',
  metabolic_age: '',
  fat_free_body_weight_lbs: 'lb',
  protein_pct: '%',
  bone_mass_lbs: 'lb',
}

const SIGNIFICANT_CHANGE = {
  weight_lbs: 2,
  body_fat_pct: 1,
  muscle_mass_lbs: 1,
  skeletal_muscle_pct: 0.5,
  visceral_fat: 1,
  metabolic_age: 1,
}

function sortEntries(entries) {
  return [...(entries ?? [])]
    .filter((entry) => entry?.date)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function average(entries, field) {
  const values = entries.map((entry) => entry[field]).filter((value) => Number.isFinite(value))
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatValue(value, field) {
  if (!Number.isFinite(value)) return 'No data'
  const unit = FIELD_UNITS[field]
  const precision = Math.abs(value) >= 100 ? 0 : 1
  return `${value.toFixed(precision)}${unit ? ` ${unit}` : ''}`
}

function calcTrend(entries, field) {
  const values = entries
    .map((entry) => ({ date: entry.date, value: entry[field] }))
    .filter((entry) => Number.isFinite(entry.value))

  if (values.length < 2) return null

  const first = values[0]
  const latest = values[values.length - 1]
  const change = latest.value - first.value
  const threshold = SIGNIFICANT_CHANGE[field] ?? 0.25
  const direction = Math.abs(change) < threshold ? 'stable' : change > 0 ? 'up' : 'down'

  return {
    field,
    label: FIELD_LABELS[field],
    first,
    latest,
    change,
    direction,
    summary: `${FIELD_LABELS[field]} ${direction}: ${formatValue(first.value, field)} -> ${formatValue(latest.value, field)} (${change >= 0 ? '+' : ''}${formatValue(change, field)})`,
  }
}

function windowFromDays(entries, days) {
  if (entries.length === 0) return []
  const latestDate = new Date(entries[entries.length - 1].date)
  const cutoff = new Date(latestDate)
  cutoff.setDate(cutoff.getDate() - days + 1)
  return entries.filter((entry) => new Date(entry.date) >= cutoff)
}

export function analyzeRenphoTrends(entries) {
  const sorted = sortEntries(entries)
  const fields = Object.keys(FIELD_LABELS)
  const trends = Object.fromEntries(
    fields
      .map((field) => [field, calcTrend(sorted, field)])
      .filter(([, trend]) => trend)
  )

  const last7 = windowFromDays(sorted, 7)
  const last30 = windowFromDays(sorted, 30)
  const latest = sorted[sorted.length - 1] ?? null
  const first = sorted[0] ?? null

  const meaningfulChanges = Object.values(trends).filter((trend) => trend.direction !== 'stable')
  const hasEnoughData = sorted.length >= 2
  const hasTrendDepth = sorted.length >= 4 || last30.length >= 3

  const bodyFatTrend = trends.body_fat_pct?.direction ?? 'unknown'
  const muscleTrend = trends.muscle_mass_lbs?.direction ?? trends.skeletal_muscle_pct?.direction ?? 'unknown'
  const weightTrend = trends.weight_lbs?.direction ?? 'unknown'
  const visceralLatest = latest?.visceral_fat ?? null

  return {
    entries: sorted,
    count: sorted.length,
    first,
    latest,
    hasEnoughData,
    hasTrendDepth,
    dateRange: first && latest ? `${first.date} to ${latest.date}` : 'No dated readings',
    trends,
    meaningfulChanges,
    averages: {
      last7: Object.fromEntries(fields.map((field) => [field, average(last7, field)])),
      last30: Object.fromEntries(fields.map((field) => [field, average(last30, field)])),
      overall: Object.fromEntries(fields.map((field) => [field, average(sorted, field)])),
    },
    flags: {
      bodyFatTrendingUp: bodyFatTrend === 'up',
      muscleDropping: muscleTrend === 'down',
      weightDownMuscleDown: weightTrend === 'down' && muscleTrend === 'down',
      visceralFatHigh: Number.isFinite(visceralLatest) && visceralLatest >= 10,
      progressLooksGood: ['down', 'stable'].includes(bodyFatTrend) && ['up', 'stable'].includes(muscleTrend) && !(Number.isFinite(visceralLatest) && visceralLatest >= 12),
    },
  }
}

export function buildRenphoPrompt(analysis) {
  const latest = analysis.latest
  const latestSummary = latest
    ? Object.keys(FIELD_LABELS)
        .filter((field) => Number.isFinite(latest[field]))
        .map((field) => `- ${FIELD_LABELS[field]}: ${formatValue(latest[field], field)}`)
        .join('\n')
    : '- No latest reading available'

  const trendSummary = Object.values(analysis.trends)
    .map((trend) => `- ${trend.summary}`)
    .join('\n') || '- Not enough readings to calculate trends'

  const last7Summary = Object.entries(analysis.averages.last7)
    .filter(([, value]) => Number.isFinite(value))
    .map(([field, value]) => `- ${FIELD_LABELS[field]}: ${formatValue(value, field)}`)
    .join('\n') || '- Not enough last-7-day data'

  const last30Summary = Object.entries(analysis.averages.last30)
    .filter(([, value]) => Number.isFinite(value))
    .map(([field, value]) => `- ${FIELD_LABELS[field]}: ${formatValue(value, field)}`)
    .join('\n') || '- Not enough last-30-day data'

  return `Analyze this Renpho body composition trend data and give practical fitness guidance.

Rules:
- This is general fitness guidance, not medical advice. Include that disclaimer.
- Look at trends over time, not just the latest entry.
- Be direct and specific.
- If data is insufficient, say so clearly and give a starter plan.
- Cover workout changes, diet changes, and overall health/body composition direction.
- Recommend a weekly structure only if the data supports it.
- Consider strength/lifting, cardio, abs/core, mobility/recovery, and rest days.
- Diet guidance should include protein target direction, calorie direction, hydration, carb/fat balance, foods to prioritize, and habits to reduce.

Data range: ${analysis.dateRange}
Readings: ${analysis.count}
Enough trend depth: ${analysis.hasTrendDepth ? 'yes' : 'no'}

Latest reading:
${latestSummary}

First vs latest trends:
${trendSummary}

Last 7 day averages:
${last7Summary}

Last 30 day averages:
${last30Summary}

Detected flags:
- Body fat trending up: ${analysis.flags.bodyFatTrendingUp ? 'yes' : 'no'}
- Muscle dropping: ${analysis.flags.muscleDropping ? 'yes' : 'no'}
- Weight down and muscle down: ${analysis.flags.weightDownMuscleDown ? 'yes' : 'no'}
- Visceral fat high: ${analysis.flags.visceralFatHigh ? 'yes' : 'no'}
- Progress looks good: ${analysis.flags.progressLooksGood ? 'yes' : 'no'}

Return this exact structure:
1. Disclaimer
2. Trend Summary
3. Workout Changes
4. Diet Changes
5. Weekly Structure
6. Body Composition Direction
7. Next 7 Days`
}

export function summarizeRenphoForUi(analysis) {
  if (!analysis.hasEnoughData) {
    return 'Need at least 2 Renpho readings for trend analysis. Upload more entries for first-vs-latest and 7/30-day comparisons.'
  }

  return analysis.meaningfulChanges
    .slice(0, 4)
    .map((trend) => trend.summary)
    .join(' | ')
}
