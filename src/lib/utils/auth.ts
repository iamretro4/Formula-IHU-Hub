import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'
import { logger } from './logger'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

/** Supabase browser client type (from getSupabaseClient or createBrowserClient) */
export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>

/**
 * Get current authenticated user and their profile
 * @param supabase - Supabase client instance (from getSupabaseClient or createServerSupabase)
 * @returns User and profile data, or null if not authenticated
 */
export async function getCurrentUser(supabase: SupabaseBrowserClient) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return null
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return { user, profile: null }
    }
    
    return { user, profile: profile as UserProfile }
  } catch (error) {
    logger.error('Error getting current user', error, { context: 'get_current_user' })
    return null
  }
}

/**
 * Check if user has required role
 * @param userRole - User's role
 * @param requiredRoles - Array of roles that are allowed
 * @returns True if user has required role
 */
export function hasRole(userRole: string | null | undefined, requiredRoles: string[]): boolean {
  if (!userRole) return false
  return requiredRoles.includes(userRole)
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: string | null | undefined): boolean {
  return userRole === 'admin'
}

