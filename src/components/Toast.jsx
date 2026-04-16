import { useState, useEffect, useCallback } from 'react'
import { registerToast } from '../utils/toast'

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ message, type, id }) => {
    setToasts((prev) => [...prev, { message, type, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    registerToast(addToast)
  }, [addToast])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90vw] max-w-[420px] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 ${
            t.type === 'error'
              ? 'bg-red-500/90 text-white'
              : t.type === 'warn'
              ? 'bg-amber-500/90 text-white'
              : 'bg-emerald-500/90 text-white'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
