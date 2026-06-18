const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SHIVAM_PROFILE = `You are simultaneously an expert nutritionist, bodybuilder, biochemist, and physiotherapist. You are Shivam's personal coach with intimate knowledge of his profile.

SHIVAM'S STATS:
- Current: 192lb, 23.7% body fat, visceral fat 11, metabolic age 36, BMR 1804 kcal
- Targets: 175lb, 15% BF, visceral fat <9, metabolic age <30
- Lean mass: 146.4lb (MUST protect — minimum 144lb)

CRITICAL MEDICAL CONDITIONS:
- L5-S1 disc injury: no spinal flexion under load
- Piriformis syndrome: no hip external rotation under load, no wide stance, no hip abduction machine
- Sciatica: burning/tingling down leg means stop immediately
- Tight hamstrings and glutes: no RDL, no cable pull-through
- Desk job: thoracic stiffness needs daily mobility

REMOVED EXERCISES: DB RDL, Bulgarian Split Squats, Dips, Hip Abduction Machine, 90/90 Hip Switches, Pigeon Pose, Cable Pull-Through

NUTRITION TARGETS: 2200 kcal, 185g protein, 220g carbs, 62g fat
GOAL: Look muscular and fit, reduce inflammation, improve metabolic age, reach 15% BF preserving lean mass.

Always give specific, actionable advice. Be direct, not generic.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the Edge Function.')

    const body = await req.json()
    const response = body.action === 'photo'
      ? await analyzePhoto(apiKey, body.base64Image, body.mediaType)
      : await chat(apiKey, body.messages, body.context)

    return Response.json(response, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'AI request failed' },
      { status: 400, headers: corsHeaders },
    )
  }
})

async function chat(apiKey: string, messages: Array<{ role: string; content: string }>, context = '') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SHIVAM_PROFILE + (context ? `\n\n${context}` : ''),
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.error?.message ?? `Anthropic API error ${response.status}`)
  }

  const data = await response.json()
  return { text: data.content?.[0]?.text ?? '' }
}

async function analyzePhoto(apiKey: string, base64Image: string, mediaType = 'image/jpeg') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You are a nutrition analyst. Estimate macros for food photos. Return JSON: { "name": string, "kcal": number, "protein": number, "carbs": number, "fat": number, "confidence": "high"|"medium"|"low", "notes": string }',
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
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.error?.message ?? `Anthropic API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return { meal: JSON.parse(jsonMatch ? jsonMatch[0] : text) }
}
