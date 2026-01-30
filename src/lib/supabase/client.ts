// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'
import { logger } from '@/lib/utils/logger'

// Use global window property to persist client across hot reloads
declare global {
  interface Window {
    __supabaseClient?: ReturnType<typeof createBrowserClient<Database>>
    __supabaseAuthListenerSet?: boolean
  }
}

// Lazy initialization to avoid build-time errors
// Use module-level variable for SSR, window property for client-side persistence
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Clean up malformed cookies that might cause parsing errors
function cleanupMalformedCookies() {
  if (typeof window === 'undefined') return
  
  try {
    // Get all cookies
    const cookies = document.cookie.split(';')
    const domain = window.location.hostname
    const path = '/'
    
    cookies.forEach((cookie) => {
      const [namePart] = cookie.split('=')
      const trimmedName = namePart.trim()
      
      // Clear any Supabase-related cookies
      if (trimmedName.startsWith('sb-') || trimmedName.includes('supabase') || trimmedName.includes('supabase-auth-token')) {
        const value = cookie.substring(namePart.length + 1).trim()
        
        // If cookie has a value, try to validate it
        if (value) {
          try {
            // Try to decode and parse if it looks like JSON
            const decoded = decodeURIComponent(value)
            if (decoded.startsWith('{') || decoded.startsWith('[')) {
              JSON.parse(decoded)
            }
          } catch (parseError) {
            // Cookie is malformed - clear it aggressively
            // Clear with all possible combinations to ensure it's gone
            const clearOptions = [
              `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`,
              `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`,
              `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=.${domain}`,
              `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=None; Secure`,
              `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; SameSite=Lax`,
            ]
            
            clearOptions.forEach(clearCookie => {
              try {
                document.cookie = clearCookie
              } catch {
                // Ignore errors when clearing cookies
              }
            })
          }
        }
      }
    })
  } catch (err) {
    // Silently fail - cookie cleanup is best effort
    // Don't log to avoid console spam
  }
}

/** Returns true when Supabase env vars are set (avoids throwing in UI when missing). */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Helper function to refresh session if needed
async function ensureValidSession(client: ReturnType<typeof createBrowserClient<Database>>) {
  try {
    // Add timeout to prevent hanging
    const getSessionPromise = client.auth.getSession()
    const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
      setTimeout(() => {
        resolve({ data: { session: null }, error: new Error('getSession() timed out') })
      }, 3000)
    })
    
    const { data: { session }, error: sessionError } = await Promise.race([getSessionPromise, timeoutPromise])
    
    // If no session or error, try to refresh
    if (sessionError || !session) {
      // Try to get user which will refresh the token if possible (with timeout)
      const getUserPromise = client.auth.getUser()
      const getUserTimeoutPromise = new Promise<{ data: { user: null }, error: Error }>((resolve) => {
        setTimeout(() => {
          resolve({ data: { user: null }, error: new Error('getUser() timed out') })
        }, 3000)
      })
      
      const { data: { user }, error: userError } = await Promise.race([getUserPromise, getUserTimeoutPromise])
      if (userError || !user) {
        return false
      }
      return true
    }
    
    // Check if session is about to expire (within 5 minutes)
    if (session.expires_at) {
      const expiresAt = session.expires_at * 1000 // Convert to milliseconds
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000
      
      if (expiresAt - now < fiveMinutes) {
        // Refresh the session
        const { error: refreshError } = await client.auth.refreshSession()
        if (refreshError) {
          return false
        }
      }
    }
    
    return true
  } catch (err) {
    logger.warn('ensureValidSession failed', { error: err, context: 'supabase_client' })
    return false
  }
}

