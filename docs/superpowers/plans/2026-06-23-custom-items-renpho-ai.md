# Custom Items And Renpho AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local add/delete customization across core tabs and add Renpho CSV trend analysis with AI-generated workout, diet, and body-composition recommendations.

**Architecture:** Keep the app local-first by adding `customItems` and `renphoEntries` to `useAppState`. Reuse existing CSV upload patterns, add a focused Renpho parser/trend analyzer, and call the existing Supabase `ai-coach` function with structured analysis context.

**Tech Stack:** React 19, Vite, localStorage-backed app state, Papa Parse, Supabase Edge Function AI proxy.

---

### Task 1: App State

**Files:**
- Modify: `src/hooks/useAppState.js`

- [ ] Add defaults for `customItems` and `renphoEntries`.
- [ ] Add helper callbacks: `addCustomItem`, `removeCustomItem`, `addRenphoEntries`, `removeRenphoEntry`.
- [ ] Preserve localStorage persistence and exclude only `chatHistory` from persisted state.

### Task 2: Renpho Parser And Trends

**Files:**
- Modify: `src/lib/csvImport.js`
- Create: `src/utils/renphoAnalysis.js`

- [ ] Extend CSV field matching for BMI, skeletal muscle, subcutaneous fat, body water, fat-free body weight, protein, bone mass, and body age variants.
- [ ] Normalize Renpho rows into app body metrics while keeping all available raw fields.
- [ ] Implement trend analysis for first vs latest, last 7 days, last 30 days, overall direction, and meaningful weight/body-fat/muscle changes.
- [ ] Implement prompt context builder with a general fitness guidance disclaimer requirement.

### Task 3: Editable Items

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/screens/Dashboard.jsx`
- Modify: `src/screens/Workout.jsx`
- Modify: `src/screens/Nutrition.jsx`
- Modify: `src/screens/BodyMetrics.jsx`
- Modify: `src/screens/Supplements.jsx`
- Modify: `src/screens/Inflammation.jsx`

- [ ] Pass custom item helpers from `App.jsx`.
- [ ] Add custom dashboard lever cards.
- [ ] Add/delete custom workout exercises on the active workout day.
- [ ] Add/delete custom meal library items.
- [ ] Add delete control for body metrics entries.
- [ ] Add/delete custom supplements.
- [ ] Add/delete custom inflammation habits.

### Task 4: Renpho AI UX

**Files:**
- Modify: `src/screens/BodyMetrics.jsx`
- Modify: `src/ai/claude.js`

- [ ] Add Renpho CSV upload CTA beside body metric import.
- [ ] Show Renpho trend summary after upload/import.
- [ ] Add AI analysis button that generates workout, diet, and health/body composition guidance.
- [ ] User-facing output format should include: disclaimer, trend summary, workout changes, diet changes, weekly structure, health/body composition direction, and next actions.

### Task 5: Verification And Release

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Smoke test local UI: custom item add/delete, Renpho upload path, meal/body/supplement/inflammation screens still render.
- [ ] Commit changes.
- [ ] Push `main`.
- [ ] Deploy production via Vercel CLI.
