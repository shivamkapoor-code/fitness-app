import { useState, useRef } from 'react'
import { Plus, Trash2, Camera, Barcode, PenLine, BookOpen, Loader2, RefreshCw, X } from 'lucide-react'
import { MacroRings } from '../components/MacroRings'
import { Modal } from '../components/Modal'
import { MEALS, MACRO_TARGETS } from '../data/meals'
import { showToast } from '../utils/toast'
import { analyzePhoto, getAIInsight } from '../ai/claude'
import { BrowserMultiFormatReader } from '@zxing/browser'

const TABS = ['breakfast', 'lunch', 'dinner', 'snack']

export function Nutrition({ state, addMeal, removeMeal, today }) {
  const totals = state.nutrition[today]?.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const meals = state.nutrition[today]?.meals ?? []

  const [showLibrary, setShowLibrary] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showBarcode, setShowBarcode] = useState(false)
  const [libraryTab, setLibraryTab] = useState('breakfast')
  const [manualForm, setManualForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  const [aiCoach, setAiCoach] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const photoRef = useRef(null)
  const videoRef = useRef(null)
  const barcodeReaderRef = useRef(null)

  function addFromLibrary(meal) {
    addMeal(today, { ...meal })
    showToast(`${meal.name} added`)
  }

  function submitManual() {
    if (!manualForm.name) { showToast('Enter a meal name', 'warn'); return }
    addMeal(today, {
      id: `manual_${Date.now()}`,
      name: manualForm.name,
      kcal: parseFloat(manualForm.kcal) || 0,
      protein: parseFloat(manualForm.protein) || 0,
      carbs: parseFloat(manualForm.carbs) || 0,
      fat: parseFloat(manualForm.fat) || 0,
    })
    showToast(`${manualForm.name} added`)
    setShowManual(false)
    setManualForm({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!state.apiKey) { showToast('Add API key in Settings', 'warn'); return }
    setPhotoLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1]
        const mediaType = file.type
        try {
          const result = await analyzePhoto(state.apiKey, base64, mediaType)
          addMeal(today, {
            id: `photo_${Date.now()}`,
            name: result.name ?? 'Photo meal',
            kcal: result.kcal ?? 0,
            protein: result.protein ?? 0,
            carbs: result.carbs ?? 0,
            fat: result.fat ?? 0,
            confidence: result.confidence,
            notes: result.notes,
          })
          showToast(`${result.name} added (${result.confidence} confidence)`)
        } catch (err) {
          showToast(err.message, 'error')
        } finally {
          setPhotoLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      setPhotoLoading(false)
    }
    e.target.value = ''
  }

  async function startBarcode() {
    setShowBarcode(true)
    setTimeout(async () => {
      if (!videoRef.current) return
      try {
        const reader = new BrowserMultiFormatReader()
        barcodeReaderRef.current = reader
        await reader.decodeFromVideoDevice(undefined, videoRef.current, async (result) => {
          if (result) {
            const barcode = result.getText()
            stopBarcode()
            try {
              const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
              const data = await res.json()
              if (data.status === 1) {
                const p = data.product
                const nutrients = p.nutriments ?? {}
                const servingG = parseFloat(nutrients['serving_size']) || 100
                addMeal(today, {
                  id: `barcode_${Date.now()}`,
                  name: p.product_name ?? 'Scanned product',
                  kcal: Math.round(nutrients['energy-kcal_serving'] ?? nutrients['energy-kcal_100g'] ?? 0),
                  protein: Math.round((nutrients['proteins_serving'] ?? nutrients['proteins_100g'] ?? 0) * 10) / 10,
                  carbs: Math.round((nutrients['carbohydrates_serving'] ?? nutrients['carbohydrates_100g'] ?? 0) * 10) / 10,
                  fat: Math.round((nutrients['fat_serving'] ?? nutrients['fat_100g'] ?? 0) * 10) / 10,
                })
                showToast(`${p.product_name ?? 'Product'} added`)
              } else {
                showToast('Product not found in database', 'warn')
              }
            } catch {
              showToast('Barcode lookup failed', 'error')
            }
          }
        })
      } catch (e) {
        showToast('Camera access denied', 'error')
        setShowBarcode(false)
      }
    }, 200)
  }

  function stopBarcode() {
    barcodeReaderRef.current?.reset()
    setShowBarcode(false)
  }

  async function loadAICoach() {
    if (!state.apiKey) { showToast('Add API key in Settings', 'warn'); return }
    setLoadingAI(true)
    try {
      const text = await getAIInsight(
        state.apiKey,
        `Review my nutrition today and give me specific feedback. What am I missing? What should my next meal or snack be right now? Factor in my training day and inflammation goals. 3-4 sentences.`,
        state,
        today
      )
      setAiCoach(text)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoadingAI(false)
    }
  }

  const remaining = {
    kcal: MACRO_TARGETS.kcal - totals.kcal,
    protein: MACRO_TARGETS.protein - totals.protein,
    carbs: MACRO_TARGETS.carbs - totals.carbs,
    fat: MACRO_TARGETS.fat - totals.fat,
  }

  return (
    <div className="px-4 py-4 pb-20 space-y-4">
      <h1 className="font-heading text-2xl font-bold text-white tracking-wide">Nutrition</h1>

      {/* Macro rings */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <MacroRings totals={totals} />
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Remaining', val: remaining.kcal, unit: 'kcal' },
            { label: 'Protein', val: remaining.protein, unit: 'g' },
            { label: 'Carbs', val: remaining.carbs, unit: 'g' },
            { label: 'Fat', val: remaining.fat, unit: 'g' },
          ].map(({ label, val, unit }) => (
            <div key={label} className="bg-slate-700 rounded-xl p-2 text-center">
              <div className={`font-heading text-sm font-bold ${val < 0 ? 'text-red-400' : 'text-white'}`}>{val > 0 ? val : 0}{unit}</div>
              <div className="text-slate-500 text-[9px]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: BookOpen, label: 'Meal Library', color: 'text-emerald-400', action: () => setShowLibrary(true) },
          { icon: Camera, label: 'AI Photo', color: 'text-blue-400', action: () => photoRef.current?.click(), loading: photoLoading },
          { icon: Barcode, label: 'Barcode', color: 'text-purple-400', action: startBarcode },
          { icon: PenLine, label: 'Manual', color: 'text-amber-400', action: () => setShowManual(true) },
        ].map(({ icon: Icon, label, color, action, loading }) => (
          <button key={label} onClick={action} disabled={loading} className="bg-slate-800 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-slate-700 transition-colors">
            {loading ? <Loader2 size={20} className={`${color} animate-spin`} /> : <Icon size={20} className={color} />}
            <span className="text-slate-300 text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
      <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />

      {/* Logged meals */}
      {meals.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Today's Meals</h3>
          {meals.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-slate-700 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{m.name}</div>
                <div className="text-slate-400 text-xs">{m.kcal} kcal · {m.protein}g P · {m.carbs}g C · {m.fat}g F</div>
                {m.confidence && <div className="text-slate-500 text-[10px]">AI estimate — {m.confidence} confidence</div>}
              </div>
              <button onClick={() => { removeMeal(today, m.id); showToast('Meal removed') }} className="text-slate-500 hover:text-red-400 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI nutrition coach */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">AI Nutrition Coach</h3>
          <button onClick={loadAICoach} disabled={loadingAI} className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            {loadingAI ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loadingAI ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {aiCoach ? (
          <p className="text-slate-300 text-sm leading-relaxed">{aiCoach}</p>
        ) : (
          <p className="text-slate-500 text-sm italic">Tap Analyze for nutrition coaching based on today's intake.</p>
        )}
      </div>

      {/* Meal Library Modal */}
      <Modal open={showLibrary} onClose={() => setShowLibrary(false)} title="Meal Library" fullScreen>
        <div className="flex border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          {TABS.map((t) => (
            <button key={t} onClick={() => setLibraryTab(t)}
              className={`flex-1 py-3 text-xs font-heading font-semibold uppercase tracking-wider capitalize transition-colors ${libraryTab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-2">
          <p className="text-slate-500 text-xs italic">Tip: Mix & match. Swap a salmon lunch for chicken if needed.</p>
          {(MEALS[libraryTab] ?? []).map((meal) => (
            <div key={meal.id} className="bg-slate-700 rounded-xl p-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{meal.name}</div>
                <div className="text-slate-400 text-xs mt-0.5">{meal.desc}</div>
                <div className="flex gap-3 mt-1.5 text-xs">
                  <span className="text-emerald-400">{meal.kcal} kcal</span>
                  <span className="text-blue-400">{meal.protein}g P</span>
                  <span className="text-amber-400">{meal.carbs}g C</span>
                  <span className="text-red-400">{meal.fat}g F</span>
                </div>
              </div>
              <button onClick={() => { addFromLibrary(meal); setShowLibrary(false) }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium flex-shrink-0">
                Add
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal open={showManual} onClose={() => setShowManual(false)} title="Manual Entry">
        <div className="p-4 space-y-3">
          {[
            { key: 'name', label: 'Meal Name', placeholder: 'e.g. Protein shake', type: 'text' },
            { key: 'kcal', label: 'Calories (kcal)', placeholder: '0', type: 'number' },
            { key: 'protein', label: 'Protein (g)', placeholder: '0', type: 'number' },
            { key: 'carbs', label: 'Carbs (g)', placeholder: '0', type: 'number' },
            { key: 'fat', label: 'Fat (g)', placeholder: '0', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} className="space-y-1">
              <label className="text-slate-400 text-xs">{label}</label>
              <input type={type} step={type === 'number' ? '0.1' : undefined} value={manualForm[key]}
                onChange={(e) => setManualForm({ ...manualForm, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          ))}
          <button onClick={submitManual} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-heading font-semibold text-sm mt-2">
            Add Meal
          </button>
        </div>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal open={showBarcode} onClose={stopBarcode} title="Scan Barcode">
        <div className="p-4 space-y-3">
          <p className="text-slate-400 text-sm">Point camera at barcode</p>
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <div className="absolute inset-0 border-4 border-emerald-400/50 rounded-xl pointer-events-none" />
          </div>
          <button onClick={stopBarcode} className="w-full bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-medium">
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  )
}
