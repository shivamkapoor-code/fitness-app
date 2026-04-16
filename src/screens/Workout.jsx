import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, RefreshCw, Plus, Trash2, ArrowUpDown, Loader2, CheckCircle2, AlertTriangle, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Modal } from '../components/Modal'
import { RestTimer } from '../components/RestTimer'
import { WORKOUT_SPLIT } from '../data/workouts'
import { EXERCISE_CUES } from '../data/exercises'
import { calcProgressiveOverload } from '../utils/progressiveOverload'
import { getAIInsight } from '../ai/claude'
import { showToast } from '../utils/toast'

const RPE_OPTIONS = [6, 7, 8, 9, 10]
const RPE_LABELS = { 6: 'Easy', 7: 'Moderate', 8: 'Hard', 9: 'Very Hard', 10: 'Max' }

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

function ExerciseCard({ exercise, workoutLog, today, logSet, removeSet, state, isCore = false }) {
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
    if (!state.apiKey) { showToast('Add API key in Settings', 'warn'); return }
    setLoadingReplace(true)
    try {
      const text = await getAIInsight(
        state.apiKey,
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
            {!isCore && (
              <button onClick={() => { setShowReplace(true); if (!replacement) getAIReplacement() }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 text-xs font-medium">
                <RefreshCw size={12} /> Replace
              </button>
            )}
          </div>
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

export function Workout({ state, logSet, removeSet, advanceQueue, swapQueueDay, today }) {
  const [showSwap, setShowSwap] = useState(false)
  const [showWarmup, setShowWarmup] = useState(false)

  const queue = state.workoutQueue
  const stiffness = state.morningStiffness[today] ?? null
  const currentDayIdx = queue.seq[queue.idx]
  const workout = WORKOUT_SPLIT[currentDayIdx]

  // Next 4 in queue
  const nextQueue = [0, 1, 2, 3].map((offset) => {
    const idx = (queue.idx + offset) % queue.seq.length
    return { offset, day: WORKOUT_SPLIT[queue.seq[idx]], idx }
  })

  function markComplete() {
    advanceQueue()
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
      {workout.exercises?.length === 0 && !workout.mobility && (
        <div className="bg-slate-800 rounded-2xl p-6 text-center space-y-2">
          <div className="text-4xl">😴</div>
          <div className="font-heading text-lg font-bold text-white">Rest Day</div>
          {workout.note && <p className="text-slate-400 text-sm">{workout.note}</p>}
        </div>
      )}

      {/* Main exercises */}
      {workout.exercises?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Main Exercises</h3>
          {workout.exercises.map((ex) => (
            <ExerciseCard
              key={ex.name}
              exercise={ex}
              workoutLog={state.workoutLog}
              today={today}
              logSet={logSet}
              removeSet={removeSet}
              state={state}
            />
          ))}
        </div>
      )}

      {/* Core */}
      {workout.core?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-purple-400 uppercase tracking-widest">Core & Stability</h3>
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
            Cardio {workout.cardio.type === 'mandatory' ? '(MANDATORY)' : workout.cardio.type === 'optional' ? '(Optional)' : '(Conditional)'}
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
