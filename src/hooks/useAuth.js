import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SESSION_KEY = 'fitness_session_v1'
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME ?? 'shivam'

async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'fitness_salt_v1')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { localStorage.removeItem(SESSION_KEY) }
    }
    setLoading(false)
  }, [])

  const signIn = useCallback(async (username, pin) => {
    const hash = await hashPin(pin)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('pin_hash', hash)
      .single()
    if (error || !data) throw new Error('Invalid username or PIN')
    await supabase.from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', data.id)
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    setUser(data)
    return data
  }, [])

  const signUp = useCallback(async (username, pin, displayName) => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    if (count >= 10) throw new Error('App is at capacity (10 users). Contact the admin.')
    const existing = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .single()
    if (existing.data) throw new Error('Username already taken')
    const hash = await hashPin(pin)
    const isAdmin = username.toLowerCase().trim() === ADMIN_USERNAME.toLowerCase()
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        username: username.toLowerCase().trim(),
        pin_hash: hash,
        display_name: displayName || username,
        is_admin: isAdmin,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
    setUser(data)
    return data
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (patch) => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = { ...user, ...data }
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
    setUser(updated)
  }, [user])

  return {
    user,
    loading,
    isAdmin: user?.is_admin === true,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
}
