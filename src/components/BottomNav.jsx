import { Home, Dumbbell, UtensilsCrossed, TrendingUp, Pill, Flame, MessageCircle } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Home', Icon: Home },
  { id: 'workout', label: 'Workout', Icon: Dumbbell },
  { id: 'nutrition', label: 'Food', Icon: UtensilsCrossed },
  { id: 'body', label: 'Body', Icon: TrendingUp },
  { id: 'supplements', label: 'Supps', Icon: Pill },
  { id: 'inflammation', label: 'Inflam', Icon: Flame },
  { id: 'chat', label: 'Chat', Icon: MessageCircle },
]

export function BottomNav({ active, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-slate-900/95 backdrop-blur border-t border-slate-700 z-30">
      <div className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-medium tracking-wide">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
