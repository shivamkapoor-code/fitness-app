import { MACRO_TARGETS } from '../data/meals'

function Ring({ value, max, color, label, unit = 'g', size = 80 }) {
  const pct = Math.min(1, (value ?? 0) / (max ?? 1))
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth={10} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={10}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-white leading-none">{Math.round(value ?? 0)}</span>
          <span className="text-[9px] text-slate-400">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-400 text-center">{label}</span>
    </div>
  )
}

export function MacroRings({ totals }) {
  const t = totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  return (
    <div className="flex justify-around">
      <Ring value={t.kcal} max={MACRO_TARGETS.kcal} color="#10b981" label="Calories" unit="kcal" size={80} />
      <Ring value={t.protein} max={MACRO_TARGETS.protein} color="#3b82f6" label="Protein" unit="g" size={80} />
      <Ring value={t.carbs} max={MACRO_TARGETS.carbs} color="#f59e0b" label="Carbs" unit="g" size={80} />
      <Ring value={t.fat} max={MACRO_TARGETS.fat} color="#ef4444" label="Fat" unit="g" size={80} />
    </div>
  )
}
