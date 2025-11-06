import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('app_role')
      .eq('id', user.id)
      .single()

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    let query = supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, app_role, created_at, team_id, teams(name, code)')

    if (role) {
      query = query.eq('app_role', role)
    }

    // Only admins can see all users
    if (profile?.app_role !== 'admin') {
      // Non-admins see limited info
      query = query.select('id, first_name, last_name, app_role')
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
