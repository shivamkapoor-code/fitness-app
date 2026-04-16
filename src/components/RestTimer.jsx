import { useState, useEffect, useRef } from 'react'

export function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const [active, setActive] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!active) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setActive(false)
          onDone?.()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [active, onDone])

  const pct = remaining / seconds
  const r = 20
  const circ = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
      <svg width={52} height={52} className="-rotate-90">
        <circle cx={26} cy={26} r={r} stroke="#1e293b" strokeWidth={6} fill="none" />
        <circle
          cx={26}
          cy={26}
          r={r}
          stroke="#10b981"
          strokeWidth={6}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div className="flex-1">
        <div className="text-emerald-400 font-heading text-2xl font-bold">{remaining}s</div>
        <div className="text-slate-400 text-xs">Rest timer</div>
      </div>
      <button
        onClick={() => { setActive(false); onDone?.() }}
        className="text-slate-400 text-xs border border-slate-600 rounded-lg px-3 py-1.5"
      >
        Skip
      </button>
    </div>
  )
}
