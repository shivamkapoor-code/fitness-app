import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Download, Users, Activity, ChevronRight, ArrowLeft } from 'lucide-react'

function calcBioAgeSimple(metrics) {
  if (!metrics || metrics.length === 0) return null
  const latest = metrics[metrics.length - 1]
  let penalty = 0
  const visceral = latest.visceral_fat ?? 11
  if (visceral < 9) penalty -= 2
  else if (visceral > 11) penalty += 2
  const bf = latest.body_fat_pct ?? 23.7
  if (bf < 18) penalty -= 3
  else if (bf < 22) penalty -= 1
  else if (bf < 25) penalty += 1
  else penalty += 3
  return Math.max(20, 36 + penalty)
}

function exportToCSV(metrics, username) {
  if (!metrics || metrics.length === 0) return
  const headers = ['date', 'weight_lbs', 'body_fat_pct', 'visceral_fat', 'muscle_mass_lbs', 'bmr', 'metabolic_age', 'waist_inches', 'neck_inches']
  const rows = metrics.map(m =>
    headers.map(h => m[h] ?? '').join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${username}-metrics-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function Admin({ isAdmin, onNavigate }) {
  const [stats, setStats] = useState({ users: 0, metrics: 0, workouts: 0 })
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userMetrics, setUserMetrics] = useState([])
  const [userWorkoutCount, setUserWorkoutCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) return
    fetchStats()
  }, [isAdmin])

  async function fetchStats() {
    setLoading(true)
    try {
      const [profilesRes, metricsRes, workoutsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('body_metrics').select('*', { count: 'exact', head: true }),
        supabase.from('workout_logs').select('*', { count: 'exact', head: true }),
      ])
      setStats({
        users: profilesRes.count ?? 0,
        metrics: metricsRes.count ?? 0,
        workouts: workoutsRes.count ?? 0,
      })
      setUsers(profilesRes.data ?? [])
    } catch (e) {
      console.error('Admin fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function viewUser(user) {
    setSelectedUser(user)
    const [metricsRes, workoutsRes] = await Promise.all([
      supabase.from('body_metrics').select('*').eq('user_id', user.id).order('date'),
      supabase.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setUserMetrics(metricsRes.data ?? [])
    setUserWorkoutCount(workoutsRes.count ?? 0)
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, color: '#fca5a5' }}>Access Denied</div>
        <button onClick={() => onNavigate('dashboard')} className="btn-ghost" style={{ padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}>
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  if (selectedUser) {
    const latest = userMetrics.length > 0 ? userMetrics[userMetrics.length - 1] : null
    const bioAge = calcBioAgeSimple(userMetrics)
    return (
      <div style={{ padding: '20px 16px 80px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => { setSelectedUser(null); setUserMetrics([]) }}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600 }}>
            ← Users
          </button>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {selectedUser.display_name || selectedUser.username}
          </h2>
          {selectedUser.is_admin && (
            <span style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
              ADMIN
            </span>
          )}
        </div>

        <div className="glass" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Username', val: selectedUser.username },
              { label: 'Actual Age', val: selectedUser.actual_age ?? '—' },
              { label: 'Joined', val: new Date(selectedUser.created_at).toLocaleDateString() },
              { label: 'Last Active', val: new Date(selectedUser.last_active).toLocaleDateString() },
            ].map(({ label, val }) => (
              <div key={label} className="glass-elevated" style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Latest Body Metrics</div>
          {latest ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Weight', val: latest.weight_lbs ? `${latest.weight_lbs} lbs` : '—' },
                { label: 'Body Fat', val: latest.body_fat_pct ? `${latest.body_fat_pct}%` : '—' },
                { label: 'Visceral Fat', val: latest.visceral_fat ?? '—' },
                { label: 'Metabolic Age', val: latest.metabolic_age ?? '—' },
                { label: 'Bio Age Est.', val: bioAge ?? '—' },
                { label: 'Entries', val: userMetrics.length },
              ].map(({ label, val }) => (
                <div key={label} className="glass-elevated" style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No metrics recorded yet.</div>
          )}
        </div>

        <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Activity</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Body Metric Entries', val: userMetrics.length },
              { label: 'Workout Logs', val: userWorkoutCount },
            ].map(({ label, val }) => (
              <div key={label} className="glass-elevated" style={{ flex: 1, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => exportToCSV(userMetrics, selectedUser.username)}
          disabled={userMetrics.length === 0}
          className="btn-primary"
          style={{ width: '100%', padding: '14px 0', fontSize: 14, cursor: userMetrics.length === 0 ? 'not-allowed' : 'pointer', opacity: userMetrics.length === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}
        >
          <Download size={16} /> Export Metrics CSV
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>
        Admin Console
      </h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Users', val: `${stats.users}/10`, icon: <Users size={16} /> },
              { label: 'Body Entries', val: stats.metrics, icon: <Activity size={16} /> },
              { label: 'Workout Logs', val: stats.workouts, icon: <Activity size={16} /> },
            ].map(({ label, val, icon }) => (
              <div key={label} className="glass" style={{ padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ color: 'var(--accent)', marginBottom: 6 }}>{icon}</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* User list */}
          <div className="glass" style={{ padding: 16 }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Users</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => viewUser(u)}
                  className="glass-elevated"
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid var(--border)', width: '100%', textAlign: 'left' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.display_name || u.username}
                      {u.is_admin && <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>ADMIN</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      @{u.username} · Active {new Date(u.last_active).toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
