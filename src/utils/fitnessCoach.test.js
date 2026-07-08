import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDailyCoachingSummary, getRecoveryLoadLabel, getWeeklyDates } from './fitnessCoach.js'

const BASE_STATE = {
  workoutLog: {},
  nutrition: {},
  bodyMetrics: [],
  suppChecks: {},
  inflam: {},
  workoutQueue: { seq: [1, 2, 3, 4, 5, 6, 0], idx: 0, lastDate: null },
  workoutCompletions: {},
  morningStiffness: {},
  customItems: {},
}

test('weekly dates are anchored to the provided today value', () => {
  assert.deepEqual(getWeeklyDates('2026-07-08'), [
    '2026-07-02',
    '2026-07-03',
    '2026-07-04',
    '2026-07-05',
    '2026-07-06',
    '2026-07-07',
    '2026-07-08',
  ])
})

test('daily summary asks for readiness before training when no check-in exists', () => {
  const summary = buildDailyCoachingSummary(BASE_STATE, '2026-07-08')

  assert.equal(summary.primary.kind, 'check-in')
  assert.equal(summary.primary.ctaRoute, 'dashboard')
  assert.match(summary.primary.reason, /stiffness/i)
  assert.equal(summary.teamGuidance.recovery.tone, 'slate')
})

test('daily summary shifts to recovery when stiffness is high', () => {
  const state = {
    ...BASE_STATE,
    morningStiffness: { '2026-07-08': 5 },
    inflam: { '2026-07-08': { sleep: 5 } },
  }

  const summary = buildDailyCoachingSummary(state, '2026-07-08')

  assert.equal(summary.primary.kind, 'modify')
  assert.equal(summary.primary.ctaRoute, 'workout')
  assert.match(summary.primary.title, /modify/i)
  assert.equal(summary.teamGuidance.recovery.tone, 'red')
})

test('daily summary prioritizes protein after workout completion', () => {
  const state = {
    ...BASE_STATE,
    workoutCompletions: { '2026-07-08': { day: 1, completedAt: 1 } },
    nutrition: { '2026-07-08': { totals: { kcal: 1100, protein: 80, carbs: 90, fat: 30 }, meals: [] } },
    morningStiffness: { '2026-07-08': 2 },
  }

  const summary = buildDailyCoachingSummary(state, '2026-07-08')

  assert.equal(summary.primary.kind, 'nutrition')
  assert.equal(summary.primary.ctaRoute, 'nutrition')
  assert.match(summary.primary.reason, /protein/i)
})

test('recovery load labels avoid false precision', () => {
  assert.equal(getRecoveryLoadLabel(1.4), 'Low')
  assert.equal(getRecoveryLoadLabel(2.7), 'Moderate')
  assert.equal(getRecoveryLoadLabel(4.2), 'High')
})
