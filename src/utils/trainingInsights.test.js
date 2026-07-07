import test from 'node:test'
import assert from 'node:assert/strict'
import { moveWorkoutToToday } from './trainingInsights.js'

test('pulling a future workout to today makes the displaced workout next', () => {
  const queue = { seq: [1, 2, 3, 4, 5, 6, 0], idx: 0, lastDate: null }

  const nextQueue = moveWorkoutToToday(queue, 3)

  assert.deepEqual(nextQueue.seq.slice(0, 5), [4, 1, 2, 3, 5])
  assert.equal(nextQueue.idx, 0)
})

test('pulling from a wrapped queue preserves the current workout as next', () => {
  const queue = { seq: [1, 2, 3, 4, 5, 6, 0], idx: 5, lastDate: null }

  const nextQueue = moveWorkoutToToday(queue, 1)

  assert.deepEqual(nextQueue.seq.slice(0, 5), [2, 6, 0, 1, 3])
  assert.equal(nextQueue.idx, 0)
})
