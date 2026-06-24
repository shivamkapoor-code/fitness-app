import { useState, useRef } from 'react'
import { Plus, Trash2, Camera, Barcode, PenLine, BookOpen, Loader2, RefreshCw, ChevronDown } from 'lucide-react'
import { MacroRings } from '../components/MacroRings'
import { Modal } from '../components/Modal'
import { MEALS, MACRO_TARGETS } from '../data/meals'
import { showToast } from '../utils/toast'
import { analyzePhoto, getAIInsight } from '../ai/claude'
import { BrowserMultiFormatReader } from '@zxing/browser'

const TABS = ['breakfast', 'lunch', 'dinner', 'snack']
const MAX_PHOTO_EDGE = 1280
const PHOTO_JPEG_QUALITY = 0.82
const STATIC_MEALS = Object.values(MEALS).flat()
const STATIC_MEALS_BY_ID = Object.fromEntries(STATIC_MEALS.map((meal) => [meal.id, meal]))
const STATIC_MEALS_BY_NAME = Object.fromEntries(STATIC_MEALS.map((meal) => [meal.name.toLowerCase(), meal]))
const EMPTY_RECIPE_FORM = {
  name: '',
  desc: '',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  servings: '1',
  prepTime: '',
  storage: '',
  measurement: '',
  ingredients: '',
  steps: '',
}

function inferLibraryMealId(meal) {
  if (meal.sourceId) return meal.sourceId
  const id = String(meal.id ?? '')
  const match = id.match(/^(?:library_)?([blds]\d+)/)
  return match?.[1] ?? null
}

function getAllCustomMeals(customMeals = {}) {
  return Object.values(customMeals).flat()
}

function attachRecipeToLoggedMeal(meal, customMeals) {
  if (meal.recipe) return meal

  const customLibraryMeals = getAllCustomMeals(customMeals)
  const sourceId = inferLibraryMealId(meal)
  const matchedMeal = STATIC_MEALS_BY_ID[sourceId]
    ?? customLibraryMeals.find((item) => item.id === sourceId)
    ?? STATIC_MEALS_BY_NAME[String(meal.name ?? '').toLowerCase()]
    ?? customLibraryMeals.find((item) => item.name?.toLowerCase() === meal.name?.toLowerCase())

  if (!matchedMeal?.recipe) return meal

  return {
    ...meal,
    sourceId: matchedMeal.id,
    recipe: matchedMeal.recipe,
  }
}

function MeasurementPreview({ measurement }) {
  if (!measurement) return null

  return (
    <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5">
      <span className="text-emerald-300 text-[10px] font-heading uppercase tracking-widest">Measure: </span>
      <span className="text-slate-300 text-[11px] leading-relaxed">{measurement}</span>
    </div>
  )
}

function splitLines(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function buildRecipeFromForm(form) {
  const ingredients = splitLines(form.ingredients)
  const steps = splitLines(form.steps)
  const hasRecipe = ingredients.length > 0 || steps.length > 0 || form.prepTime.trim() || form.storage.trim() || form.measurement.trim()

  if (!hasRecipe) return null

  return {
    servings: Math.max(1, parseInt(form.servings, 10) || 1),
    prepTime: form.prepTime.trim() || 'As needed',
    storage: form.storage.trim() || 'Store based on ingredients.',
    measurement: form.measurement.trim() || 'Use the macro source consistently: raw weights with raw entries, cooked weights with cooked entries.',
    ingredients,
    steps,
  }
}

function RecipeDetails({ recipe, label = 'View recipe + meal prep', defaultOpen = false }) {
  if (!recipe) return null

  return (
    <details open={defaultOpen} className="group mt-3 border-t border-slate-600/70 pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-slate-800/70 px-3 py-2 text-[11px] font-heading font-semibold uppercase tracking-widest text-emerald-300 transition-colors hover:bg-slate-800">
        <span>{label}</span>
        <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
          <span className="rounded-lg border border-slate-600 px-2 py-1">Batch: {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}</span>
          <span className="rounded-lg border border-slate-600 px-2 py-1">Prep: {recipe.prepTime}</span>
          <span className="rounded-lg border border-slate-600 px-2 py-1">Storage: {recipe.storage}</span>
        </div>
        {recipe.measurement && (
          <div className="rounded-xl bg-slate-800/80 border border-slate-600/70 p-2">
            <div className="text-slate-500 text-[10px] uppercase tracking-widest font-heading mb-1">Measurement</div>
            <p className="text-slate-300 text-xs leading-relaxed">{recipe.measurement}</p>
          </div>
        )}
        {recipe.ingredients?.length > 0 && (
          <div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest font-heading mb-1">Ingredients</div>
            <ul className="space-y-1">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient} className="text-slate-300 text-xs leading-relaxed">- {ingredient}</li>
              ))}
            </ul>
          </div>
        )}
        {recipe.steps?.length > 0 && (
          <div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest font-heading mb-1">Prep Steps</div>
            <ol className="space-y-1">
              {recipe.steps.map((step, idx) => (
                <li key={step} className="text-slate-300 text-xs leading-relaxed">{idx + 1}. {step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </details>
  )
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this image. Try taking the photo again.'))
    }
    image.src = url
  })
}

async function preparePhotoForAI(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose a food photo to scan.')
  }

  const image = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not process this photo.')

  context.drawImage(image, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY)
  return {
    base64: dataUrl.split(',')[1],
    mediaType: 'image/jpeg',
  }
}

