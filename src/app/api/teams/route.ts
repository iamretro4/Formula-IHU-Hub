import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'
import { teamSchema } from '@/lib/validators'

type ProfileWithTeam = {
  app_role: string
  team_id: string | null
}

type ProfileRole = {
  app_role: string
  team_id?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('app_role, team_id')
      .eq('id', user.id)
      .single() as { data: ProfileWithTeam | null }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const country = searchParams.get('country')

    let query = supabase
      .from('teams')
      .select('*, user_profiles!teams_team_id_fkey(id, first_name, last_name, email, app_role)')

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (country) {
      query = query.eq('country', country)
    }

    // Team users can only see their own teams
    if (profile?.app_role === 'team_member' || profile?.app_role === 'team_leader') {
      if (profile.team_id) {
        query = query.eq('id', profile.team_id)
      } else {
        // No team assigned, return empty
        return NextResponse.json([])
      }
    }

    const { data: teams, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Teams GET error:', error)
      return NextResponse.json(
        { message: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    return NextResponse.json(teams || [])
  } catch (error) {
    console.error('Teams GET error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('app_role, team_id')
      .eq('id', user.id)
      .single() as { data: ProfileRole | null }

    // Only team users and admins can create teams
    if (profile?.app_role !== 'admin' && 
        profile?.app_role !== 'team_leader' && 
        profile?.app_role !== 'team_member') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = teamSchema.parse(body)

    // Generate code from team name (first 3 letters uppercase)
    const teamCode = validatedData.name.substring(0, 3).toUpperCase()

    // Check if team name or code already exists
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .or(`name.eq.${validatedData.name},code.eq.${teamCode}`)
      .single()

    if (existingTeam) {
      return NextResponse.json(
        { message: 'Team with this name or code already exists' },
        { status: 400 }
      )
    }

    const insertResult = await supabase
      .from('teams')
      .insert({
        name: validatedData.name,
        code: teamCode,
        country: validatedData.country || null,
        contact_email: validatedData.contactEmail,
        contact_phone: validatedData.contactPhone || null,
      } as any)
      .select()
      .single()

    const team = (insertResult as any).data
    const error = (insertResult as any).error

    if (error) {
      console.error('Teams POST error:', error)
      return NextResponse.json(
        { message: 'Failed to create team' },
        { status: 500 }
      )
    }

    // Update user's team_id if they don't have one
    if (profile && !profile.team_id && team) {
      await supabase
        .from('user_profiles')
        .update({ team_id: team.id } as never)
        .eq('id', user.id)
    }

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Teams POST error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid input data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
