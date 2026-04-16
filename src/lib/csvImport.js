import Papa from 'papaparse'

const FIELD_MATCHERS = {
  date: (c) => c.includes('date') || c.includes('time of measurement') || c === 'time',
  weight_lbs: (c) => c.includes('weight') && (c.includes('lb') || c.includes('pound') || (!c.includes('kg') && !c.includes('used') && !c.includes('lifted'))),
  weight_kg: (c) => c.includes('weight') && c.includes('kg') && !c.includes('used'),
  body_fat_pct: (c) => (c.includes('body fat') || c.includes('fat %') || c.includes('fat%') || c.includes('fat pct')) && !c.includes('sub') && !c.includes('visceral'),
  visceral_fat: (c) => c.includes('visceral'),
  muscle_mass: (c) => (c.includes('muscle mass') || c.includes('muscle(lb') || c.includes('muscle(kg')) && !c.includes('%'),
  bmr: (c) => c === 'bmr' || c.includes('basal metabolic'),
  metabolic_age: (c) => c.includes('metabolic age'),
  waist: (c) => c.includes('waist'),
  neck: (c) => c.includes('neck'),
  exercise_name: (c) => c.includes('exercise') || c === 'workout' || c.includes('activity name') || c.includes('exercise name'),
  set_number: (c) => c === 'set' || c === 'sets' || c.includes('set number') || c.includes('set #'),
  reps: (c) => c === 'reps' || c === 'repetitions' || c.includes('reps'),
  weight_used: (c) => (c.includes('weight') && (c.includes('used') || c.includes('lifted') || c.includes('load'))) || c === 'load',
  rpe: (c) => c === 'rpe' || c.includes('rate of perceived') || c.includes('effort') || c.includes('intensity'),
  meal_name: (c) => c.includes('meal') || c.includes('food name') || c.includes('item') || c.includes('description'),
  kcal: (c) => c.includes('calorie') || c === 'kcal' || c === 'calories' || c === 'energy(kcal)' || c === 'energy',
  protein: (c) => c.includes('protein') && !c.includes('%'),
  carbs: (c) => c.includes('carb') && !c.includes('%'),
  fat_g: (c) => c === 'fat' || c === 'fat(g)' || (c.includes('fat') && !c.includes('body') && !c.includes('visceral') && !c.includes('%') && !c.includes('sub')),
}

function matchColumn(colName) {
  const c = colName.toLowerCase().trim()
  for (const [field, matcher] of Object.entries(FIELD_MATCHERS)) {
    if (matcher(c)) return field
  }
  return null
}

function normaliseDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (!isNaN(d)) return d.toISOString().slice(0, 10)
  return null
}

function inferType(fields) {
  const f = fields.join(' ')
  if (f.includes('weight_lbs') || f.includes('body_fat') || f.includes('visceral')) return 'body_metrics'
  if (f.includes('exercise_name') || f.includes('reps') || f.includes('set_number')) return 'workout'
  if (f.includes('kcal') || f.includes('protein') || f.includes('meal_name')) return 'nutrition'
  return 'unknown'
}

function buildBodyMetricEntry(date, metrics) {
  return {
    date,
    weight_lbs: metrics.weight_lbs ? parseFloat(metrics.weight_lbs) :
                metrics.weight_kg ? parseFloat(metrics.weight_kg) * 2.20462 : undefined,
    body_fat_pct: metrics.body_fat_pct ? parseFloat(metrics.body_fat_pct) : undefined,
    visceral_fat: metrics.visceral_fat ? parseFloat(metrics.visceral_fat) : undefined,
    muscle_mass_lbs: metrics.muscle_mass ? parseFloat(metrics.muscle_mass) : undefined,
    bmr: metrics.bmr ? parseFloat(metrics.bmr) : undefined,
    metabolic_age: metrics.metabolic_age ? parseFloat(metrics.metabolic_age) : undefined,
    waist_inches: metrics.waist ? parseFloat(metrics.waist) : undefined,
    neck_inches: metrics.neck ? parseFloat(metrics.neck) : undefined,
    raw_data: metrics.raw_data ?? {},
  }
}

function parseVertical(csvText) {
  const monthRe = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i
  const lines = csvText.split('\n')
  let date = null
  for (const line of lines) {
    if (monthRe.test(line)) {
      const cols = line.split(',').map(c => c.trim())
      const dateCol = cols.find(c => monthRe.test(c))
      if (dateCol) {
        date = normaliseDate(dateCol)
        if (date) break
      }
    }
  }

  const result = Papa.parse(csvText, { header: false, skipEmptyLines: true })
  const metrics = {}
  const unmapped = []
  for (const row of result.data) {
    const key = row[0]?.toString().toLowerCase().trim()
    const val = row[1]?.toString().trim()
    if (!key || !val) continue
    const field = matchColumn(key)
    if (field) metrics[field] = val
    else if (key && val) unmapped.push(key)
  }

  if (!date && metrics.date) date = normaliseDate(metrics.date)
  if (!date) return { rows: [], unmappedColumns: unmapped, type: 'unknown' }

  const entry = buildBodyMetricEntry(date, metrics)
  const type = inferType(Object.keys(metrics))
  return { rows: [entry], unmappedColumns: [...new Set(unmapped)], type }
}

function parseHorizontal(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim()
  })

  const headers = result.meta.fields ?? []
  const fieldMap = {}
  const unmapped = []
  for (const h of headers) {
    const field = matchColumn(h)
    if (field) fieldMap[h] = field
    else unmapped.push(h)
  }

  const type = inferType(Object.values(fieldMap))
  const rows = result.data
    .map(row => {
      const mapped = {}
      for (const [orig, field] of Object.entries(fieldMap)) {
        mapped[field] = row[orig]
      }
      const raw = {}
      for (const u of unmapped) { if (row[u]) raw[u] = row[u] }
      mapped.raw_data = raw

      if (mapped.date) mapped.date = normaliseDate(mapped.date)
      if (mapped.weight_kg && !mapped.weight_lbs) {
        mapped.weight_lbs = parseFloat(mapped.weight_kg) * 2.20462
      }
      return mapped
    })
    .filter(r => r.date)

  return { rows, unmappedColumns: [...new Set(unmapped)], type }
}

export function detectAndParseCSV(csvText) {
  try {
    const firstLines = csvText.trim().split('\n').slice(0, 5)
    const firstColValues = firstLines.map(l => l.split(',')[0]?.trim().toLowerCase())
    const hasDateInFirstCol = firstColValues.some(v =>
      v.includes('date') || v.includes('time')
    )
    const likelyVertical = !hasDateInFirstCol && firstLines[0]?.split(',').length <= 5

    if (likelyVertical) {
      return parseVertical(csvText)
    }

    const horizontal = parseHorizontal(csvText)
    if (horizontal.rows.length > 0) return horizontal

    return parseVertical(csvText)
  } catch (err) {
    console.error('CSV parse error:', err)
    return { rows: [], unmappedColumns: [], type: 'unknown', error: err.message }
  }
}
