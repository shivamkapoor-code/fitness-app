import { supabase } from '../lib/supabase'

export function buildContext(state, today) {
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7Days.push(d.toISOString().slice(0, 10))
  }

  const weights = last7Days
    .map((d) => state.bodyMetrics.find((m) => m.date === d)?.weight)
    .filter(Boolean)

  const proteinAvgs = last7Days
    .map((d) => state.nutrition[d]?.totals?.protein ?? null)
    .filter((v) => v !== null)

  const calorieAvgs = last7Days
    .map((d) => state.nutrition[d]?.totals?.kcal ?? null)
    .filter((v) => v !== null)

  const inflam7 = last7Days.map((d) => {
    const inf = state.inflam[d]
    if (!inf) return null
    let score = 3
    if (inf.zone2) score -= 0.5
    if (inf.salmon) score -= 0.5
    if (inf.cold) score -= 0.5
    if (inf.breathing) score -= 0.5
    const sleep = inf.sleep ?? 7
    if (sleep >= 8) score -= 0.5
    else if (sleep < 6) score += 1
    return Math.max(0, Math.min(5, score))
  }).filter((v) => v !== null)

  const zone2Days = last7Days.filter((d) => state.inflam[d]?.zone2).length
  const todayNutrition = state.nutrition[today]?.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const todaySuppCount = Object.values(state.suppChecks[today] ?? {}).filter(Boolean).length
  const todayStiffness = state.morningStiffness[today] ?? null

  const queue = state.workoutQueue
  const todayWorkoutDay = queue.seq[queue.idx]
  const workoutNames = ['Full Rest', 'PUSH Strength', 'PULL Strength', 'LEGS Strength', 'Recovery Mobility', 'UPPER Hypertrophy', 'LEGS Hypertrophy']

  return `
CURRENT DATA (${today}):
- Recent weights (last 7 days): ${weights.length > 0 ? weights.join(', ') + ' lbs' : 'No data'}
- 7-day avg protein: ${proteinAvgs.length > 0 ? Math.round(proteinAvgs.reduce((a, b) => a + b, 0) / proteinAvgs.length) + 'g' : 'No data'}
- 7-day avg calories: ${calorieAvgs.length > 0 ? Math.round(calorieAvgs.reduce((a, b) => a + b, 0) / calorieAvgs.length) + ' kcal' : 'No data'}
- 7-day avg inflammation: ${inflam7.length > 0 ? (inflam7.reduce((a, b) => a + b, 0) / inflam7.length).toFixed(1) : 'No data'}
- Zone 2 sessions this week: ${zone2Days}/7
- Today's supplements taken: ${todaySuppCount}
- Morning stiffness today: ${todayStiffness !== null ? todayStiffness + '/5' : 'Not logged'}
- Today's workout: ${workoutNames[todayWorkoutDay]}
- Today's macros so far: ${todayNutrition.kcal} kcal, ${todayNutrition.protein}g protein, ${todayNutrition.carbs}g carbs, ${todayNutrition.fat}g fat`
}

async function invokeCoach(body) {
  if (!supabase) throw new Error('Supabase is not configured. AI features need Supabase Edge Functions.')
  const { data, error } = await supabase.functions.invoke('ai-coach', { body })

  if (error) {
    let detail = ''
    try {
      if (error.context?.json) {
        const parsed = await error.context.json()
        detail = parsed?.error ?? ''
      }
    } catch {
      detail = ''
    }
    throw new Error(detail || error.message)
  }

  if (data?.error) throw new Error(data.error)
  return data
}

export async function callClaude(messages, contextStr = '') {
  const data = await invokeCoach({ action: 'chat', messages, context: contextStr })
  return data.text ?? ''
}

export async function getAIInsight(prompt, state, today) {
  const context = buildContext(state, today)
  return callClaude([{ role: 'user', content: prompt }], context)
}

export async function analyzePhoto(base64Image, mediaType = 'image/jpeg') {
  const data = await invokeCoach({ action: 'photo', base64Image, mediaType })
  return data.meal ?? { name: 'Unknown meal', kcal: 0, protein: 0, carbs: 0, fat: 0, confidence: 'low', notes: '' }
}
