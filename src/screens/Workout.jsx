import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, RefreshCw, Plus, Trash2, ArrowUpDown, Loader2, CheckCircle2, AlertTriangle, ExternalLink, TrendingUp, TrendingDown, Minus, Utensils } from 'lucide-react'
import { Modal } from '../components/Modal'
import { RestTimer } from '../components/RestTimer'
import { WORKOUT_SPLIT } from '../data/workouts'
import { MEALS } from '../data/meals'
import { EXERCISE_CUES } from '../data/exercises'
import { calcProgressiveOverload } from '../utils/progressiveOverload'
import { getAIInsight } from '../ai/claude'
import { showToast } from '../utils/toast'
import { getSessionStats, getWorkoutByDay } from '../utils/trainingInsights'

const RPE_OPTIONS = [6, 7, 8, 9, 10]
const RPE_LABELS = { 6: 'Easy', 7: 'Moderate', 8: 'Hard', 9: 'Very Hard', 10: 'Max' }
const MEAL_BY_ID = Object.fromEntries(Object.values(MEALS).flat().map((meal) => [meal.id, meal]))

function getFormVideoUrl(exerciseName, cues) {
  return cues?.youtubeUrl ?? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} gym form tutorial`)}`
}

function getWorkoutMeals(workout) {
  const plan = workout.mealPlan ?? {}
  return ['breakfast', 'lunch', 'dinner', 'snack']
    .flatMap((slot) => (plan[slot] ?? []).map((id) => ({ slot, meal: MEAL_BY_ID[id] })))
    .filter((entry) => entry.meal)
}

