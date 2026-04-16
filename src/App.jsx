import { useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { BottomNav } from './components/BottomNav'
import { ToastContainer } from './components/Toast'
import { Dashboard } from './screens/Dashboard'
import { Workout } from './screens/Workout'
import { Nutrition } from './screens/Nutrition'
import { BodyMetrics } from './screens/BodyMetrics'
import { Supplements } from './screens/Supplements'
import { Inflammation } from './screens/Inflammation'
import { AIChat } from './screens/AIChat'
import { WeeklyReview } from './screens/WeeklyReview'
import { Settings } from './screens/Settings'

export default function App() {
  const [screen, setScreen] = useState('dashboard')

  const {
    state,
    update,
    today,
    logSet,
    removeSet,
    addMeal,
    removeMeal,
    addBodyMetric,
    toggleSupp,
    saveInflam,
    setStiffness,
    advanceQueue,
    swapQueueDay,
    addChatMessage,
  } = useAppState()

  function renderScreen() {
    switch (screen) {
      case 'dashboard':
        return <Dashboard state={state} setStiffness={setStiffness} today={today} onNavigate={setScreen} />
      case 'workout':
        return <Workout state={state} logSet={logSet} removeSet={removeSet} advanceQueue={advanceQueue} swapQueueDay={swapQueueDay} today={today} />
      case 'nutrition':
        return <Nutrition state={state} addMeal={addMeal} removeMeal={removeMeal} today={today} />
      case 'body':
        return <BodyMetrics state={state} addBodyMetric={addBodyMetric} today={today} />
      case 'supplements':
        return <Supplements state={state} toggleSupp={toggleSupp} today={today} />
      case 'inflammation':
        return <Inflammation state={state} saveInflam={saveInflam} today={today} />
      case 'chat':
        return <AIChat state={state} addChatMessage={addChatMessage} today={today} />
      case 'review':
        return <WeeklyReview state={state} today={today} />
      case 'settings':
        return <Settings state={state} update={update} />
      default:
        return <Dashboard state={state} setStiffness={setStiffness} today={today} onNavigate={setScreen} />
    }
  }

  // Extended nav including review and settings accessible from dashboard or overflow
  const NAV_SCREENS = ['dashboard', 'workout', 'nutrition', 'body', 'supplements', 'inflammation', 'chat']

  return (
    <div className="min-h-screen bg-[#020617] flex justify-center">
      <div className="w-full max-w-[480px] relative min-h-screen">
        <ToastContainer />
        <main className="min-h-screen overflow-y-auto">
          {renderScreen()}
        </main>
        <BottomNav
          active={screen}
          onNavigate={setScreen}
        />
        {/* Settings & Review accessible via quick nav from dashboard header or swipe */}
        {screen === 'dashboard' && (
          <div className="fixed top-4 right-4 flex gap-2 z-20">
            <button
              onClick={() => setScreen('review')}
              className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 text-xs font-medium"
            >
              Review
            </button>
            <button
              onClick={() => setScreen('settings')}
              className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 text-xs font-medium"
            >
              Settings
            </button>
          </div>
        )}
        {(screen === 'review' || screen === 'settings') && (
          <div className="fixed top-4 left-4 z-20">
            <button
              onClick={() => setScreen('dashboard')}
              className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 text-xs font-medium"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
