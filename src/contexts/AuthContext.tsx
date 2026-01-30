'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'
import getSupabaseClient from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Timeout constants - optimized for better reliability
const GET_USER_TIMEOUT = 5000 // 5 seconds for getUser (network call)
const GET_SESSION_TIMEOUT = 3000 // 3 seconds for getSession (cookie read)
const LOAD_AUTH_DEBOUNCE_MS = 500 // Debounce rapid loadAuth calls

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Debounce ref to prevent rapid duplicate calls
  const loadAuthTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(false)

  // Use shared Supabase client instance to avoid multiple GoTrueClient instances
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }
    
    try {
      return getSupabaseClient()
    } catch (err) {
      logger.warn('Failed to get Supabase client', { error: err, context: 'supabase_client_init' })
      return null
    }
  }, [])

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  const loadAuth = useCallback(async () => {
    // Prevent duplicate concurrent calls
    if (isLoadingRef.current) {
      logger.debug('[AuthContext] loadAuth() already in progress, skipping', { context: 'auth_load' })
      return
    }
    
    if (!supabase || !isClient) {
      logger.warn('[AuthContext] Cannot load auth - missing supabase or not client', { hasSupabase: !!supabase, isClient })
      setLoading(false)
      return
    }
    
    // Verify supabase.auth exists
    if (!supabase.auth) {
      logger.error('[AuthContext] supabase.auth is missing', new Error('supabase.auth is missing'), { context: 'auth_load' })
      setLoading(false)
      return
    }
    
    // Verify getUser method exists
    if (typeof supabase.auth.getUser !== 'function') {
      logger.error('[AuthContext] supabase.auth.getUser is not a function', new Error('getUser is not a function'), { context: 'auth_load' })
      setLoading(false)
      return
    }
    
    isLoadingRef.current = true
    
    try {
      setError(null)
      setLoading(true)
      
      logger.debug('[AuthContext] Loading auth - calling getUser()', { context: 'auth_load' })
      
      let user: User | null = null
      let userError: Error | null = null
      
      // Try getUser() first with timeout
      try {
        const getUserPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<{ data: { user: null }, error: Error }>((resolve) => {
          setTimeout(() => {
            logger.debug('[AuthContext] getUser() timed out', { timeout: GET_USER_TIMEOUT, context: 'auth_timeout' })
            resolve({ data: { user: null }, error: new Error('getUser() timed out') })
          }, GET_USER_TIMEOUT)
        })
        
        const result = await Promise.race([getUserPromise, timeoutPromise])
        
        if (result.error && result.error.message === 'getUser() timed out') {
          // getUser() timed out, try getSession() as fallback
          logger.debug('[AuthContext] getUser() timed out, trying getSession() as fallback', { context: 'auth_load' })
          
          try {
            const getSessionPromise = supabase.auth.getSession()
            const sessionTimeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
              setTimeout(() => {
                logger.debug('[AuthContext] getSession() timed out', { timeout: GET_SESSION_TIMEOUT, context: 'auth_timeout' })
                resolve({ data: { session: null }, error: new Error('getSession() timed out') })
              }, GET_SESSION_TIMEOUT)
            })
            
            const sessionResult = await Promise.race([getSessionPromise, sessionTimeoutPromise])
            const { data: { session }, error: sessionError } = sessionResult
            
            if (session?.user && !sessionError) {
              logger.debug('[AuthContext] getSession() succeeded', { userId: session.user.id, context: 'auth_load' })
              user = session.user
              userError = null
            } else {
              logger.warn('[AuthContext] getSession() also failed', { hasSession: !!session, hasError: !!sessionError, errorMessage: sessionError?.message, context: 'auth_load' })
              user = null
              userError = sessionError || new Error('Both getUser() and getSession() failed')
            }
          } catch (sessionErr) {
            logger.error('[AuthContext] Error in getSession() fallback', sessionErr, { context: 'auth_load' })
            user = null
            userError = sessionErr instanceof Error ? sessionErr : new Error('getSession() error')
          }
        } else {
          // getUser() succeeded
          logger.debug('[AuthContext] getUser() succeeded', { hasUser: !!result.data?.user, context: 'auth_load' })
          user = result.data?.user || null
          userError = result.error || null
        }
      } catch (err) {
        logger.error('[AuthContext] Error in getUser/getSession flow', err, { context: 'auth_load' })
        // Try getSession() as last resort
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (session?.user && !sessionError) {
            logger.debug('[AuthContext] Fallback getSession() succeeded', { userId: session.user.id, context: 'auth_load' })
            user = session.user
            userError = null
          } else {
            user = null
            userError = sessionError || (err instanceof Error ? err : new Error('Unknown error'))
          }
        } catch (fallbackErr) {
          logger.error('[AuthContext] Fallback getSession() also failed', fallbackErr, { context: 'auth_load' })
          user = null
          userError = err instanceof Error ? err : new Error('Unknown error')
        }
      }
      
      logger.debug('[AuthContext] Auth result', { hasUser: !!user, hasError: !!userError, errorMessage: userError?.message, userId: user?.id, context: 'auth_load' })
      
      if (userError) {
        // Handle timeout errors gracefully - don't throw, just treat as no user
        if (userError.message?.includes('timed out')) {
          logger.debug('[AuthContext] Auth methods timed out - treating as no user', { errorMessage: userError.message, context: 'auth_timeout' })
          setUser(null)
          setProfile(null)
          setLoading(false)
          setIsInitialized(true)
          isLoadingRef.current = false
          return
        }
        
        // If it's a cookie parsing error, just clear state
        if (userError.message?.includes('parse') || userError.message?.includes('cookie')) {
          logger.warn('[AuthContext] Cookie parsing error - clearing state', { context: 'auth_load' })
          setUser(null)
          setProfile(null)
          setLoading(false)
          setIsInitialized(true)
          isLoadingRef.current = false
          return
        }
        
        // For other errors, log but don't throw - just treat as no user
        logger.warn('[AuthContext] User validation error - treating as no user', { error: userError, context: 'user_validation', errorCode: (userError as any).code, errorMessage: userError.message })
        setUser(null)
        setProfile(null)
        setLoading(false)
        setIsInitialized(true)
        isLoadingRef.current = false
        return
      }
      
      if (user) {
        logger.debug('[AuthContext] User found', { userId: user.id, email: user.email, context: 'auth_load' })
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
              logger.warn('[AuthContext] Profile load error', { error: profileError, userId: user.id, context: 'load_profile' })
              // If it's an RLS error, log it specifically
              if (profileError.code === '42501' || profileError.message?.includes('permission') || profileError.message?.includes('policy')) {
                logger.error('[AuthContext] RLS policy error - user may not have proper permissions', profileError, { userId: user.id, context: 'rls_error' })
              }
            } else if (profileData) {
              logger.debug('[AuthContext] Profile loaded', { profileId: profileData.id, role: profileData.app_role, context: 'load_profile' })
              setProfile(profileData)
            }
          })
      } else {
        logger.warn('[AuthContext] No user found after getUser()/getSession()', { context: 'no_user' })
        setUser(null)
        setProfile(null)
        setLoading(false)
        setIsInitialized(true)
      }
    } catch (err) {
      logger.error('Auth load error', err, { context: 'auth_load' })
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      setUser(null)
      setProfile(null)
      setLoading(false)
      setIsInitialized(true)
    } finally {
      isLoadingRef.current = false
      // Ensure isInitialized is set even if something went wrong
      if (!isInitialized) {
        setIsInitialized(true)
      }
    }
  }, [supabase, isClient, isInitialized])

  // Debounced version of loadAuth to prevent rapid duplicate calls
  const debouncedLoadAuth = useCallback(() => {
    if (loadAuthTimeoutRef.current) {
      clearTimeout(loadAuthTimeoutRef.current)
    }
    
    loadAuthTimeoutRef.current = setTimeout(() => {
      void loadAuth()
    }, LOAD_AUTH_DEBOUNCE_MS)
  }, [loadAuth])

  // Set up auth state change listener immediately when supabase is available
  useEffect(() => {
    if (!supabase || !isClient) {
      return
    }

    logger.debug('[AuthContext] Setting up auth state change listener', { hasSupabase: !!supabase, isClient, context: 'auth_listener' })

    // Listen for auth state changes - set this up immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('[AuthContext] Auth state changed', { event, hasSession: !!session, userId: session?.user?.id, isInitialized, context: 'auth_state_change' })
      
      // For SIGNED_IN, TOKEN_REFRESHED, or USER_UPDATED events, use the session from the event directly
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        logger.debug('[AuthContext] Handling auth event', { event, hasSession: !!session, sessionUserId: session?.user?.id, context: 'auth_state_change' })
        
        try {
          // If we have a session with a user from the event, use it directly instead of calling getUser()
          if (session?.user) {
            logger.debug('[AuthContext] Using session from event', { userId: session.user.id, event, context: 'auth_state_change' })
            setLoading(true)
            setUser(session.user)
            setLoading(false)
            
            // Load profile asynchronously
            void supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
              .then(({ data: profileData, error: profileError }) => {
                if (profileError) {
                  logger.warn('[AuthContext] Profile load error on auth event', { error: profileError, userId: session.user.id, context: 'auth_state_change' })
                } else if (profileData) {
                  logger.debug('[AuthContext] Profile loaded on auth state change', { profileId: profileData.id, role: profileData.app_role, context: 'auth_state_change' })
                  setProfile(profileData)
                }
              })
          } else {
            // No session in event, try to load auth normally (debounced)
            logger.debug('[AuthContext] No session in event, calling loadAuth()', { event, context: 'auth_state_change' })
            setLoading(true)
            debouncedLoadAuth()
          }
        } catch (err) {
          logger.error('[AuthContext] Failed to handle auth event', err, { event, context: 'auth_state_change' })
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        logger.debug('[AuthContext] SIGNED_OUT detected', { context: 'auth_state_change' })
        setUser(null)
        setProfile(null)
        setLoading(false)
      } else if (session?.user) {
        // For other events, validate the user with server to ensure token is valid
        try {
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
                if (profileError) {
                  logger.warn('[AuthContext] Profile load error on auth state change', { error: profileError, userId: user.id, context: 'auth_state_change' })
                } else if (profileData) {
                  logger.debug('[AuthContext] Profile loaded on auth state change', { profileId: profileData.id, role: profileData.app_role, context: 'auth_state_change' })
                  setProfile(profileData)
                }
              })
          } else {
            // Invalid token, clear state
            logger.warn('[AuthContext] Invalid token on auth state change', { error, context: 'auth_state_change' })
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        } catch (err) {
          logger.error('[AuthContext] Error validating user on auth state change', err, { context: 'auth_state_change' })
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

    // Check if there's already a session when setting up the listener
    // This handles the case where SIGNED_IN fired before the listener was set up
    // Use getSession() instead of getUser() to avoid timeout issues
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      logger.debug('[AuthContext] Checking for existing session when setting up listener', { hasSession: !!session, hasUser: !!session?.user, hasError: !!error, isInitialized, context: 'listener_setup' })
      
      // If we have a session and haven't initialized yet, load auth
      if (session?.user && !error && !isInitialized) {
        logger.debug('[AuthContext] Found existing session with user, calling loadAuth()', { userId: session.user.id, context: 'listener_setup' })
        void loadAuth()
      } else if (!session?.user && !isInitialized) {
        // If no session and not initialized, mark as initialized to stop loading
        logger.debug('[AuthContext] No existing session found, marking as initialized', { context: 'listener_setup' })
        setIsInitialized(true)
        setLoading(false)
      }
    }).catch((err) => {
      logger.error('[AuthContext] Error checking for existing session', err, { context: 'listener_setup' })
      // On error, if not initialized, mark as initialized to stop loading
      if (!isInitialized) {
        setIsInitialized(true)
        setLoading(false)
      }
    })

    return () => {
      logger.debug('[AuthContext] Cleaning up auth state change listener', { context: 'auth_listener' })
      if (loadAuthTimeoutRef.current) {
        clearTimeout(loadAuthTimeoutRef.current)
      }
      subscription.unsubscribe()
    }
  }, [supabase, isClient, loadAuth, isInitialized, debouncedLoadAuth])

  // Load auth on mount - separate effect
  useEffect(() => {
    // Only run on client side
    if (!isClient || !supabase) {
      return
    }
    
    // Only load once on mount
    if (!isInitialized) {
      logger.debug('[AuthContext] Initial load - calling loadAuth()', { isClient, hasSupabase: !!supabase, context: 'initial_load' })
      loadAuth().catch((err) => {
        logger.error('[AuthContext] Initial load failed', err, { context: 'initial_load' })
        setIsInitialized(true)
        setLoading(false)
      })
    }
  }, [isClient, supabase, isInitialized, loadAuth])

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