function sumMeals(entries) {
  return entries.reduce(
    (acc, { meal }) => ({
      kcal: acc.kcal + (meal.kcal ?? 0),
      protein: acc.protein + (meal.protein ?? 0),
      carbs: acc.carbs + (meal.carbs ?? 0),
      fat: acc.fat + (meal.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

function TagBadge({ tag }) {
  const colors = {
    compound: 'bg-blue-500/20 text-blue-300',
    isolation: 'bg-purple-500/20 text-purple-300',
  }
  return <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${colors[tag] ?? 'bg-slate-700 text-slate-400'}`}>{tag}</span>
}

function RecommendationBadge({ rec }) {
  if (rec === 'INCREASE') return <span className="flex items-center gap-0.5 text-emerald-400 text-[10px] font-medium"><TrendingUp size={10} />Increase</span>
  if (rec === 'MAINTAIN') return <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-medium"><Minus size={10} />Maintain</span>
  if (rec === 'DECREASE') return <span className="flex items-center gap-0.5 text-red-400 text-[10px] font-medium"><TrendingDown size={10} />Decrease</span>
  return null
}

function ExerciseCard({ exercise, workoutLog, today, logSet, removeSet, state, isCore = false, onDeleteExercise }) {
  const [expanded, setExpanded] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState(8)
  const [showForm, setShowForm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [replacement, setReplacement] = useState('')
  const [loadingReplace, setLoadingReplace] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [timerSecs, setTimerSecs] = useState(90)

  const todaySets = workoutLog[today]?.[exercise.name] ?? []
  const overload = calcProgressiveOverload(workoutLog, exercise.name)
  const cues = EXERCISE_CUES[exercise.name]
  const formVideoUrl = getFormVideoUrl(exercise.name, cues)

  function addSet() {
    if (!weight || !reps) { showToast('Enter weight and reps', 'warn'); return }
    logSet(today, exercise.name, { weight: parseFloat(weight), reps: parseInt(reps), rpe })
    showToast(`${exercise.name}: ${weight}lbs × ${reps} @ RPE ${rpe}`)
    setTimerSecs(exercise.rest ?? 90)
    setShowTimer(true)
    setWeight('')
    setReps('')
  }

  async function getAIReplacement() {
    setLoadingReplace(true)
    try {
      const text = await getAIInsight(
        `I need to replace "${exercise.name}" today. Consider my L5-S1 disc injury, piriformis syndrome, and the gym equipment available at LA Fitness Hurontario. Suggest ONE alternative exercise that hits the same muscle group safely. Give the exercise name and brief reasoning in 2 sentences.`,
        state,
        today
      )
      setReplacement(text)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoadingReplace(false)
    }
  }

  const cardBg = isCore ? 'bg-purple-900/30 border border-purple-800/50' : 'bg-slate-800'

  return (
    <div className={`rounded-2xl overflow-hidden ${cardBg}`}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading text-sm font-semibold text-white">{exercise.name}</span>
              {exercise.tag && <TagBadge tag={exercise.tag} />}
              {todaySets.length > 0 && (
                <span className="text-emerald-400 text-[10px] font-medium">{todaySets.length} sets logged</span>
              )}
            </div>
            <div className="text-slate-500 text-xs mt-0.5">{exercise.sets}×{exercise.repsRange}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overload.recommendation && overload.recommendation !== 'START' && (
            <RecommendationBadge rec={overload.recommendation} />
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50">
          {/* Progressive overload suggestion */}
          {overload.lastWeight != null && (
            <div className="bg-slate-700/50 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">Last session: <span className="text-white font-medium">{overload.lastWeight} lbs</span></span>
                <span className="text-slate-400 text-xs">Suggested: <span className="text-emerald-400 font-bold">{overload.suggestedWeight} lbs</span></span>
              </div>
              <p className="text-slate-500 text-[10px]">{overload.reasoning}</p>
            </div>
          )}
          {overload.recommendation === 'START' && (
            <div className="bg-slate-700/50 rounded-xl p-3">
              <p className="text-slate-400 text-xs">{overload.reasoning}</p>
            </div>
          )}

          {/* Logger */}
          {!isCore && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                    placeholder={overload.suggestedWeight ? `${overload.suggestedWeight} lbs` : 'Weight (lbs)'}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex-1">
                  <input type="number" value={reps} onChange={(e) => setReps(e.target.value)}
                    placeholder={exercise.repsRange ?? 'Reps'}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              {/* RPE selector */}
              <div className="flex gap-1.5">
                {RPE_OPTIONS.map((r) => (
                  <button key={r} onClick={() => setRpe(r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-heading transition-colors ${rpe === r ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {r}
                    <div className="text-[8px] font-normal opacity-70">{RPE_LABELS[r]}</div>
                  </button>
                ))}
              </div>
              <button onClick={addSet} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 font-heading font-semibold text-sm flex items-center justify-center gap-2">
                <Plus size={16} /> Log Set
              </button>
            </>
          )}

          {isCore && (
            <div className="flex gap-2">
              <div className="flex-1">
                <input type="number" value={reps} onChange={(e) => setReps(e.target.value)}
                  placeholder={exercise.repsRange ?? 'Reps/Time'}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <button onClick={() => { if (!reps) { showToast('Enter reps/time', 'warn'); return }; logSet(today, exercise.name, { weight: 0, reps: reps, rpe }); showToast(`${exercise.name} logged`); setReps('') }}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 font-heading font-semibold text-sm">
                Log
              </button>
            </div>
          )}

          {/* Rest timer */}
          {showTimer && (
            <RestTimer seconds={timerSecs} onDone={() => setShowTimer(false)} />
          )}

          {/* Logged sets */}
          {todaySets.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-slate-400 text-xs font-medium">Today's sets:</div>
              {todaySets.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                  <span className="text-slate-500 text-xs w-4">{idx + 1}</span>
                  <span className="text-white text-xs flex-1">
                    {s.weight > 0 ? `${s.weight} lbs` : ''} × {s.reps}
                    {s.weight === 0 ? ` reps` : ` reps`}
                    {s.rpe && <span className="text-slate-400"> @ RPE {s.rpe}</span>}
                  </span>
                  <button onClick={() => removeSet(today, exercise.name, idx)} className="text-slate-600 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {cues && (
              <button onClick={() => setShowForm(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 text-xs font-medium">
                <Info size={12} /> Form
              </button>
            )}
            <a href={formVideoUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 text-xs font-medium">
              <ExternalLink size={12} /> Video
            </a>
            {!isCore && (
              <button onClick={() => { setShowReplace(true); if (!replacement) getAIReplacement() }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 text-xs font-medium">
                <RefreshCw size={12} /> Replace
              </button>
            )}
          </div>
          {exercise.custom && (
            <button onClick={onDeleteExercise}
              className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl py-2 text-xs font-medium">
              <Trash2 size={12} /> Delete Custom Exercise
            </button>
          )}
          {exercise.conditional && (
            <div className="flex gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
              <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">{exercise.conditional}</p>
            </div>
          )}
          {exercise.note && (
            <p className="text-slate-500 text-xs italic">{exercise.note}</p>
          )}
        </div>
      )}

      {/* Form cues modal */}
      {cues && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title={exercise.name} fullScreen>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="font-heading text-xs font-semibold text-slate-400 uppercase tracking-widest">Execution Cues</h3>
              {cues.cues.map((c, i) => (
                <div key={i} className="flex gap-2 bg-slate-700/50 rounded-xl p-3">
                  <span className="text-emerald-400 font-bold text-xs w-4">{i + 1}</span>
                  <span className="text-slate-200 text-sm">{c}</span>
                </div>
              ))}
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <div className="text-xs text-emerald-400 font-semibold mb-1">What you should feel</div>
              <p className="text-slate-300 text-sm">{cues.feel}</p>
            </div>
            {cues.flags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-heading text-xs font-semibold text-slate-400 uppercase tracking-widest">Red Flags (Stop Immediately)</h3>
                {cues.flags.map((f, i) => (
                  <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-300 text-xs">{f}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <div className="text-xs text-blue-400 font-semibold mb-1">Shivam's Note</div>
              <p className="text-slate-300 text-sm">{cues.shivamNote}</p>
            </div>
            {cues.youtubeUrl && (
              <a href={cues.youtubeUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-red-600/20 border border-red-600/30 text-red-400 rounded-xl py-3 text-sm font-medium">
                <ExternalLink size={16} />
                Watch form video on YouTube
              </a>
            )}
          </div>
        </Modal>
      )}

      {/* Replace modal */}
      <Modal open={showReplace} onClose={() => setShowReplace(false)} title={`Replace: ${exercise.name}`}>
        <div className="p-4 space-y-3">
          {loadingReplace ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Finding safe alternative...</span>
            </div>
          ) : replacement ? (
            <div className="bg-slate-700/50 rounded-xl p-4">
              <p className="text-slate-200 text-sm leading-relaxed">{replacement}</p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Add your API key in Settings to get AI exercise replacements.</p>
          )}
          <button onClick={() => { setShowReplace(false); setReplacement('') }}
            className="w-full bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-medium">
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}

function ReadinessCard({ state, workout, today }) {
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(false)

  const stiffness = state.morningStiffness[today] ?? null

  // Inline inflam score calc to avoid circular import
  const todayInflam = (() => {
    const inf = state.inflam[today]
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
  })()

  // Last session summary for this workout type
  const recentSets = Object.entries(state.workoutLog)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3)
    .map(([date, exercises]) => {
      const totalSets = Object.values(exercises).reduce((a, s) => a + s.length, 0)
      return `${date}: ${totalSets} sets`
    })

  const VERDICT_STYLE = {
    PUSH:      { bg: 'bg-emerald-500/15 border-emerald-500/40', badge: 'bg-emerald-500 text-white', icon: '🚀' },
    MAINTAIN:  { bg: 'bg-amber-500/15 border-amber-500/40',   badge: 'bg-amber-500 text-white',   icon: '✅' },
    BACK_OFF:  { bg: 'bg-red-500/15 border-red-500/40',       badge: 'bg-red-500 text-white',      icon: '⚠️' },
  }

  async function getAssessment() {
    setLoading(true)
    try {
      const context = `
Today's workout: ${workout.name}
Morning stiffness: ${stiffness !== null ? stiffness + '/5' : 'not logged'}
Today's inflammation score: ${todayInflam !== null ? todayInflam.toFixed(1) + '/5' : 'not logged'}
Recent session history: ${recentSets.length > 0 ? recentSets.join(', ') : 'no recent sessions'}
`
      const prompt = `Pre-session readiness assessment.

${context}

Based on this data, give me a readiness verdict and brief guidance. Your response MUST start with exactly one of these three words on the first line: PUSH, MAINTAIN, or BACK_OFF. Then on the next lines, give 2-3 sentences of specific guidance for today's session considering my L5-S1 condition and inflammation level. Be direct and actionable.`

      const text = await getAIInsight(prompt, state, today)

      // Parse verdict from first line
      const lines = text.trim().split('\n')
      const firstWord = lines[0].trim().toUpperCase().replace(/[^A-Z_]/g, '')
      const verdict = ['PUSH', 'MAINTAIN', 'BACK_OFF'].includes(firstWord) ? firstWord : 'MAINTAIN'
      const guidance = lines.slice(1).join('\n').trim() || text

      setAssessment({ verdict, guidance })
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const style = assessment ? VERDICT_STYLE[assessment.verdict] : null

  return (
    <div className={`rounded-2xl p-4 border space-y-3 transition-all ${style ? style.bg : 'bg-slate-800 border-slate-700'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{style?.icon ?? '🧠'}</span>
          <h3 className="font-heading text-sm font-semibold text-white uppercase tracking-widest">Readiness Assessment</h3>
        </div>
        <button
          onClick={getAssessment}
          disabled={loading}
          className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? 'Assessing...' : assessment ? 'Refresh' : 'Assess'}
        </button>
      </div>

      {/* Input signals */}
      <div className="flex gap-2 flex-wrap">
        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${stiffness === null ? 'bg-slate-700 text-slate-400' : stiffness >= 4 ? 'bg-red-500/20 text-red-300' : stiffness >= 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
          Stiffness: {stiffness !== null ? `${stiffness}/5` : '—'}
        </span>
        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${todayInflam === null ? 'bg-slate-700 text-slate-400' : todayInflam >= 4 ? 'bg-red-500/20 text-red-300' : todayInflam >= 2.5 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
          Inflammation: {todayInflam !== null ? `${todayInflam.toFixed(1)}/5` : '—'}
        </span>
        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-700 text-slate-400 font-medium">
          Sessions: {recentSets.length > 0 ? recentSets.length + ' recent' : 'no data'}
        </span>
      </div>

      {/* Verdict */}
      {assessment ? (
        <div className="space-y-2">
          <span className={`inline-block text-xs font-bold font-heading px-3 py-1 rounded-full tracking-wider ${style.badge}`}>
            {assessment.verdict.replace('_', ' ')}
          </span>
          <p className="text-slate-200 text-sm leading-relaxed">{assessment.guidance}</p>
        </div>
      ) : (
        <p className="text-slate-500 text-xs italic">Tap Assess to get a push/maintain/back-off verdict based on your stiffness, inflammation, and recent sessions.</p>
      )}
    </div>
  )
}

function DayPlanCard({ workout, today, addMeal }) {
  const mealEntries = getWorkoutMeals(workout)
  const totals = sumMeals(mealEntries)
  const targets = workout.dailyTargets

  function addRecommendedMeal(meal) {
    addMeal(today, {
      ...meal,
      sourceId: meal.id,
      id: `workout_rec_${meal.id}`,
    })
    showToast(`${meal.name} added`)
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm font-semibold text-white uppercase tracking-widest">Today's Plan</h3>
            <p className="text-slate-400 text-xs mt-1">{workout.goal}</p>
          </div>
          <span className="rounded-xl bg-emerald-500/15 px-3 py-1 text-emerald-300 text-xs font-heading font-semibold whitespace-nowrap">
            {workout.duration}
          </span>
        </div>
      </div>

      {targets && (
        <div className="grid grid-cols-5 gap-1.5">
          {[
            ['kcal', targets.kcal],
            ['P', `${targets.protein}g`],
            ['C', `${targets.carbs}g`],
            ['F', `${targets.fat}g`],
            ['steps', targets.steps],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-700/70 p-2 text-center">
              <div className="font-heading text-xs font-bold text-white">{value}</div>
              <div className="text-slate-500 text-[9px] uppercase">{label}</div>
            </div>
          ))}
        </div>
      )}

      {mealEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils size={15} className="text-emerald-400" />
              <div>
                <div className="font-heading text-xs font-semibold text-emerald-300 uppercase tracking-widest">{workout.mealPlan.title}</div>
                <div className="text-slate-500 text-[10px]">{totals.kcal} kcal · {totals.protein}g P · {totals.carbs}g C · {totals.fat}g F</div>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-xs">{workout.mealPlan.note}</p>
          <div className="space-y-2">
            {mealEntries.map(({ slot, meal }) => (
              <div key={`${slot}-${meal.id}`} className="flex items-center gap-2 rounded-xl bg-slate-700/60 p-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-heading">{slot}</div>
                  <div className="text-white text-xs font-medium truncate">{meal.name}</div>
                  <div className="text-slate-400 text-[10px]">{meal.kcal} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F</div>
                </div>
                <button onClick={() => addRecommendedMeal(meal)}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-white text-xs font-medium">
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CompletedSession({ state, today, completion, onNavigate }) {
  const completedWorkout = getWorkoutByDay(completion.day)
  const nextWorkout = WORKOUT_SPLIT[state.workoutQueue.seq[state.workoutQueue.idx]]
  const stats = getSessionStats(state, today, completedWorkout)

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="mt-1 shrink-0 text-emerald-300" />
          <div>
            <div className="font-heading text-xs font-semibold uppercase tracking-widest text-emerald-300">Session Complete</div>
            <h1 className="mt-1 font-heading text-3xl font-bold leading-none text-white">{completedWorkout.name}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Logged and locked for today. The queue is advanced, but Home will not ask you to train twice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-950/50 p-3 text-center">
            <div className="font-heading text-xl font-bold text-white">{stats.totalSets}</div>
            <div className="text-[10px] text-slate-500">sets</div>
          </div>
          <div className="rounded-xl bg-slate-950/50 p-3 text-center">
            <div className="font-heading text-xl font-bold text-white">{stats.loggedExercises}/{stats.plannedExerciseCount}</div>
            <div className="text-[10px] text-slate-500">movements</div>
          </div>
          <div className="rounded-xl bg-slate-950/50 p-3 text-center">
            <div className="font-heading text-xl font-bold text-white">{nextWorkout.shortName}</div>
            <div className="text-[10px] text-slate-500">next</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onNavigate('dashboard')} className="btn-primary rounded-xl py-3 text-sm">
            Home
          </button>
          <button onClick={() => onNavigate('nutrition')} className="btn-ghost rounded-xl py-3 text-sm font-heading font-semibold uppercase tracking-wider">
            Log Food
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-800 p-4">
        <div className="font-heading text-sm font-semibold uppercase tracking-widest text-slate-400">Next Recommendation</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Next up is {nextWorkout.name}. Use tomorrow’s stiffness check before deciding whether to push, maintain, or modify it.
        </p>
      </div>
    </div>
  )
}

function SessionGuide({ workout, allExercises, state, today }) {
  const plannedExercises = [...allExercises, ...(workout.core ?? [])]
  const stats = getSessionStats(state, today, { ...workout, exercises: allExercises })
  const nextExercise = plannedExercises.find((exercise) => (state.workoutLog[today]?.[exercise.name] ?? []).length === 0)
  const progressLabel = stats.plannedExerciseCount > 0
    ? `${stats.loggedExercises}/${stats.plannedExerciseCount} movements`
    : workout.cardio?.desc ?? 'Recovery day'

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-heading text-xs font-semibold uppercase tracking-widest text-emerald-300">Guided Session</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {nextExercise
              ? `Next: ${nextExercise.name}. Log the first working set, then rest ${nextExercise.rest ?? 90}s.`
              : stats.totalSets > 0
                ? 'All planned movements have logged work. Review your sets, then mark the workout done.'
                : 'Use this as a recovery session. Follow the mobility/cardio plan and mark done when complete.'}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-slate-950/40 px-2.5 py-1 text-xs font-heading font-semibold text-white">
          {progressLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-900/70">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${stats.percentComplete}%` }}
        />
      </div>
    </div>
  )
}

export function Workout({ state, logSet, removeSet, advanceQueue, swapQueueDay, today, addMeal, addCustomItem, removeCustomItem, onNavigate }) {
  const [showSwap, setShowSwap] = useState(false)
  const [showWarmup, setShowWarmup] = useState(false)
  const [exerciseForm, setExerciseForm] = useState({ name: '', sets: '', repsRange: '', rest: '' })

  const queue = state.workoutQueue
  const completion = state.workoutCompletions?.[today] ?? null
  const stiffness = state.morningStiffness[today] ?? null

  if (completion) {
    return <CompletedSession state={state} today={today} completion={completion} onNavigate={onNavigate} />
  }

  const currentDayIdx = queue.seq[queue.idx]
  const workout = WORKOUT_SPLIT[currentDayIdx]
  const workoutKey = String(workout.day)
  const customExercises = state.customItems?.workoutExercises?.[workoutKey] ?? []
  const allExercises = [...(workout.exercises ?? []), ...customExercises]

  function addCustomExercise() {
    if (!exerciseForm.name.trim()) { showToast('Enter an exercise name', 'warn'); return }
    addCustomItem('workoutExercises', {
      name: exerciseForm.name.trim(),
      tag: 'custom',
      sets: parseInt(exerciseForm.sets) || 3,
      repsRange: exerciseForm.repsRange.trim() || '8-12',
      rest: parseInt(exerciseForm.rest) || 90,
      custom: true,
    }, workoutKey)
    setExerciseForm({ name: '', sets: '', repsRange: '', rest: '' })
    showToast('Custom exercise added')
  }

  // Next 4 in queue
  const nextQueue = [0, 1, 2, 3].map((offset) => {
    const idx = (queue.idx + offset) % queue.seq.length
    return { offset, day: WORKOUT_SPLIT[queue.seq[idx]], idx }
  })

  function markComplete() {
    advanceQueue(today, workout.day)
    showToast(`${workout.name} complete! Queue advanced.`)
  }

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white tracking-wide">{workout.name}</h1>
        <button onClick={markComplete} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-3 py-2 text-xs font-semibold">
          <CheckCircle2 size={14} />
          Done
        </button>
      </div>

      {/* Pre-session readiness assessment */}
      <ReadinessCard state={state} workout={workout} today={today} />

      <DayPlanCard workout={workout} today={today} addMeal={addMeal} />
      <SessionGuide workout={workout} allExercises={allExercises} state={state} today={today} />

      {/* Stiffness alert */}
      {stiffness >= 4 && (
        <div className="flex gap-2 bg-red-500/15 border border-red-500/30 rounded-xl p-3">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs">Stiffness {stiffness}/5: Skip Hack Squat → Leg Press. Skip Ab Wheel. 15 min extended warm-up.</p>
        </div>
      )}

      {/* L5-S1 banner */}
      <div className="flex gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-amber-300 text-[11px]">L5-S1: No spinal flexion under load · Piriformis: Feet shoulder-width only · Sciatica: Burning = stop immediately</p>
      </div>

      {/* Queue display */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Workout Queue</h3>
          <button onClick={() => setShowSwap(true)} className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <ArrowUpDown size={12} /> Swap
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {nextQueue.map(({ offset, day }) => (
            <div key={offset} className={`flex-shrink-0 rounded-xl px-3 py-2 text-center min-w-[72px] ${offset === 0 ? 'bg-emerald-600' : 'bg-slate-700'}`}>
              <div className={`font-heading text-xs font-bold ${offset === 0 ? 'text-white' : 'text-slate-300'}`}>{day.shortName}</div>
              <div className={`text-[9px] mt-0.5 ${offset === 0 ? 'text-emerald-200' : 'text-slate-500'}`}>{offset === 0 ? 'Today' : `+${offset}`}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Warm-up */}
      {workout.warmup?.length > 0 && (
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          <button onClick={() => setShowWarmup(!showWarmup)} className="w-full flex items-center justify-between p-4">
            <span className="font-heading text-sm font-semibold text-amber-400 uppercase tracking-widest">Warm-Up Protocol</span>
            {showWarmup ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showWarmup && (
            <div className="px-4 pb-4 space-y-2 border-t border-slate-700">
              {workout.warmup.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-amber-400 font-bold text-xs w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-slate-300 text-xs">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobility (Recovery day) */}
      {workout.mobility?.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <h3 className="font-heading text-sm font-semibold text-purple-400 uppercase tracking-widest">Mobility Protocol</h3>
          {workout.mobility.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-purple-400 font-bold text-xs w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-slate-300 text-xs">{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rest day */}
      {allExercises.length === 0 && !workout.mobility && (
        <div className="bg-slate-800 rounded-2xl p-6 text-center space-y-2">
          <div className="text-4xl">😴</div>
          <div className="font-heading text-lg font-bold text-white">Rest Day</div>
          {workout.note && <p className="text-slate-400 text-sm">{workout.note}</p>}
        </div>
      )}

      {/* Main exercises */}
      {allExercises.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Main Exercises</h3>
          {allExercises.map((ex) => (
            <ExerciseCard
              key={ex.name}
              exercise={ex}
              workoutLog={state.workoutLog}
              today={today}
              logSet={logSet}
              removeSet={removeSet}
              state={state}
              onDeleteExercise={ex.custom ? () => { removeCustomItem('workoutExercises', ex.id, workoutKey); showToast('Custom exercise deleted') } : undefined}
            />
          ))}
          <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-slate-400 text-[10px] uppercase tracking-widest font-heading">Add Custom Exercise</div>
            <input value={exerciseForm.name} onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
              placeholder="Exercise name" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={exerciseForm.sets} onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })}
                placeholder="sets" className="bg-slate-700 border border-slate-600 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
              <input value={exerciseForm.repsRange} onChange={(e) => setExerciseForm({ ...exerciseForm, repsRange: e.target.value })}
                placeholder="reps" className="bg-slate-700 border border-slate-600 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
              <input type="number" value={exerciseForm.rest} onChange={(e) => setExerciseForm({ ...exerciseForm, rest: e.target.value })}
                placeholder="rest sec" className="bg-slate-700 border border-slate-600 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
            </div>
            <button onClick={addCustomExercise} className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2 text-xs font-heading font-semibold">
              Add Exercise
            </button>
          </div>
        </div>
      )}

      {/* Core */}
      {workout.core?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-purple-400 uppercase tracking-widest">Abs & Core Stability</h3>
          {workout.core.map((ex) => (
            <ExerciseCard
              key={ex.name}
              exercise={ex}
              workoutLog={state.workoutLog}
              today={today}
              logSet={logSet}
              removeSet={removeSet}
              state={state}
              isCore
            />
          ))}
        </div>
      )}

      {/* Cardio */}
      {workout.cardio && (
        <div className={`rounded-2xl p-4 ${workout.cardio.type === 'mandatory' ? 'bg-blue-500/10 border border-blue-500/20' : workout.cardio.type === 'conditional' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800'}`}>
          <div className={`font-heading text-sm font-semibold uppercase tracking-widest mb-1 ${workout.cardio.type === 'mandatory' ? 'text-blue-400' : workout.cardio.type === 'conditional' ? 'text-amber-400' : 'text-slate-400'}`}>
            Cardio {workout.cardio.type === 'mandatory' ? '(Needed Today)' : workout.cardio.type === 'optional' ? '(Optional)' : workout.cardio.type === 'none' ? '(Not Planned)' : '(Conditional)'}
          </div>
          <p className="text-slate-300 text-sm">{workout.cardio.desc}</p>
        </div>
      )}

      {/* Workout note */}
      {workout.note && (
        <div className="bg-slate-800 rounded-2xl p-3">
          <p className="text-slate-400 text-xs">{workout.note}</p>
        </div>
      )}

      {/* Swap modal */}
      <Modal open={showSwap} onClose={() => setShowSwap(false)} title="Reorder Queue">
        <div className="p-4 space-y-2">
          <p className="text-slate-400 text-xs mb-3">Tap two workouts to swap their positions in the queue.</p>
          {queue.seq.map((dayNum, seqIdx) => {
            const w = WORKOUT_SPLIT[dayNum]
            const isToday = seqIdx === queue.idx
            return (
              <button
                key={seqIdx}
                onClick={() => {
                  if (!showSwap) return
                  // Simple: swap current with selected
                  if (seqIdx !== queue.idx) {
                    swapQueueDay(queue.idx, seqIdx)
                    showToast('Queue reordered')
                    setShowSwap(false)
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl ${isToday ? 'bg-emerald-600/20 border border-emerald-600/40' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                <span className={`font-heading text-sm font-bold w-16 ${isToday ? 'text-emerald-400' : 'text-slate-300'}`}>{w.shortName}</span>
                <span className="text-slate-400 text-xs flex-1 text-left">{w.name}</span>
                {isToday && <span className="text-emerald-400 text-[10px]">Current</span>}
              </button>
            )
          })}
          <p className="text-slate-500 text-xs text-center mt-2">Tap any workout to move it to today's position</p>
        </div>
      </Modal>
    </div>
  )
}
