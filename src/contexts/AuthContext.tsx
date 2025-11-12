'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Use shared Supabase client instance to avoid multiple GoTrueClient instances
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }
    
    try {
      return getSupabaseClient()
    } catch (err) {
      console.warn('Failed to get Supabase client:', err)
      return null
    }
  }, [])

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  const loadAuth = useCallback(async () => {
    if (!supabase || !isClient) {
      setLoading(false)
      return
    }
    
    try {
      setError(null)
      setLoading(true)
      
      console.log('[AuthContext] Loading auth...')
      
      // Use getSession() first to check cookies, then validate with getUser()
      // This is faster for initial load
      // Wrap in try-catch to handle cookie parsing errors gracefully
      let session, sessionError
      try {
        const result = await supabase.auth.getSession()
        session = result.data.session
        sessionError = result.error
      } catch (err) {
        // Handle cookie parsing errors
        console.warn('[AuthContext] Session retrieval error (possibly malformed cookies):', err)
        sessionError = err instanceof Error ? err : new Error('Failed to get session')
        session = null
      }
      
      if (sessionError) {
        console.error('[AuthContext] Session error:', sessionError)
        // Don't throw if it's a cookie parsing error - just clear state
        if (sessionError.message?.includes('parse') || sessionError.message?.includes('cookie')) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          setIsInitialized(true)
          return
        }
        throw sessionError
      }
      
      if (session?.user) {
        // Validate token with server
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('[AuthContext] User validation error:', userError)
          throw userError
        }
        
        if (user) {
          console.log('[AuthContext] User found:', user.id)
          setUser(user)
          setLoading(false) // Set loading to false immediately when we have a user
          
          // Load profile asynchronously - don't block on it
          void supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(({ data: profileData, error: profileError }) => {
              if (profileError) {
                console.warn('[AuthContext] Profile load error:', profileError)
              } else if (profileData) {
                console.log('[AuthContext] Profile loaded:', profileData.id)
                setProfile(profileData)
              }
            })
        } else {
          console.log('[AuthContext] No user after validation')
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } else {
        console.log('[AuthContext] No session found')
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    } catch (err) {
      console.error('Auth load error:', err)
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      setUser(null)
      setProfile(null)
      setLoading(false)
    } finally {
      setIsInitialized(true)
    }
  }, [supabase, isClient])

  useEffect(() => {
    // Only run on client side
    if (!isClient || !supabase) {
      setLoading(false)
      setIsInitialized(true)
      return
    }
    
    // Only load once on mount
    if (!isInitialized) {
      loadAuth()
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (session?.user) {
        // Validate the user with server to ensure token is valid
        const { data: { user }, error } = await supabase.auth.getUser()
        if (user && !error) {
          setUser(user)
          setLoading(false)
          // Load profile asynchronously
          void supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            .then(({ data: profileData, error: profileError }) => {
              if (!profileError && profileData) {
                setProfile(profileData)
              }
            })
        } else {
          // Invalid token, clear state
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, isInitialized, isClient, loadAuth])

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
