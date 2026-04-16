import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useAppState } from './hooks/useAppState'
import { BottomNav } from './components/BottomNav'
import { ToastContainer } from './components/Toast'
import { Auth } from './screens/Auth'
import { Admin } from './screens/Admin'
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
  const { user, loading, isAdmin, signOut, updateProfile } = useAuth()
  const [screen, setScreen] = useState('dashboard')

  const {
    state, update, today,
    logSet, removeSet,
    addMeal, removeMeal,
    addBodyMetric,
    toggleSupp, saveInflam,
    setStiffness,
    advanceQueue, swapQueueDay,
    addChatMessage,
  } = useAppState()

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '0.1em',
          color: 'var(--accent)',
          textShadow: 'var(--accent-glow)',
        }}>SHIVAM OS</div>
        <div style={{
          width: 24, height: 24,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <Auth />

  function renderScreen() {
    switch (screen) {
      case 'dashboard':
        return <Dashboard state={state} setStiffness={setStiffness}
                 today={today} onNavigate={setScreen} user={user} />
      case 'workout':
        return <Workout state={state} logSet={logSet} removeSet={removeSet}
                 advanceQueue={advanceQueue} swapQueueDay={swapQueueDay} today={today} />
      case 'nutrition':
        return <Nutrition state={state} addMeal={addMeal}
                 removeMeal={removeMeal} today={today} />
      case 'body':
        return <BodyMetrics state={state} addBodyMetric={addBodyMetric}
                 today={today} user={user} />
      case 'supplements':
        return <Supplements state={state} toggleSupp={toggleSupp} today={today} />
      case 'inflammation':
        return <Inflammation state={state} saveInflam={saveInflam} today={today} />
      case 'chat':
        return <AIChat state={state} addChatMessage={addChatMessage} today={today} />
      case 'review':
        return <WeeklyReview state={state} today={today} />
      case 'settings':
        return <Settings state={state} update={update} user={user}
                 updateProfile={updateProfile} signOut={signOut}
                 isAdmin={isAdmin} onNavigate={setScreen} />
      case 'admin':
        return <Admin isAdmin={isAdmin} onNavigate={setScreen} />
      default:
        return <Dashboard state={state} setStiffness={setStiffness}
                 today={today} onNavigate={setScreen} user={user} />
    }
  }

  const MAIN_SCREENS = ['dashboard','workout','nutrition','body','supplements','inflammation','chat']

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <div style={{
        width: '100%', maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        minHeight: '100dvh'
      }}>
        <ToastContainer />
        <main style={{ minHeight: '100dvh', overflowY: 'auto' }}>
          {renderScreen()}
        </main>

        {MAIN_SCREENS.includes(screen) && (
          <BottomNav active={screen} onNavigate={setScreen} />
        )}

        {screen === 'dashboard' && (
          <div style={{
            position: 'fixed', top: 16, right: 16,
            display: 'flex', gap: 8, zIndex: 20,
          }}>
            {isAdmin && (
              <button onClick={() => setScreen('admin')}
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}>Admin</button>
            )}
            <button onClick={() => setScreen('review')}
              style={{
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}>Review</button>
            <button onClick={() => setScreen('settings')}
              style={{
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}>Settings</button>
          </div>
        )}

        {(screen === 'review' || screen === 'settings' || screen === 'admin') && (
          <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 20 }}>
            <button onClick={() => setScreen('dashboard')}
              style={{
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: 10,
                padding: '6px 14px',
                fontSize: 11,
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
              }}>← Back</button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
