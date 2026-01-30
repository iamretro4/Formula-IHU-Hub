import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'
import { vehicleSchema } from '@/lib/validators'

type ProfileWithTeam = {
  app_role: string
  team_id: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
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
    const teamId = searchParams.get('teamId')

    // vehicles table exists in DB but may be missing from generated Database types
    let query = (supabase as any)
      .from('vehicles')
      .select('*, teams(id, name, code, country)')

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,chassis_number.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    // Team users can only see their team's vehicles
    if (profile?.app_role === 'team_member' || profile?.app_role === 'team_leader') {
      if (profile.team_id) {
        query = query.eq('team_id', profile.team_id)
      } else {
        return NextResponse.json([])
      }
    }

    const { data: vehicles, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Vehicles GET error:', error)
      return NextResponse.json(
        { message: 'Failed to fetch vehicles' },
        { status: 500 }
      )
    }

    return NextResponse.json(vehicles || [])
  } catch (error) {
    console.error('Vehicles GET error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
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

    // vehicles table exists in DB but may be missing from generated Database types
    const vehiclesSupabase = supabase as any
    // Only team users and admins can create vehicles
    if (profile?.app_role !== 'admin' && 
        profile?.app_role !== 'team_leader' && 
        profile?.app_role !== 'team_member') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { teamId, ...vehicleData } = body
    const validatedData = vehicleSchema.parse(vehicleData)

    // Verify team exists and user has access
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId || profile?.team_id)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { message: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user is member of the team (unless admin)
    if (profile?.app_role !== 'admin') {
      if (teamId && teamId !== profile?.team_id) {
        return NextResponse.json(
          { message: 'You can only create vehicles for your own team' },
          { status: 403 }
        )
      }
    }

    const insertResult = await (supabase as any)
      .from('vehicles')
      .insert({
        ...validatedData,
        team_id: teamId || profile?.team_id,
      } as any)
      .select('*, teams(id, name, code, country)')
      .single()

    const vehicle = (insertResult as any).data
    const error = (insertResult as any).error

    if (error) {
      console.error('Vehicles POST error:', error)
      return NextResponse.json(
        { message: 'Failed to create vehicle' },
        { status: 500 }
      )
    }

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error('Vehicles POST error:', error)
    
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
