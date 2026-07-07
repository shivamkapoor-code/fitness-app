import test from 'node:test'
import assert from 'node:assert/strict'
import { calcProgressiveOverload } from './progressiveOverload.js'

test('does not increase load when recent RPE is high', () => {
  const workoutLog = {
    '2026-07-01': {
      'Incline DB Press': [
        { weight: 70, reps: 6, rpe: 9 },
        { weight: 70, reps: 5, rpe: 9 },
      ],
    },
    '2026-07-04': {
      'Incline DB Press': [
        { weight: 70, reps: 5, rpe: 9 },
        { weight: 70, reps: 4, rpe: 10 },
      ],
    },
  }

  const result = calcProgressiveOverload(workoutLog, 'Incline DB Press')

  assert.notEqual(result.recommendation, 'INCREASE')
  assert.ok(result.suggestedWeight <= 70)
})

test('increases load when recent weighted work is controlled', () => {
  const workoutLog = {
    '2026-07-01': {
      'Cable Lateral Raise': [
        { weight: 20, reps: 15, rpe: 7 },
        { weight: 20, reps: 14, rpe: 7 },
      ],
    },
    '2026-07-04': {
      'Cable Lateral Raise': [
        { weight: 20, reps: 16, rpe: 7 },
        { weight: 20, reps: 15, rpe: 7 },
      ],
    },
  }

  const result = calcProgressiveOverload(workoutLog, 'Cable Lateral Raise')

  assert.equal(result.recommendation, 'INCREASE')
  assert.equal(result.suggestedWeight, 22.5)
})
