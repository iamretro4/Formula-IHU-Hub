// Auth utilities for Supabase-based authentication
// Supports both Supabase roles and legacy Prisma roles for compatibility

import { authOptions } from './validations/auth'
import { UserRole } from '@prisma/client'

export { authOptions }

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
const prismaRoleHierarchy: Record<UserRole, number> = {
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
  userRole: string | UserRole | null | undefined,
  requiredRole: string | UserRole
): boolean {
  if (!userRole) return false

  // Normalize roles to lowercase for comparison
  const userRoleStr = typeof userRole === 'string' ? userRole.toLowerCase() : userRole
  const requiredRoleStr = typeof requiredRole === 'string' ? requiredRole.toLowerCase() : requiredRole

  // Check Supabase roles first
  const userLevel = supabaseRoleHierarchy[userRoleStr] ?? prismaRoleHierarchy[userRole as UserRole] ?? 0
  const requiredLevel = supabaseRoleHierarchy[requiredRoleStr] ?? prismaRoleHierarchy[requiredRole as UserRole] ?? 0

  return userLevel >= requiredLevel
}

