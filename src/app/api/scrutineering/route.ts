import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'
import { hasMinimumRole } from '@/lib/auth'

type ProfileRole = {
  app_role: string
}

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
      .single() as { data: ProfileRole | null }

    // Only scrutineers, judges, and admins can view scrutineering
    if (!profile || !hasMinimumRole(profile.app_role || '', 'scrutineer' as any)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const vehicleId = searchParams.get('vehicleId')
    const scrutineerId = searchParams.get('scrutineerId')

    let query = supabase
      .from('bookings')
      .select(`
        *,
        teams(id, name, code, country),
        inspection_types(id, name, key),
        inspection_results(*)
      `)

    if (status) {
      query = query.eq('status', status)
    }

    if (scrutineerId) {
      query = query.eq('assigned_scrutineer_id', scrutineerId)
    }

    const { data: bookings, error } = await query.order('date', { ascending: false })

    if (error) {
      console.error('Scrutineering GET error:', error)
      return NextResponse.json(
        { message: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    // Filter by vehicle if needed (would need to join through teams)
    let filteredBookings = bookings || []
    if (vehicleId) {
      // This would require a more complex query or filtering
      // For now, return all and let client filter if needed
    }

    return NextResponse.json(filteredBookings)
  } catch (error) {
    console.error('Scrutineering GET error:', error)
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
      .select('app_role')
      .eq('id', user.id)
      .single() as { data: ProfileRole | null }

    // Only scrutineers and admins can create scrutineering sessions
    if (!profile || !hasMinimumRole(profile.app_role || '', 'scrutineer' as any)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { teamId, inspectionTypeId, date, startTime, endTime, notes } = body

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { message: 'Team not found' },
        { status: 404 }
      )
    }

    // Verify inspection type exists
    const { data: inspectionType, error: typeError } = await supabase
      .from('inspection_types')
      .select('id')
      .eq('id', inspectionTypeId)
      .single()

    if (typeError || !inspectionType) {
      return NextResponse.json(
        { message: 'Inspection type not found' },
        { status: 404 }
      )
    }

    // Check for scheduling conflicts
    const { data: conflictingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('inspection_type_id', inspectionTypeId)
      .eq('date', date)
      .eq('start_time', startTime)
      .in('status', ['upcoming', 'ongoing'])
      .single()

    if (conflictingBooking) {
      return NextResponse.json(
        { message: 'Time slot already booked' },
        { status: 400 }
      )
    }

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        team_id: teamId,
        inspection_type_id: inspectionTypeId,
        date,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        created_by: user.id,
        status: 'upcoming',
      } as any)
      .select(`
        *,
        teams(id, name, code, country),
        inspection_types(id, name, key)
      `)
      .single()

    if (error) {
      console.error('Scrutineering POST error:', error)
      return NextResponse.json(
        { message: 'Failed to create booking' },
        { status: 500 }
      )
    }

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Scrutineering POST error:', error)
    
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
