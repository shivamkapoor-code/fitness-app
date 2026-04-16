import { Home, Dumbbell, UtensilsCrossed, TrendingUp, Pill, Flame, MessageCircle } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Home', Icon: Home },
  { id: 'workout', label: 'Train', Icon: Dumbbell },
  { id: 'nutrition', label: 'Food', Icon: UtensilsCrossed },
  { id: 'body', label: 'Body', Icon: TrendingUp },
  { id: 'supplements', label: 'Supps', Icon: Pill },
  { id: 'inflammation', label: 'Inflam', Icon: Flame },
  { id: 'chat', label: 'AI', Icon: MessageCircle },
]

export function BottomNav({ active, onNavigate }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'rgba(2, 6, 23, 0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--border)',
      zIndex: 30,
    }}>
      <div className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 12px',
                gap: 3,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
                position: 'relative',
              }}
            >
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 2,
                  background: 'var(--accent)',
                  borderRadius: '0 0 2px 2px',
                  boxShadow: 'var(--accent-glow)',
                }} />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{
                fontSize: 9,
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
              }}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
