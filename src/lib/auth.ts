// Auth utilities for Supabase-based authentication (user_profiles.app_role)

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

/**
 * Check if user has minimum required role (Supabase user_profiles.app_role).
 */
export function hasMinimumRole(
  userRole: string | null | undefined,
  requiredRole: string
): boolean {
  if (!userRole) return false
  const userRoleStr = typeof userRole === 'string' ? userRole.toLowerCase() : String(userRole).toLowerCase()
  const requiredRoleStr = typeof requiredRole === 'string' ? requiredRole.toLowerCase() : String(requiredRole).toLowerCase()
  const userLevel = supabaseRoleHierarchy[userRoleStr] ?? 0
  const requiredLevel = supabaseRoleHierarchy[requiredRoleStr] ?? 0
  return userLevel >= requiredLevel
}
