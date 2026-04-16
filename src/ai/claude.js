const SHIVAM_PROFILE = `You are simultaneously an expert nutritionist, bodybuilder, biochemist, and physiotherapist. You are Shivam's personal coach with intimate knowledge of his profile.

SHIVAM'S STATS:
- Current: 192lb, 23.7% body fat, visceral fat 11, metabolic age 36, BMR 1804 kcal
- Targets: 175lb, 15% BF, visceral fat <9, metabolic age <30
- Lean mass: 146.4lb (MUST protect — minimum 144lb)

CRITICAL MEDICAL CONDITIONS (non-negotiable):
- L5-S1 disc injury: NO spinal flexion under load ever
- Piriformis syndrome: NO hip external rotation under load, NO wide stance, NO hip abduction machine
- Sciatica: burning/tingling down leg = stop immediately
- Tight hamstrings & glutes: NO RDL, NO cable pull-through
- Desk job: thoracic stiffness — needs daily mobility

REMOVED EXERCISES (never suggest): DB RDL, Bulgarian Split Squats, Dips, Hip Abduction Machine, 90/90 Hip Switches, Pigeon Pose, Cable Pull-Through

NUTRITION TARGETS: 2200 kcal, 185g protein (FIXED), 220g carbs (adjust first), 62g fat, 14-day adjustment rule
ANTI-INFLAMMATORY PRIORITY: Wild salmon 3-4x/week, turmeric+black pepper, EVOO, blueberries, oats

GYM: LA Fitness Hurontario — Hack Squat, Leg Press, Hip Thrust Machine, all cables, Ab Wheel, Farmer Carry space, all dumbbells

GOAL: Look muscular and fit (NOT bodybuilder bulk), reduce inflammation, improve metabolic age, reach 15% BF preserving lean mass

Always give specific, actionable advice. Reference his conditions when relevant. Be direct, not generic.`

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

export async function callClaude(apiKey, messages, contextStr = '') {
  if (!apiKey) throw new Error('No API key set. Add your Anthropic API key in Settings.')

  const systemPrompt = SHIVAM_PROFILE + (contextStr ? '\n\n' + contextStr : '')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${response.status}`)
  }

  const data = await response.json()
  return data.content[0]?.text ?? ''
}

export async function getAIInsight(apiKey, prompt, state, today) {
  const context = buildContext(state, today)
  return callClaude(apiKey, [{ role: 'user', content: prompt }], context)
}

export async function analyzePhoto(apiKey, base64Image, mediaType = 'image/jpeg') {
  if (!apiKey) throw new Error('No API key set.')
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You are a nutrition analyst. Estimate macros for food photos. Return JSON: { name, kcal, protein, carbs, fat, confidence: "high"|"medium"|"low", notes }',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: 'Estimate the macros for this meal. Return only valid JSON.' },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0]?.text ?? '{}'
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return { name: 'Unknown meal', kcal: 0, protein: 0, carbs: 0, fat: 0, confidence: 'low', notes: text }
  }
}
