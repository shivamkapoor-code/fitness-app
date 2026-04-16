import { useState } from 'react'
import { Eye, EyeOff, Download, Upload, Key, Info, Smartphone } from 'lucide-react'
import { showToast } from '../utils/toast'

const ENV_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? ''

export function Settings({ state, update }) {
  const [keyInput, setKeyInput] = useState(state.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)

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

      {/* API Key */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-emerald-400" />
          <h3 className="font-heading text-sm font-semibold text-white uppercase tracking-widest">Anthropic API Key</h3>
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm pr-10 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={saveKey} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 text-sm font-medium">Save</button>
          <button onClick={removeKey} className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 text-sm font-medium">Remove</button>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${effectiveKey ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-slate-400 text-xs">
            {effectiveKey
              ? `AI ready · ${keySource}`
              : 'No API key — AI features disabled'}
          </span>
        </div>
      </div>

      {/* Data stats */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-400" />
          <h3 className="font-heading text-sm font-semibold text-white uppercase tracking-widest">Data Stats</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Workout Days', value: workoutDates },
            { label: 'Nutrition Days', value: nutritionDates },
            { label: 'Check-ins', value: metricEntries },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-700 rounded-xl p-3 text-center">
              <div className="font-heading text-xl font-bold text-white">{value}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export / Import */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Data Management</h3>
        <button
          onClick={exportData}
          className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 rounded-xl px-4 py-3 text-sm text-white font-medium"
        >
          <Download size={16} className="text-emerald-400" />
          Export Data (JSON)
        </button>
        <label className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 rounded-xl px-4 py-3 text-sm text-white font-medium cursor-pointer">
          <Upload size={16} className="text-blue-400" />
          Import Data (JSON)
          <input type="file" accept=".json" onChange={importData} className="hidden" />
        </label>
      </div>

      {/* iPhone install */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-purple-400" />
          <h3 className="font-heading text-sm font-semibold text-white uppercase tracking-widest">Install on iPhone</h3>
        </div>
        <ol className="space-y-2 text-slate-300 text-sm">
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">1.</span>Open this app in Safari on your iPhone</li>
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">2.</span>Tap the Share button (box with arrow up)</li>
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">3.</span>Scroll down and tap "Add to Home Screen"</li>
          <li className="flex gap-2"><span className="text-emerald-400 font-bold">4.</span>Tap "Add" — the app will appear on your home screen</li>
        </ol>
        <p className="text-slate-500 text-xs">Data is stored locally on your device. Export regularly to back up.</p>
      </div>
    </div>
  )
}
