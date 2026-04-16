import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Delete } from 'lucide-react'

const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','*','0','⌫']

export function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [signUpStep, setSignUpStep] = useState(1) // 1: details, 2: pin, 3: confirm
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const MAX_PIN = 6
  const MIN_PIN = 4

  function handleKey(key) {
    if (loading) return
    if (key === '⌫' || key === '*') {
      if (signUpStep === 3) setConfirmPin(p => p.slice(0, -1))
      else setPin(p => p.slice(0, -1))
      setError('')
      return
    }
    if (signUpStep === 3) {
      if (confirmPin.length >= MAX_PIN) return
      setConfirmPin(p => p + key)
    } else {
      if (pin.length >= MAX_PIN) return
      const newPin = pin + key
      setPin(newPin)
      // Sign In: auto-submit at 4 digits
      if (mode === 'signin' && newPin.length === MIN_PIN) {
        doSignIn(newPin)
      }
    }
    setError('')
  }

  async function doSignIn(p) {
    if (!username.trim()) { setError('Enter your username'); return }
    setLoading(true)
    setError('')
    try {
      await signIn(username, p)
    } catch (e) {
      setError(e.message)
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function handleSignUpNext() {
    if (!username.trim()) { setError('Username is required'); return }
    if (username.trim().length < 2) { setError('Username must be at least 2 characters'); return }
    setError('')
    setSignUpStep(2)
  }

  function handlePinSet() {
    if (pin.length < MIN_PIN) { setError(`PIN must be at least ${MIN_PIN} digits`); return }
    setError('')
    setConfirmPin('')
    setSignUpStep(3)
  }

  async function handleCreate() {
    if (confirmPin !== pin) { setError('PINs do not match'); setConfirmPin(''); return }
    setLoading(true)
    setError('')
    try {
      await signUp(username, pin, displayName || username)
    } catch (e) {
      setError(e.message)
      setPin('')
      setConfirmPin('')
      setSignUpStep(2)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setPin('')
    setConfirmPin('')
    setError('')
    setSignUpStep(1)
    setUsername('')
    setDisplayName('')
  }

  const activePin = signUpStep === 3 ? confirmPin : pin
  const pinDots = Array.from({ length: MAX_PIN }, (_, i) => i < activePin.length)

  const stepLabel = mode === 'signin'
    ? null
    : signUpStep === 1 ? 'Step 1 of 3 — Account details'
    : signUpStep === 2 ? 'Step 2 of 3 — Create your PIN'
    : 'Step 3 of 3 — Confirm your PIN'

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(110,231,183,0.06) 0%, transparent 55%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: 360,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            textShadow: 'var(--accent-glow)',
            lineHeight: 1,
          }}>SHIVAM OS</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
            Your transformation hub
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          gap: 8,
          background: 'var(--bg-elevated)',
          borderRadius: 12,
          padding: 4,
        }}>
          {['signin', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 9,
                fontSize: 12,
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: mode === m ? '1px solid var(--accent)' : '1px solid transparent',
                background: mode === m ? 'var(--accent-dim)' : 'transparent',
                color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Step indicator (sign up only) */}
        {stepLabel && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
            {stepLabel}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--red-dim)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 12,
            padding: '10px 14px',
            color: '#fca5a5',
            fontSize: 13,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Details (sign in username OR sign up step 1) */}
        {(mode === 'signin' || (mode === 'signup' && signUpStep === 1)) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="Username"
              autoCapitalize="none"
              autoComplete="username"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 14px',
                color: 'var(--text-primary)',
                fontSize: 15,
                outline: 'none',
                width: '100%',
              }}
            />
            {mode === 'signup' && (
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name (optional)"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  outline: 'none',
                  width: '100%',
                }}
              />
            )}
            {mode === 'signup' && (
              <button
                onClick={handleSignUpNext}
                className="btn-primary"
                style={{ padding: '12px 0', fontSize: 14, cursor: 'pointer' }}
              >
                Continue →
              </button>
            )}
          </div>
        )}

        {/* PIN section */}
        {(mode === 'signin' || (mode === 'signup' && signUpStep >= 2)) && (
          <>
            {/* PIN dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              {pinDots.map((filled, i) => (
                <div key={i} style={{
                  width: 12, height: 12,
                  borderRadius: '50%',
                  background: filled ? 'var(--accent)' : 'transparent',
                  border: '2px solid',
                  borderColor: filled ? 'var(--accent)' : 'var(--border-active)',
                  boxShadow: filled ? 'var(--accent-glow)' : 'none',
                  transition: 'all 0.15s ease',
                }} />
              ))}
            </div>

            {/* PIN label */}
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              {mode === 'signin'
                ? 'Enter your PIN'
                : signUpStep === 2
                ? `Enter PIN (${MIN_PIN}-${MAX_PIN} digits)`
                : 'Confirm your PIN'}
            </div>

            {/* PIN pad */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 28, height: 28,
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}>
                {PIN_KEYS.map(key => (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    className="glass-elevated"
                    style={{
                      width: '100%',
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: key === '⌫' ? 20 : 24,
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 700,
                      color: key === '⌫' ? 'var(--text-secondary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      transition: 'all 0.1s ease',
                      userSelect: 'none',
                    }}
                  >
                    {key === '⌫' ? <Delete size={20} /> : key === '*' ? '' : key}
                  </button>
                ))}
              </div>
            )}

            {/* Sign up buttons */}
            {mode === 'signup' && signUpStep === 2 && !loading && (
              <button
                onClick={handlePinSet}
                disabled={pin.length < MIN_PIN}
                className="btn-primary"
                style={{
                  padding: '12px 0',
                  fontSize: 14,
                  cursor: pin.length < MIN_PIN ? 'not-allowed' : 'pointer',
                  opacity: pin.length < MIN_PIN ? 0.5 : 1,
                }}
              >
                Set PIN →
              </button>
            )}

            {mode === 'signup' && signUpStep === 3 && !loading && confirmPin.length >= MIN_PIN && (
              <button
                onClick={handleCreate}
                className="btn-primary"
                style={{ padding: '12px 0', fontSize: 14, cursor: 'pointer' }}
              >
                Create Account
              </button>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
