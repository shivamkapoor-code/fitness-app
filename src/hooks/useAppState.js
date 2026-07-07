import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { moveWorkoutToToday } from '../utils/trainingInsights'

const STORAGE_KEY = 'shivam_fitness_v1'

const defaultQueue = { seq: [1, 2, 3, 4, 5, 6, 0], idx: 0, lastDate: null }
const defaultCustomItems = {
  dashboardLevers: [],
  workoutExercises: {},
  meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
  supplements: [],
  inflammationHabits: [],
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getInitialState() {
  const saved = loadState()
  return normaliseState(saved)
}

function normaliseState(saved) {
  return {
    workoutLog: saved?.workoutLog ?? {},
    nutrition: saved?.nutrition ?? {},
    bodyMetrics: saved?.bodyMetrics ?? [],
    renphoEntries: saved?.renphoEntries ?? [],
    suppChecks: saved?.suppChecks ?? {},
    inflam: saved?.inflam ?? {},
    workoutQueue: saved?.workoutQueue ?? defaultQueue,
    workoutCompletions: saved?.workoutCompletions ?? {},
    morningStiffness: saved?.morningStiffness ?? {},
    customItems: {
      ...defaultCustomItems,
      ...(saved?.customItems ?? {}),
      meals: {
        ...defaultCustomItems.meals,
        ...(saved?.customItems?.meals ?? {}),
      },
      workoutExercises: {
        ...defaultCustomItems.workoutExercises,
        ...(saved?.customItems?.workoutExercises ?? {}),
      },
    },
    chatHistory: [],
  }
}

export function useAppState(userId) {
  const [state, setState] = useState(getInitialState)
  const [loading, setLoading] = useState(false)
  const remoteReadyRef = useRef(false)
  const userIdRef = useRef(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const loadRemoteState = useCallback(async (userId) => {
    if (!supabase || !userId) return
    setLoading(true)
    remoteReadyRef.current = false
    userIdRef.current = userId

    const { data, error } = await supabase
      .from('app_state')
      .select('state_json')
      .eq('user_id', userId)
      .maybeSingle()

    if (userIdRef.current !== userId) return

    if (error) {
      console.error('Failed to load app state:', error)
    } else if (data?.state_json) {
      setState(normaliseState(data.state_json))
    } else {
      const persist = { ...stateRef.current }
      delete persist.chatHistory
      const { error: saveError } = await supabase
        .from('app_state')
        .upsert({
          user_id: userId,
          state_json: persist,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (saveError) console.error('Failed to initialise app state:', saveError)
    }

    remoteReadyRef.current = true
    setLoading(false)
  }, [])

  useEffect(() => {
    if (userId) Promise.resolve().then(() => loadRemoteState(userId))
    else {
      userIdRef.current = null
      remoteReadyRef.current = false
    }
  }, [userId, loadRemoteState])

  useEffect(() => {
    return () => {
      userIdRef.current = null
      remoteReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    const persist = { ...state }
    delete persist.chatHistory
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist))
    if (!supabase || !userIdRef.current || !remoteReadyRef.current) return undefined

    const timeout = setTimeout(async () => {
      const { error } = await supabase
        .from('app_state')
        .upsert({
          user_id: userIdRef.current,
          state_json: persist,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) console.error('Failed to save app state:', error)
    }, 500)

    return () => clearTimeout(timeout)
  }, [state])

  const update = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  // Workout log helpers
  const logSet = useCallback((date, exerciseName, setData) => {
    setState((prev) => {
      const dayLog = prev.workoutLog[date] ?? {}
      const exSets = dayLog[exerciseName] ?? []
      return {
        ...prev,
        workoutLog: {
          ...prev.workoutLog,
          [date]: {
            ...dayLog,
            [exerciseName]: [...exSets, { ...setData, time: Date.now() }],
          },
        },
      }
    })
  }, [])

  const removeSet = useCallback((date, exerciseName, idx) => {
    setState((prev) => {
      const dayLog = prev.workoutLog[date] ?? {}
      const exSets = [...(dayLog[exerciseName] ?? [])]
      exSets.splice(idx, 1)
      return {
        ...prev,
        workoutLog: {
          ...prev.workoutLog,
          [date]: { ...dayLog, [exerciseName]: exSets },
        },
      }
    })
  }, [])

  // Nutrition helpers
  const addMeal = useCallback((date, meal) => {
    setState((prev) => {
      const dayNutrition = prev.nutrition[date] ?? { meals: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } }
      const newMeal = { ...meal, id: `${meal.id ?? 'custom'}_${Date.now()}`, loggedAt: Date.now() }
      const meals = [...dayNutrition.meals, newMeal]
      const totals = meals.reduce(
        (acc, m) => ({
          kcal: acc.kcal + (m.kcal ?? 0),
          protein: acc.protein + (m.protein ?? 0),
          carbs: acc.carbs + (m.carbs ?? 0),
          fat: acc.fat + (m.fat ?? 0),
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      )
      return {
        ...prev,
        nutrition: { ...prev.nutrition, [date]: { meals, totals } },
      }
    })
  }, [])

  const removeMeal = useCallback((date, mealLogId) => {
    setState((prev) => {
      const dayNutrition = prev.nutrition[date] ?? { meals: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } }
      const meals = dayNutrition.meals.filter((m) => m.id !== mealLogId)
      const totals = meals.reduce(
        (acc, m) => ({
          kcal: acc.kcal + (m.kcal ?? 0),
          protein: acc.protein + (m.protein ?? 0),
          carbs: acc.carbs + (m.carbs ?? 0),
          fat: acc.fat + (m.fat ?? 0),
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      )
      return {
        ...prev,
        nutrition: { ...prev.nutrition, [date]: { meals, totals } },
      }
    })
  }, [])

  // Body metrics
  const addBodyMetric = useCallback((entry) => {
    setState((prev) => {
      const existing = prev.bodyMetrics.filter((e) => e.date !== entry.date)
      const sorted = [...existing, { ...entry, recordedAt: Date.now() }].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
      return { ...prev, bodyMetrics: sorted }
    })
  }, [])

  const removeBodyMetric = useCallback((date) => {
    setState((prev) => ({
      ...prev,
      bodyMetrics: prev.bodyMetrics.filter((entry) => entry.date !== date),
      renphoEntries: prev.renphoEntries.filter((entry) => entry.date !== date),
    }))
  }, [])

  const addRenphoEntries = useCallback((entries) => {
    setState((prev) => {
      const byDate = new Map(prev.renphoEntries.map((entry) => [entry.date, entry]))
      entries.forEach((entry) => byDate.set(entry.date, { ...entry, importedAt: Date.now() }))
      const renphoEntries = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))

      const metricByDate = new Map(prev.bodyMetrics.map((entry) => [entry.date, entry]))
      entries.forEach((entry) => {
        metricByDate.set(entry.date, {
          ...metricByDate.get(entry.date),
          date: entry.date,
          weight: entry.weight_lbs,
          bodyFat: entry.body_fat_pct,
          visceralFat: entry.visceral_fat,
          muscleMass: entry.muscle_mass_lbs,
          bmr: entry.bmr,
          metabolicAge: entry.metabolic_age,
          recordedAt: Date.now(),
        })
      })

      return {
        ...prev,
        renphoEntries,
        bodyMetrics: [...metricByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      }
    })
  }, [])

  // Supplement checks
  const toggleSupp = useCallback((date, suppId) => {
    setState((prev) => {
      const dayChecks = prev.suppChecks[date] ?? {}
      return {
        ...prev,
        suppChecks: {
          ...prev.suppChecks,
          [date]: { ...dayChecks, [suppId]: !dayChecks[suppId] },
        },
      }
    })
  }, [])

  const addCustomItem = useCallback((group, item, subGroup = null) => {
    setState((prev) => {
      const customItems = prev.customItems ?? defaultCustomItems
      const newItem = { ...item, id: item.id ?? `custom_${Date.now()}` }

      if (group === 'meals' && subGroup) {
        return {
          ...prev,
          customItems: {
            ...customItems,
            meals: {
              ...customItems.meals,
              [subGroup]: [...(customItems.meals?.[subGroup] ?? []), newItem],
            },
          },
        }
      }

      if (group === 'workoutExercises' && subGroup) {
        return {
          ...prev,
          customItems: {
            ...customItems,
            workoutExercises: {
              ...customItems.workoutExercises,
              [subGroup]: [...(customItems.workoutExercises?.[subGroup] ?? []), newItem],
            },
          },
        }
      }

      return {
        ...prev,
        customItems: {
          ...customItems,
          [group]: [...(customItems[group] ?? []), newItem],
        },
      }
    })
  }, [])

  const removeCustomItem = useCallback((group, itemId, subGroup = null) => {
    setState((prev) => {
      const customItems = prev.customItems ?? defaultCustomItems

      if (group === 'meals' && subGroup) {
        return {
          ...prev,
          customItems: {
            ...customItems,
            meals: {
              ...customItems.meals,
              [subGroup]: (customItems.meals?.[subGroup] ?? []).filter((item) => item.id !== itemId),
            },
          },
        }
      }

      if (group === 'workoutExercises' && subGroup) {
        return {
          ...prev,
          customItems: {
            ...customItems,
            workoutExercises: {
              ...customItems.workoutExercises,
              [subGroup]: (customItems.workoutExercises?.[subGroup] ?? []).filter((item) => item.id !== itemId),
            },
          },
        }
      }

      return {
        ...prev,
        customItems: {
          ...customItems,
          [group]: (customItems[group] ?? []).filter((item) => item.id !== itemId),
        },
      }
    })
  }, [])

  // Inflammation
  const saveInflam = useCallback((date, data) => {
    setState((prev) => ({
      ...prev,
      inflam: { ...prev.inflam, [date]: { ...(prev.inflam[date] ?? {}), ...data } },
    }))
  }, [])

  // Morning stiffness
  const setStiffness = useCallback((date, value) => {
    setState((prev) => ({
      ...prev,
      morningStiffness: { ...prev.morningStiffness, [date]: value },
    }))
  }, [])

  // Queue operations
  const advanceQueue = useCallback((date = today, workoutDay = null) => {
    setState((prev) => {
      const q = prev.workoutQueue
      const completedDay = workoutDay ?? q.seq[q.idx]
      const alreadyCompleted = Boolean(prev.workoutCompletions?.[date])
      const nextIdx = alreadyCompleted ? q.idx : (q.idx + 1) % q.seq.length
      return {
        ...prev,
        workoutCompletions: {
          ...(prev.workoutCompletions ?? {}),
          [date]: {
            day: completedDay,
            completedAt: prev.workoutCompletions?.[date]?.completedAt ?? Date.now(),
          },
        },
        workoutQueue: { ...q, idx: nextIdx, lastDate: date },
      }
    })
  }, [today])

  const swapQueueDay = useCallback((fromIdx, toIdx) => {
    setState((prev) => {
      if (fromIdx === toIdx) return prev
      return { ...prev, workoutQueue: moveWorkoutToToday(prev.workoutQueue, toIdx) }
    })
  }, [])

  const clearWorkoutCompletion = useCallback((date) => {
    setState((prev) => {
      const completion = prev.workoutCompletions?.[date]
      if (!completion) return prev

      const nextCompletions = { ...(prev.workoutCompletions ?? {}) }
      delete nextCompletions[date]

      const completedIdx = prev.workoutQueue.seq.indexOf(completion.day)

      return {
        ...prev,
        workoutCompletions: nextCompletions,
        workoutQueue: completedIdx >= 0
          ? { ...prev.workoutQueue, idx: completedIdx, lastDate: null }
          : prev.workoutQueue,
      }
    })
  }, [])

  // Chat
  const addChatMessage = useCallback((msg) => {
    setState((prev) => ({ ...prev, chatHistory: [...prev.chatHistory, msg] }))
  }, [])

  return {
    state,
    loading,
    loadRemoteState,
    update,
    today,
    logSet,
    removeSet,
    addMeal,
    removeMeal,
    addBodyMetric,
    removeBodyMetric,
    addRenphoEntries,
    toggleSupp,
    addCustomItem,
    removeCustomItem,
    saveInflam,
    setStiffness,
    advanceQueue,
    swapQueueDay,
    clearWorkoutCompletion,
    addChatMessage,
  }
}
