import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyInspectionReminder } from '@/lib/discord'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/discord/reminders
 *
 * Called periodically (every 5 minutes via cron or client-side polling) to
 * check for upcoming inspections within the next 15 minutes and send
 * Discord reminders for bookings that haven't been reminded yet.
 *
 * Uses a simple in-memory set to track which bookings have already been
 * notified. In production with multiple instances you'd persist this in
 * the database, but for a single-deployment Formula Student event this is
 * more than sufficient.
 */

// Track which booking IDs have already triggered a reminder
const remindedBookings = new Set<string>()

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current time in the event timezone
    const now = new Date()
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    // Today's date in YYYY-MM-DD format (using event timezone)
    const eventTz = process.env.NEXT_PUBLIC_EVENT_TIMEZONE || 'Europe/Athens'
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: eventTz }) // YYYY-MM-DD format

    // Get all upcoming bookings for today
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id, date, start_time, end_time, status, team_id,
        teams(name, code, vehicle_class),
        inspection_types(name)
      `)
      .eq('date', todayStr)
      .in('status', ['upcoming', 'confirmed', 'pending'])
      .order('start_time')

    if (bookingsError) {
      logger.error('[Discord Reminders] Error fetching bookings', bookingsError)
      return NextResponse.json({ error: bookingsError.message }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No upcoming bookings for today' })
    }

    let sentCount = 0

    for (const booking of bookings) {
      // Skip if already reminded
      if (remindedBookings.has(booking.id)) continue

      // Parse the start_time (HH:MM format) into a full Date for today
      const [hours, minutes] = (booking.start_time || '00:00').split(':').map(Number)
      const bookingTime = new Date(now)
      bookingTime.setHours(hours, minutes, 0, 0)

      // Check if the booking is between 5 and 15 minutes from now
      // (This window ensures we catch it during polling intervals)
      if (bookingTime > fiveMinutesFromNow && bookingTime <= fifteenMinutesFromNow) {
        const team = Array.isArray((booking as any).teams) 
          ? (booking as any).teams[0] 
          : (booking as any).teams
        const inspectionType = Array.isArray((booking as any).inspection_types) 
          ? (booking as any).inspection_types[0] 
          : (booking as any).inspection_types

        if (team && inspectionType) {
          const success = await notifyInspectionReminder({
            teamName: team.name || 'Unknown Team',
            teamCode: team.code || '??',
            inspectionType: inspectionType.name || 'Inspection',
            startTime: booking.start_time,
            date: booking.date,
            vehicleClass: team.vehicle_class || undefined,
          })

          if (success) {
            remindedBookings.add(booking.id)
            sentCount++
            logger.info(`[Discord Reminders] Sent reminder for booking ${booking.id}`, {
              team: team.code,
              type: inspectionType.name,
              time: booking.start_time,
            })
          }
        }
      }
    }

    // Clean up old entries (bookings from past hours)
    // This prevents memory leak during long-running sessions
    if (remindedBookings.size > 200) {
      remindedBookings.clear()
    }

    return NextResponse.json({ sent: sentCount, checked: bookings.length })
  } catch (error) {
    logger.error('[Discord Reminders] Unexpected error', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
