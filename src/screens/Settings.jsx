import { useState } from 'react'
import { Eye, EyeOff, Download, Upload, Key, Info, Smartphone } from 'lucide-react'
import { showToast } from '../utils/toast'

const ENV_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? ''

export function Settings({ state, update, user, updateProfile, signOut, isAdmin, onNavigate }) {
  const [keyInput, setKeyInput] = useState(state.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [ageInput, setAgeInput] = useState(user?.actual_age ?? 30)

  const effectiveKey = state.apiKey || ENV_KEY
  const keySource = state.apiKey
    ? 'Saved in app'
    : ENV_KEY
    ? 'Loaded from environment'
    : null

  function saveKey() {
    update({ apiKey: keyInput.trim() })
    showToast('API key saved')
  }

  function removeKey() {
    // Fall back to env var rather than writing empty string to localStorage
    setKeyInput('')
    update({ apiKey: ENV_KEY })
    showToast(ENV_KEY ? 'Custom key removed — using environment key' : 'API key removed')
  }

  function exportData() {
    const { chatHistory, ...data } = state
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shivam-fitness-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported')
  }

  function importData(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        update(data)
        showToast('Data imported successfully')
      } catch {
        showToast('Invalid file format', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const workoutDates = Object.keys(state.workoutLog ?? {}).length
  const nutritionDates = Object.keys(state.nutrition ?? {}).length
  const metricEntries = (state.bodyMetrics ?? []).length

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <h1 className="font-heading text-2xl font-bold text-white tracking-wide">Settings</h1>

      {/* Profile */}
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Profile</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Barlow Condensed, sans-serif' }}>{user?.display_name || user?.username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>@{user?.username}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Actual Age</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                const n = Math.max(16, ageInput - 1)
                setAgeInput(n)
                updateProfile({ actual_age: n })
              }}
              className="glass-elevated"
              style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-primary)', cursor: 'pointer', border: '1px solid var(--border)' }}
            >−</button>
            <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{ageInput}</div>
            <button
              onClick={() => {
                const n = Math.min(80, ageInput + 1)
                setAgeInput(n)
                updateProfile({ actual_age: n })
              }}
              className="glass-elevated"
              style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-primary)', cursor: 'pointer', border: '1px solid var(--border)' }}
            >+</button>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Key size={16} className="text-emerald-400" />
          <h3 className="font-heading text-sm font-semibold text-primary-color uppercase tracking-widest">Anthropic API Key</h3>
        </div>
        <div className="relative" style={{ marginBottom: 8 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full glass-elevated border border-slate-600 rounded-xl px-3 py-2.5 text-primary-color text-sm pr-10 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-color"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={saveKey} className="btn-primary" style={{ flex: 1, padding: '8px 0', cursor: 'pointer' }}>Save</button>
          <button onClick={removeKey} className="btn-ghost" style={{ padding: '8px 16px', cursor: 'pointer' }}>Remove</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`w-2 h-2 rounded-full ${effectiveKey ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-muted-color text-xs">
            {effectiveKey
              ? `AI ready · ${keySource}`
              : 'No API key — AI features disabled'}
          </span>
        </div>
      </div>

      {/* Data stats */}
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Info size={16} className="text-blue-400" />
          <h3 className="font-heading text-sm font-semibold text-primary-color uppercase tracking-widest">Data Stats</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Workout Days', value: workoutDates },
            { label: 'Nutrition Days', value: nutritionDates },
            { label: 'Check-ins', value: metricEntries },
          ].map(({ label, value }) => (
            <div key={label} className="glass-elevated rounded-xl p-3 text-center">
              <div className="font-heading text-xl font-bold text-primary-color">{value}</div>
              <div className="text-muted-color text-[10px] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export / Import */}
      <div className="glass" style={{ padding: 16 }}>
        <h3 className="font-heading text-sm font-semibold text-muted-color uppercase tracking-widest" style={{ marginBottom: 12 }}>Data Management</h3>
        <button
          onClick={exportData}
          className="btn-ghost"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }}
        >
          <Download size={16} className="text-emerald-400" />
          Export Data (JSON)
        </button>
        <label className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
          <Upload size={16} className="text-blue-400" />
          Import Data (JSON)
          <input type="file" accept=".json" onChange={importData} className="hidden" />
        </label>
      </div>

      {/* iPhone install */}
      <div className="glass" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Smartphone size={16} className="text-purple-400" />
          <h3 className="font-heading text-sm font-semibold text-primary-color uppercase tracking-widest">Install on iPhone</h3>
        </div>
        <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">1.</span>Open this app in Safari on your iPhone</li>
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">2.</span>Tap the Share button (box with arrow up)</li>
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">3.</span>Scroll down and tap "Add to Home Screen"</li>
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">4.</span>Tap "Add" — the app will appear on your home screen</li>
        </ol>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Data is stored locally on your device. Export regularly to back up.</p>
      </div>

      {isAdmin && (
        <button
          onClick={() => onNavigate('admin')}
          className="btn-primary"
          style={{ width: '100%', padding: '14px 0', fontSize: 14, cursor: 'pointer', marginTop: 8 }}
        >
          Admin Console
        </button>
      )}

      <button
        onClick={signOut}
        style={{
          width: '100%',
          padding: '14px 0',
          background: 'var(--red-dim)',
          border: '1px solid rgba(248,113,113,0.25)',
          color: '#fca5a5',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'Barlow Condensed, sans-serif',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        Sign Out
      </button>
    </div>
  )
}
