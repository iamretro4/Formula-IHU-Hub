// Auth utilities for Supabase-based authentication
// Supports both Supabase roles and legacy Prisma roles for compatibility

// Note: authOptions export removed to avoid next-auth dependency issues
// If needed, import directly from './validations/auth'

// Supabase role hierarchy (from database schema)
const supabaseRoleHierarchy: Record<string, number> = {
  viewer: 0,
  team_member: 1,
  team_leader: 2,
  inspection_responsible: 3,
  scrutineer: 4,
  design_judge_software: 5,
  design_judge_mechanical: 5,
  design_judge_electronics: 5,
  design_judge_overall: 5,
  bp_judge: 5,
  cm_judge: 5,
  track_marshal: 4,
  admin: 10,
}

// Legacy Prisma role hierarchy (for backward compatibility)
// Using string keys instead of Prisma enum to avoid build-time dependencies
const prismaRoleHierarchy: Record<string, number> = {
  VIEWER: 0,
  TEAM_USER: 1,
  TEAM_LEADER: 2,
  INSPECTION_RESPONSIBLE: 3,
  SCRUTINEER: 4,
  JUDGE: 5,
  ADMIN: 10,
}

/**
 * Check if user has minimum required role
 * Supports both Supabase string roles and Prisma enum roles
 */
export function hasMinimumRole(
  userRole: string | null | undefined,
  requiredRole: string
): boolean {
  if (!userRole) return false

  // Normalize roles to lowercase for comparison
  const userRoleStr = typeof userRole === 'string' ? userRole.toLowerCase() : String(userRole).toLowerCase()
  const requiredRoleStr = typeof requiredRole === 'string' ? requiredRole.toLowerCase() : String(requiredRole).toLowerCase()

  // Check Supabase roles first, then Prisma roles
  const userLevel = supabaseRoleHierarchy[userRoleStr] ?? prismaRoleHierarchy[userRoleStr.toUpperCase()] ?? 0
  const requiredLevel = supabaseRoleHierarchy[requiredRoleStr] ?? prismaRoleHierarchy[requiredRoleStr.toUpperCase()] ?? 0

  return userLevel >= requiredLevel
}