export default function getSupabaseClient() {
  // Always clean up cookies first (even if client exists) to handle new malformed cookies
  if (typeof window !== 'undefined') {
    cleanupMalformedCookies()
    
    // Check if client exists in window (survives hot reloads)
    if (window.__supabaseClient) {
      supabaseClient = window.__supabaseClient
      
      // Set up auth state change listener to handle token refresh (only once)
      if (!window.__supabaseAuthListenerSet) {
        window.__supabaseAuthListenerSet = true
        
        // Set up listener for auth state changes
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
          logger.debug('Auth state changed in client', { event, hasSession: !!session, context: 'supabase_client' })
          
          // Handle token refresh
          if (event === 'TOKEN_REFRESHED' && session && supabaseClient) {
            // Session refreshed successfully - verify it's valid
            try {
              await supabaseClient.auth.getUser()
              logger.debug('Token refresh validated', { context: 'supabase_client' })
            } catch (err) {
              logger.warn('Token refresh validation failed', { error: err, context: 'supabase_client' })
            }
          } else if (event === 'SIGNED_OUT') {
            // Clear the client to force reconnection
            logger.debug('User signed out, clearing client', { context: 'supabase_client' })
            if (typeof window !== 'undefined') {
              window.__supabaseClient = undefined
              supabaseClient = null
            }
        } else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && supabaseClient) {
          // Ensure session is valid after sign in or user update
          try {
            if (supabaseClient) {
              const valid = await ensureValidSession(supabaseClient)
              logger.debug('Session validated after auth event', { valid, event, context: 'supabase_client' })
            }
          } catch (err) {
            logger.warn('Session validation failed after auth event', { error: err, context: 'supabase_client' })
          }
        }
        })
      }
      
      return supabaseClient
    }
  }
  
  // Create new client if it doesn't exist
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    
    supabaseClient = createBrowserClient<Database>(url, key)
    
    // Set up auth state change listener
    if (typeof window !== 'undefined') {
      window.__supabaseClient = supabaseClient
      window.__supabaseAuthListenerSet = true
      
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        logger.debug('Auth state changed in new client', { event, hasSession: !!session, context: 'supabase_client' })
        
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && session && supabaseClient) {
          // Session refreshed successfully
          try {
            await supabaseClient.auth.getUser()
            logger.debug('Token refresh validated', { context: 'supabase_client' })
          } catch (err) {
            logger.warn('Token refresh validation failed', { error: err, context: 'supabase_client' })
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear the client to force reconnection
          logger.debug('User signed out, clearing client', { context: 'supabase_client' })
          if (typeof window !== 'undefined') {
            window.__supabaseClient = undefined
            supabaseClient = null
          }
        } else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && supabaseClient) {
          // Ensure session is valid after sign in or user update
          try {
            const valid = await ensureValidSession(supabaseClient)
            logger.debug('Session validated after auth event', { valid, event, context: 'supabase_client' })
          } catch (err) {
            logger.warn('Session validation failed after auth event', { error: err, context: 'supabase_client' })
          }
        }
      })
    }
  }
  
  return supabaseClient
}

// Export helper function for components to use
export async function refreshSupabaseSession(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false
  try {
    const client = getSupabaseClient()
    return await ensureValidSession(client)
  } catch {
    return false
  }
}

// Helper function to ensure client has valid session before making queries
// Call this before important queries to ensure connection is maintained
export async function ensureSupabaseConnection() {
  const client = getSupabaseClient()
  
  try {
    // Verify we have a valid session
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    
    if (sessionError || !session) {
      // Try to refresh/get user
      const { data: { user }, error: userError } = await client.auth.getUser()
      if (userError || !user) {
        logger.warn('No valid Supabase connection', { sessionError, userError, context: 'supabase_connection' })
        return false
      }
    }
    
    // Check if session is about to expire and refresh if needed
    if (session?.expires_at) {
      const expiresAt = session.expires_at * 1000
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000
      
      if (expiresAt - now < fiveMinutes) {
        const { error: refreshError } = await client.auth.refreshSession()
        if (refreshError) {
          logger.warn('Failed to refresh session', { error: refreshError, context: 'supabase_connection' })
          return false
        }
      }
    }
    
    return true
  } catch (err) {
    logger.error('Connection verification failed', err, { context: 'supabase_connection' })
    return false
  }
}
