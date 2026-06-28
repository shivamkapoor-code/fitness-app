# Workout Nutrition Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the app's workout split, calories, cardio, abs, warmups, form links, and meal recommendations to the user's Renpho-driven fat-loss and muscle-building goal.

**Architecture:** Keep static coaching content in `src/data/workouts.js` and `src/data/meals.js`. Render the day-level plan in `src/screens/Workout.jsx`, and reuse the same workout meal IDs in `src/screens/Nutrition.jsx` so the meal library recommends meals for the current workout.

**Tech Stack:** React, Vite, lucide-react, existing local app state.

---

### Task 1: Workout Data

**Files:**
- Modify: `src/data/workouts.js`

- [ ] Replace the split with a 7-day plan: Push Strength, Pull Strength, Legs Strength, Recovery Zone 2 + Mobility, Upper Hypertrophy, Lower + Conditioning, Full Rest.
- [ ] Add `duration`, `goal`, `dailyTargets`, `mealPlan`, gym-feasible `warmup`, cardio only where useful, and spine-safe abs/core per day.
- [ ] Keep L5-S1 and piriformis constraints embedded in notes and conditional fields.

### Task 2: Meal Targets

**Files:**
- Modify: `src/data/meals.js`

- [ ] Change global macro target to about 2100 kcal, 185g protein, 200g carbs, 62g fat.
- [ ] Ensure existing meal recipes keep measurement guidance.

### Task 3: Workout UI

**Files:**
- Modify: `src/screens/Workout.jsx`

- [ ] Show duration, goal, calorie/macro targets, cardio intent, and workout-matched meals near the top of the day.
- [ ] Add a generic YouTube form link for every exercise even if detailed cues are missing.
- [ ] Keep detailed cue modal where `EXERCISE_CUES` exists.

### Task 4: Nutrition UI

**Files:**
- Modify: `src/screens/Nutrition.jsx`

- [ ] Import workout data and show today's recommended meal picks based on current workout queue.
- [ ] Allow adding recommended meals directly from that section.

### Task 5: Verify and Ship

**Commands:**
- `npm run lint`
- `npm run build`
- source-level checks for new labels in the built asset
- `git commit`
- `git push origin main`
- `npx vercel deploy --prod --yes`
