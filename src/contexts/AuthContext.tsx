'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'
import getSupabaseClient from '@/lib/supabase/client'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function fetchProfile(supabase: ReturnType<typeof getSupabaseClient>, userId: string, setProfile: (p: UserProfile | null) => void) {
  supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .then(({ data, error }) => {
      if (!error && data) setProfile(data)
      else setProfile(null)
    })
}

async function syncProfileFromAuth(): Promise<boolean> {
  try {
    const res = await fetch('/api/users/sync-profile', { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const syncedProfileForUser = useRef<string | null>(null)

  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      return getSupabaseClient()
    } catch {
      return null
    }
  }, [])

  const loadAuth = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { data: { user: u }, error: e } = await supabase.auth.getUser()
      if (e) {
        setUser(null)
        setProfile(null)
      } else if (u) {
        setUser(u)
        fetchProfile(supabase, u.id, setProfile)
      } else {
        setUser(null)
        setProfile(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth error')
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    loadAuth()
  }, [supabase, loadAuth])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        syncedProfileForUser.current = null
        return
      }
      if (session?.user) {
        setUser(session.user)
        fetchProfile(supabase, session.user.id, setProfile)
      } else {
        setUser(null)
        setProfile(null)
        syncedProfileForUser.current = null
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // When user has a session but profile_completed is false (e.g. confirmed via Site URL, never hit callback), sync once
  useEffect(() => {
    if (!user || !profile || profile.profile_completed !== false) return
    if (syncedProfileForUser.current === user.id) return
    syncedProfileForUser.current = user.id
    syncProfileFromAuth().then((ok) => {
      if (ok && supabase) fetchProfile(supabase, user.id, setProfile)
    })
  }, [user, profile, supabase])

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, refetch: loadAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
