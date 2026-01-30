import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'
import { UserRole } from '@/lib/types/database'

type ProfileRole = {
  app_role: string
}

type UserRoleEnum = Database['public']['Enums']['user_role']
const validRoles: UserRoleEnum[] = Object.values(UserRole) as UserRoleEnum[]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('app_role')
      .eq('id', user.id)
      .single() as { data: ProfileRole | null }

    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role')
    const role: UserRoleEnum | null = roleParam && validRoles.includes(roleParam as UserRoleEnum) ? (roleParam as UserRoleEnum) : null

    let query = supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, app_role, created_at, team_id, teams(name, code)')

    if (role) {
      query = query.eq('app_role', role)
    }

    // Only admins can see all users
    if (profile?.app_role !== 'admin') {
      // Non-admins see limited info
      query = supabase
        .from('user_profiles')
        .select('id, first_name, last_name, app_role')
    }

    const { data: users, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Users GET error:', error)
      return NextResponse.json(
        { message: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json(users || [])
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