export function Nutrition({ state, addMeal, removeMeal, today, addCustomItem, removeCustomItem }) {
  const totals = state.nutrition[today]?.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const meals = (state.nutrition[today]?.meals ?? []).map((meal) => attachRecipeToLoggedMeal(meal, state.customItems?.meals))

  const [showLibrary, setShowLibrary] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showBarcode, setShowBarcode] = useState(false)
  const [libraryTab, setLibraryTab] = useState('breakfast')
  const [libraryForm, setLibraryForm] = useState(EMPTY_RECIPE_FORM)
  const [manualForm, setManualForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  const [aiCoach, setAiCoach] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const photoRef = useRef(null)
  const videoRef = useRef(null)
  const barcodeReaderRef = useRef(null)

  function addFromLibrary(meal) {
    const mealLog = {
      ...meal,
      sourceId: meal.id,
      id: `library_${meal.id}_${Date.now()}`,
    }
    addMeal(today, mealLog)
    showToast(`${meal.name} added`)
  }

  function addCustomMeal() {
    if (!libraryForm.name.trim()) { showToast('Enter a meal name', 'warn'); return }
    const recipe = buildRecipeFromForm(libraryForm)
    addCustomItem('meals', {
      name: libraryForm.name.trim(),
      desc: libraryForm.desc.trim() || 'Custom meal',
      kcal: parseFloat(libraryForm.kcal) || 0,
      protein: parseFloat(libraryForm.protein) || 0,
      carbs: parseFloat(libraryForm.carbs) || 0,
      fat: parseFloat(libraryForm.fat) || 0,
      ...(recipe ? { recipe } : {}),
      custom: true,
    }, libraryTab)
    setLibraryForm(EMPTY_RECIPE_FORM)
    showToast('Meal library item added')
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
    setPhotoLoading(true)
    try {
      const { base64, mediaType } = await preparePhotoForAI(file)
      const result = await analyzePhoto(base64, mediaType)
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
      showToast(`${result.name ?? 'Photo meal'} added (${result.confidence ?? 'low'} confidence)`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
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
      } catch {
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
    setLoadingAI(true)
    try {
      const text = await getAIInsight(
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
        ].map((actionItem) => {
          const Icon = actionItem.icon
          return (
          <button key={actionItem.label} onClick={actionItem.action} disabled={actionItem.loading} className="bg-slate-800 rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-slate-700 transition-colors">
            {actionItem.loading ? <Loader2 size={20} className={`${actionItem.color} animate-spin`} /> : <Icon size={20} className={actionItem.color} />}
            <span className="text-slate-300 text-[10px] font-medium">{actionItem.label}</span>
          </button>
        )})}
      </div>
      <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />

      {/* Logged meals */}
      {meals.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <h3 className="font-heading text-sm font-semibold text-slate-400 uppercase tracking-widest">Today's Meals</h3>
          {meals.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 bg-slate-700 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{m.name}</div>
                <div className="text-slate-400 text-xs">{m.kcal} kcal · {m.protein}g P · {m.carbs}g C · {m.fat}g F</div>
                {m.confidence && <div className="text-slate-500 text-[10px]">AI estimate — {m.confidence} confidence</div>}
                <MeasurementPreview measurement={m.recipe?.measurement} />
              </div>
              <button onClick={() => { removeMeal(today, m.id); showToast('Meal removed') }} className="text-slate-500 hover:text-red-400 p-1">
                <Trash2 size={14} />
              </button>
              {m.recipe && (
                <div className="basis-full">
                  <RecipeDetails recipe={m.recipe} label="Meal recipe" defaultOpen />
                </div>
              )}
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
          <div className="bg-slate-700/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-emerald-300" />
              <div>
                <div className="text-slate-300 text-[10px] uppercase tracking-widest font-heading">Add Custom Meal</div>
                <div className="text-emerald-300 text-[10px] uppercase tracking-widest font-heading">Recipe + raw/cooked measurement</div>
              </div>
            </div>
            <input value={libraryForm.name} onChange={(e) => setLibraryForm({ ...libraryForm, name: e.target.value })}
              placeholder="Meal name" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
            <input value={libraryForm.desc} onChange={(e) => setLibraryForm({ ...libraryForm, desc: e.target.value })}
              placeholder="Description" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
            <div className="grid grid-cols-4 gap-2">
              {[
                ['kcal', 'kcal'],
                ['protein', 'protein'],
                ['carbs', 'carbs'],
                ['fat', 'fat'],
              ].map(([key, placeholder]) => (
                <input key={key} type="number" value={libraryForm[key]} onChange={(e) => setLibraryForm({ ...libraryForm, [key]: e.target.value })}
                  placeholder={placeholder} className="bg-slate-800 border border-slate-600 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="1" value={libraryForm.servings} onChange={(e) => setLibraryForm({ ...libraryForm, servings: e.target.value })}
                placeholder="servings" className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
              <input value={libraryForm.prepTime} onChange={(e) => setLibraryForm({ ...libraryForm, prepTime: e.target.value })}
                placeholder="prep time" className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
            </div>
            <input value={libraryForm.storage} onChange={(e) => setLibraryForm({ ...libraryForm, storage: e.target.value })}
              placeholder="Storage note" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500" />
            <textarea value={libraryForm.measurement} onChange={(e) => setLibraryForm({ ...libraryForm, measurement: e.target.value })}
              placeholder="Raw/cooked measurement note, e.g. macros are for 200g cooked chicken; raw equivalent is about 260g before cooking."
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none" />
            <textarea value={libraryForm.ingredients} onChange={(e) => setLibraryForm({ ...libraryForm, ingredients: e.target.value })}
              placeholder="Ingredients, one per line"
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none" />
            <textarea value={libraryForm.steps} onChange={(e) => setLibraryForm({ ...libraryForm, steps: e.target.value })}
              placeholder="Recipe steps, one per line"
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none" />
            <button onClick={addCustomMeal} className="w-full bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-2 text-xs font-heading font-semibold">
              Add to {libraryTab}
            </button>
          </div>
          {[...(MEALS[libraryTab] ?? []), ...(state.customItems?.meals?.[libraryTab] ?? [])].map((meal) => (
            <div key={meal.id} className="bg-slate-700 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{meal.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{meal.desc}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                    <span className="text-emerald-400">{meal.kcal} kcal</span>
                    <span className="text-blue-400">{meal.protein}g P</span>
                    <span className="text-amber-400">{meal.carbs}g C</span>
                    <span className="text-red-400">{meal.fat}g F</span>
                  </div>
                  <MeasurementPreview measurement={meal.recipe?.measurement} />
                </div>
                <button onClick={() => { addFromLibrary(meal); setShowLibrary(false) }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium flex-shrink-0">
                  Add
                </button>
                {meal.custom && (
                  <button onClick={() => { removeCustomItem('meals', meal.id, libraryTab); showToast('Meal library item deleted') }}
                    className="bg-red-500/15 text-red-300 rounded-lg px-2 py-1.5 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <RecipeDetails recipe={meal.recipe} />
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
