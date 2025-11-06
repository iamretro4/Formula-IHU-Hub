import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

/**
 * Get current authenticated user and their profile
 * @param supabase - Supabase client instance
 * @returns User and profile data, or null if not authenticated
 */
export async function getCurrentUser(supabase: ReturnType<typeof createClientComponentClient<Database>>) {
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
    console.error('Error getting current user:', error)
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

