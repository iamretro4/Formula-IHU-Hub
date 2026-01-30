'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  Loader2, 
  Info, 
  ArrowLeft, 
  Trash2, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Wrench,
  Battery,
  Plus,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { DateTime } from 'luxon'
import { logger } from '@/lib/utils/logger'

const EEST_ZONE = 'Europe/Athens'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Electrical: <Zap className="w-5 h-5" />,
  Mechanical: <Wrench className="w-5 h-5" />,
  Accumulator: <Battery className="w-5 h-5" />,
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  Electrical: { 
    bg: 'bg-yellow-50', 
    text: 'text-yellow-800', 
    border: 'border-yellow-300',
    gradient: 'from-yellow-50 to-yellow-100/50'
  },
  Mechanical: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-800', 
    border: 'border-blue-300',
    gradient: 'from-blue-50 to-blue-100/50'
  },
  Accumulator: { 
    bg: 'bg-green-50', 
    text: 'text-green-800', 
    border: 'border-green-300',
    gradient: 'from-green-50 to-green-100/50'
  },
}

type InspectionTypeCard = {
  id: string
  name: string
  duration_minutes: number
  concurrent_slots: number
  prerequisites?: string[]
  key: string
  active: boolean
  can_book: boolean
  passed: boolean
  subtitle?: string
}

type Team = {
  id: string
  name: string
}

type Booking = {
  id: string
  team_id: string
  inspection_type_id: string
  date: string
  start_time: string
  end_time: string
  resource_index: number
  status: string
  notes?: string
  is_rescrutineering: boolean
  created_by: string
  teams?: {
    name: string
  }
}

export default function ScrutineeringBookPage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [inspectionTypes, setInspectionTypes] = useState<InspectionTypeCard[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [adminViewTeam, setAdminViewTeam] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedInspectionType, setSelectedInspectionType] = useState<InspectionTypeCard | null>(null)
  const [reservedSlots, setReservedSlots] = useState<Record<string, number>>({})
  const [teamBookings, setTeamBookings] = useState<Booking[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [notes, setNotes] = useState('')
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const supabase = useMemo(() => getSupabaseClient(), [])
  const todayDate = DateTime.now().setZone(EEST_ZONE).toISODate() ?? new Date().toISOString().split('T')[0]
  const adminViewTeamRef = useRef<string | null>(null)
  const effectRunIdRef = useRef(0)

  // Team leaders only get User Management; redirect if they hit scrutineering
  const router = useRouter()
  useEffect(() => {
    if (authLoading || !authProfile) return
    if (authProfile.app_role === 'team_leader') {
      router.replace('/dashboard')
    }
  }, [authLoading, authProfile, router])

  // Set adminViewTeam when profile/teams change (separate effect to avoid dependency cycle)
  useEffect(() => {
    if (authLoading || !authProfile) return
    
    if (authProfile.app_role === 'admin' && teams.length > 0) {
      if (!adminViewTeam) {
        const firstTeamId = teams[0].id
        setAdminViewTeam(firstTeamId)
        adminViewTeamRef.current = firstTeamId
      } else {
        adminViewTeamRef.current = adminViewTeam
      }
    } else if (authProfile.team_id && !adminViewTeam) {
      setAdminViewTeam(authProfile.team_id)
      adminViewTeamRef.current = authProfile.team_id
    } else if (adminViewTeam) {
      adminViewTeamRef.current = adminViewTeam
    }
  }, [authLoading, authProfile, teams, adminViewTeam])

  // Initial load - only depends on auth, not on adminViewTeam to avoid cycles
  useEffect(() => {
    // Increment run ID to track this effect execution
    const currentRunId = ++effectRunIdRef.current
    // Reset loading state when effect runs
    setInitialLoading(true)
    setError(null)
    
    // Wait for auth to be ready and profile to be loaded
    if (authLoading || !user || !authProfile) {
      if (currentRunId === effectRunIdRef.current) {
        setInitialLoading(false)
      }
      return
    }
    
    let active = true
    ;(async () => {
      try {
        setUserRole(authProfile.app_role ?? null)
      
      // Load teams for admin first (admins can book for any team)
      let targetTeamId: string | null = null
      if (authProfile.app_role === 'admin') {
        const { data: allTeams, error: teamsError } = await supabase.from('teams').select('id, name').order('name')
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (teamsError) {
          logger.error('[Booking] Error loading teams', teamsError, { context: 'load_teams' })
          if (active && currentRunId === effectRunIdRef.current) {
            setError(`Failed to load teams: ${teamsError.message}`)
            setInitialLoading(false)
          }
          return
        }
        const loadedTeams = (allTeams || []) as Team[]
        setTeams(loadedTeams)
        
        if (loadedTeams.length === 0) {
          if (active && currentRunId === effectRunIdRef.current) {
            setError('No teams found in the database. Please contact an administrator.')
            setInitialLoading(false)
          }
          return
        }
        
        // Use adminViewTeam from ref/state if set, otherwise use first team from just-loaded teams
        targetTeamId = adminViewTeamRef.current ?? adminViewTeam ?? (loadedTeams.length > 0 ? loadedTeams[0].id : null)
        if (!adminViewTeam && loadedTeams.length > 0) {
          setAdminViewTeam(loadedTeams[0].id)
          adminViewTeamRef.current = loadedTeams[0].id
        }
      } else {
        // For non-admin users, require team_id
        if (!authProfile.team_id) {
          if (active && currentRunId === effectRunIdRef.current) {
            setError('No team profile found. Please complete your profile first.')
            setInitialLoading(false)
          }
          return
        }
        // Set teamId for non-admin users
        setTeamId(authProfile.team_id)
        targetTeamId = authProfile.team_id
        if (!adminViewTeam) {
          setAdminViewTeam(authProfile.team_id)
          adminViewTeamRef.current = authProfile.team_id
        }
      }
      
      if (!targetTeamId) {
        if (active && currentRunId === effectRunIdRef.current) {
          setError(authProfile.app_role === 'admin' ? 'Please select a team to book for' : 'No team selected')
          setInitialLoading(false)
        }
        return
      }
      
      // Verify authentication before querying
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!active || currentRunId !== effectRunIdRef.current) return
      if (sessionError) {
        logger.error('[Booking] Session error', sessionError, { context: 'session_check' })
        setError(`Authentication error: ${sessionError.message}`)
        setInitialLoading(false)
        return
      }
      if (!session) {
        logger.error('[Booking] No active session found', undefined, { context: 'session_check' })
        setError('Not authenticated. Please sign in again.')
        setInitialLoading(false)
        return
      }
      logger.debug('[Booking] Session verified', { userId: session.user.id })
      
      logger.debug('[Booking] Fetching inspection types from database')
      const { data: types, error: typesError } = await supabase
        .from('inspection_types')
        .select('id, name, duration_minutes, concurrent_slots, prerequisites, active, key')
        .order('sort_order', { ascending: true })
      if (!active || currentRunId !== effectRunIdRef.current) return
      if (typesError) {
        logger.error('[Booking] Error fetching inspection types', typesError, { context: 'fetch_inspection_types' })
        setError(`Failed to load inspection types: ${typesError.message}`)
        setInitialLoading(false)
        return
      }
      logger.debug('[Booking] Inspection types query result', { 
        count: types?.length || 0, 
        types: types?.map(t => ({ id: t.id, name: t.name, active: t.active })) 
      })
      if (!types || types.length === 0) {
        logger.warn('[Booking] No inspection types found in database', { context: 'fetch_inspection_types' })
        setError('No inspection types found in the database. Please contact an administrator.')
        setInitialLoading(false)
        return
      }
      
      // Get bookings with their inspection results to check pass/fail status
      const { data: teamB, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          team_id,
          inspection_type_id, 
          date,
          start_time,
          end_time,
          resource_index,
          status,
          notes,
          is_rescrutineering,
          created_by,
          inspection_results(status)
        `)
        .eq('team_id', targetTeamId)
      if (!active || currentRunId !== effectRunIdRef.current) return
      if (bookingsError) {
        setError(bookingsError.message)
        setInitialLoading(false)
        return
      }
      
      setTeamBookings((teamB ?? []) as Booking[])
      if (!active || currentRunId !== effectRunIdRef.current) return
      
      logger.debug('[Booking] Processing inspection types', { count: types?.length || 0 })
      const processedTypes = ((types ?? []) as any[]).map((t: any) => {
          // Check if passed - look at inspection_results status, not bookings status
          const passed = (teamB as any[])?.some(
            (b: any) => b.inspection_type_id === t.id && 
            b.inspection_results && 
            Array.isArray(b.inspection_results) && 
            b.inspection_results.length > 0 &&
            b.inspection_results[0]?.status === 'passed'
          )
          
          // Check if team has an active booking (booking status is not completed, cancelled, or no_show)
          const hasActiveBooking = (teamB as any[])?.some(
            (b: any) => b.inspection_type_id === t.id && 
            !['completed', 'cancelled', 'no_show'].includes(b.status)
          )
          
          let prerequisitesMet = true
          if (Array.isArray(t.prerequisites) && t.prerequisites.length > 0) {
            for (const reqKey of t.prerequisites) {
              const prereqType = ((types ?? []) as any[]).find((tt: any) => tt.key === reqKey)
              if (prereqType) {
                // Check if prerequisite passed - look at inspection_results
                const prereqPassed = (teamB as any[])?.some(
                  (b: any) => b.inspection_type_id === prereqType.id && 
                  b.inspection_results && 
                  Array.isArray(b.inspection_results) && 
                  b.inspection_results.length > 0 &&
                  b.inspection_results[0]?.status === 'passed'
                )
                if (!prereqPassed) prerequisitesMet = false
              }
            }
          }
          return {
            id: t.id,
            name: t.name,
            duration_minutes: t.duration_minutes ?? 120,
            concurrent_slots: t.concurrent_slots ?? 1,
            prerequisites: t.prerequisites ?? [],
            key: t.key,
            active: !!t.active,
            can_book: !!t.active && prerequisitesMet && !passed && !hasActiveBooking,
            passed: !!passed,
            subtitle: !prerequisitesMet
              ? `You must pass: ${(Array.isArray(t.prerequisites) ? t.prerequisites.join(', ') : t.prerequisites)} before booking`
              : passed
                ? "Already completed"
                : hasActiveBooking
                  ? "Already has an active booking for this inspection type"
                  : undefined
          }
        })
      logger.debug('[Booking] Processed inspection types', { count: processedTypes.length })
      if (active && currentRunId === effectRunIdRef.current) {
        setInspectionTypes(processedTypes)
        setInitialLoading(false)
      }
      } catch (err) {
        logger.error('[Booking] Unexpected error in initial load', err, { context: 'initial_load' })
        if (active && currentRunId === effectRunIdRef.current) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred')
          setInitialLoading(false)
        }
      }
    })()
    return () => { 
      active = false
      // Don't reset loading state here - let the new effect run handle it
    }
  }, [authLoading, user, authProfile, supabase, adminViewTeam])

  // Reload data when admin changes selected team
  useEffect(() => {
    if (authLoading || !user || !authProfile || !adminViewTeam) return
    if (authProfile.app_role !== 'admin') return // Only for admins
    
    let active = true
    ;(async () => {
      const targetTeamId = adminViewTeam
      if (!targetTeamId) return
      
      // Verify session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !active) return
      
      const { data: types, error: typesError } = await supabase
        .from('inspection_types')
        .select('id, name, duration_minutes, concurrent_slots, prerequisites, active, key')
        .order('sort_order', { ascending: true })
      if (!active) return
      if (typesError || !types) {
        logger.error('[Booking] Error reloading inspection types', typesError, { context: 'reload_inspection_types' })
        return
      }
      
      // Get bookings with their inspection results to check pass/fail status
      const { data: teamB } = await supabase
        .from('bookings')
        .select(`
          id,
          team_id,
          inspection_type_id, 
          date,
          start_time,
          end_time,
          resource_index,
          status,
          notes,
          is_rescrutineering,
          created_by,
          inspection_results(status)
        `)
        .eq('team_id', targetTeamId)
      if (!active) return
      
      setTeamBookings((teamB ?? []) as Booking[])
      
      setInspectionTypes(
        ((types ?? []) as any[]).map((t: any) => {
          // Check if passed - look at inspection_results status, not bookings status
          const passed = (teamB as any[])?.some(
            (b: any) => b.inspection_type_id === t.id && 
            b.inspection_results && 
            Array.isArray(b.inspection_results) && 
            b.inspection_results.length > 0 &&
            b.inspection_results[0]?.status === 'passed'
          )
          
          // Check if team has an active booking (booking status is not completed, cancelled, or no_show)
          const hasActiveBooking = (teamB as any[])?.some(
            (b: any) => b.inspection_type_id === t.id && 
            !['completed', 'cancelled', 'no_show'].includes(b.status)
          )
          
          let prerequisitesMet = true
          if (Array.isArray(t.prerequisites) && t.prerequisites.length > 0) {
            for (const reqKey of t.prerequisites) {
              const prereqType = ((types ?? []) as any[]).find((tt: any) => tt.key === reqKey)
              if (prereqType) {
                // Check if prerequisite passed - look at inspection_results
                const prereqPassed = (teamB as any[])?.some(
                  (b: any) => b.inspection_type_id === prereqType.id && 
                  b.inspection_results && 
                  Array.isArray(b.inspection_results) && 
                  b.inspection_results.length > 0 &&
                  b.inspection_results[0]?.status === 'passed'
                )
                if (!prereqPassed) prerequisitesMet = false
              }
            }
          }
          return {
            id: t.id,
            name: t.name,
            duration_minutes: t.duration_minutes ?? 120,
            concurrent_slots: t.concurrent_slots ?? 1,
            prerequisites: t.prerequisites ?? [],
            key: t.key,
            active: !!t.active,
            can_book: !!t.active && prerequisitesMet && !passed && !hasActiveBooking,
            passed: !!passed,
            subtitle: !prerequisitesMet
              ? `You must pass: ${(Array.isArray(t.prerequisites) ? t.prerequisites.join(', ') : t.prerequisites)} before booking`
              : passed
                ? "Already completed"
                : hasActiveBooking
                  ? "Already has an active booking for this inspection type"
                  : undefined
          }
        })
      )
    })()
    return () => { active = false }
  }, [adminViewTeam, authLoading, user, authProfile, supabase])

  // Reserved slots for selected inspection type, for today
  useEffect(() => {
    if (!selectedInspectionType) { setReservedSlots({}); return }
    (async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, resource_index')
        .eq('inspection_type_id', selectedInspectionType.id)
        .eq('date', todayDate)
      const slots: Record<string, number> = {};
      ((bookings ?? []) as any[]).forEach((b: any) => {
        slots[b.start_time] = (slots[b.start_time] || 0) + 1
      })
      setReservedSlots(slots)
    })()
  }, [selectedInspectionType, supabase, todayDate, ok])

  // For admin management: get all bookings for today/type for display
  useEffect(() => {
    if (!selectedInspectionType) { setAllBookings([]); return }
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, start_time, resource_index, teams(name), team_id, inspection_type_id, date, end_time, status, notes, is_rescrutineering, created_by')
        .eq('inspection_type_id', selectedInspectionType.id)
        .eq('date', todayDate)
      setAllBookings((data ?? []) as unknown as Booking[])
    })()
  }, [selectedInspectionType, supabase, todayDate, ok])

  function getSlots(startTime: string, endTime: string, duration: number) {
    let slots: string[] = []
    let curr = DateTime.fromISO(`${todayDate}T${startTime}:00`, { zone: EEST_ZONE })
    const end = DateTime.fromISO(`${todayDate}T${endTime}:00`, { zone: EEST_ZONE })
    while (curr.plus({ minutes: duration }) <= end) {
      slots.push(curr.toFormat('HH:mm'))
      curr = curr.plus({ minutes: duration })
    }
    return slots
  }

  const slots = selectedInspectionType
    ? getSlots("09:00", "19:00", selectedInspectionType.duration_minutes)
    : []

  function isSlotAvailable(time: string) {
    if (!selectedInspectionType) return false
    const reservedCount = reservedSlots[time] || 0
    return reservedCount < selectedInspectionType.concurrent_slots
  }

  function handleSlotClick(time: string) {
    setSelectedTime(time)
    setError(null)
    setOk(false)
  }

  async function handleConfirmBooking() {
    setLoading(true); setError(null); setOk(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }
      const useTeamId = userRole === 'admin' ? adminViewTeam : teamId
      if (!useTeamId) {
        throw new Error(userRole === 'admin' ? 'Please select a team to book for' : 'No team selected')
      }
      if (!selectedInspectionType || !selectedTime) {
        throw new Error('Please select inspection type and time')
      }

      // Check if team already has an active booking for this inspection type
      // Active means booking status is not 'completed', 'cancelled', or 'no_show'
      const { data: existingBookings, error: existingError } = await supabase
        .from('bookings')
        .select('id, status, date, start_time')
        .eq('team_id', useTeamId)
        .eq('inspection_type_id', selectedInspectionType.id)
        .not('status', 'in', '(completed,cancelled,no_show)')
      
      if (existingError) {
        logger.error('[Booking] Error checking existing bookings', existingError, { context: 'check_existing' })
        throw new Error(`Failed to validate booking: ${existingError.message}`)
      }

      if (existingBookings && existingBookings.length > 0) {
        const existing = existingBookings[0]
        throw new Error(
          `This team already has an active ${selectedInspectionType.name} inspection ` +
          `(${existing.status}) scheduled. ` +
          `Please wait until the current inspection is marked as passed or failed before booking another.`
        )
      }

      // Fetch bookings for this slot and find first available lane
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('resource_index')
        .eq('inspection_type_id', selectedInspectionType.id)
        .eq('date', todayDate)
        .eq('start_time', selectedTime)
      
      if (bookingsError) {
        logger.error('[Booking] Error fetching slot bookings', bookingsError, { context: 'fetch_slot_bookings' })
        throw new Error(`Failed to check slot availability: ${bookingsError.message}`)
      }
      
      const reservedLanes = new Set(((bookings ?? []) as any[]).map((b: any) => b.resource_index))
      let lane = 1;
      while (reservedLanes.has(lane) && lane <= (selectedInspectionType?.concurrent_slots ?? 1)) lane++
      if (lane > (selectedInspectionType?.concurrent_slots ?? 1)) {
        throw new Error('All slots are full. Please refresh and try another time.')
      }

      // Calculate end time
      const endTime = DateTime.fromISO(`${todayDate}T${selectedTime}:00`, { zone: EEST_ZONE })
        .plus({ minutes: selectedInspectionType?.duration_minutes ?? 120 })
        .toFormat('HH:mm')

      // Insert booking
      const bookingData = {
        team_id: useTeamId,
        inspection_type_id: selectedInspectionType.id,
        date: todayDate,
        start_time: selectedTime,
        end_time: endTime,
        resource_index: lane,
        status: 'upcoming' as const,
        notes: notes || null,
        is_rescrutineering: false,
        created_by: user.id
      }

      logger.debug('[Booking] Inserting booking', { 
        teamId: useTeamId, 
        inspectionTypeId: selectedInspectionType.id,
        date: todayDate,
        startTime: selectedTime,
        lane 
      })

      const { error: insertError, data: insertData } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
      
      if (insertError) {
        logger.error('[Booking] Insert error', insertError, { 
          context: 'insert_booking',
          bookingData 
        })
        // Provide more detailed error message
        if (insertError.code === '23505') {
          throw new Error('This booking already exists. Please refresh the page.')
        } else if (insertError.code === '23503') {
          throw new Error('Invalid team or inspection type. Please refresh and try again.')
        } else {
          throw new Error(`Failed to create booking: ${insertError.message}`)
        }
      }

      if (!insertData || insertData.length === 0) {
        throw new Error('Booking was not created. Please try again.')
      }
      
      // Get team name for success message
      const bookingTeamName = userRole === 'admin' 
        ? teams.find(t => t.id === useTeamId)?.name 
        : undefined
      
      const successMessage = bookingTeamName 
        ? `Booking confirmed for ${bookingTeamName}!`
        : 'Booking confirmed successfully!'
      
      toast.success(successMessage)
      
      // Reset form
      setSelectedTime("")
      setNotes("")
      setSelectedInspectionType(null)
      
      // Manually refresh team bookings to update inspection type availability
      if (useTeamId) {
        const { data: refreshedBookings } = await supabase
          .from('bookings')
          .select(`
            id,
            team_id,
            inspection_type_id, 
            date,
            start_time,
            end_time,
            resource_index,
            status,
            notes,
            is_rescrutineering,
            created_by,
            inspection_results(status)
          `)
          .eq('team_id', useTeamId)
        
        if (refreshedBookings) {
          setTeamBookings((refreshedBookings ?? []) as Booking[])
          
          // Need to fetch with inspection_results to check pass status
          const { data: bookingsWithResults } = await supabase
            .from('bookings')
            .select(`
              inspection_type_id, 
              status,
              inspection_results(status)
            `)
            .eq('team_id', useTeamId)
          
          if (bookingsWithResults) {
            // Update inspection types with new booking status
            setInspectionTypes(prev => prev.map(t => {
              // Check if passed - look at inspection_results
              const passed = (bookingsWithResults as any[])?.some(
                (b: any) => b.inspection_type_id === t.id && 
                b.inspection_results && 
                Array.isArray(b.inspection_results) && 
                b.inspection_results.length > 0 &&
                b.inspection_results[0]?.status === 'passed'
              )
              
              // Check if active booking - booking status not completed/cancelled/no_show
              const hasActiveBooking = (bookingsWithResults as any[])?.some(
                (b: any) => b.inspection_type_id === t.id && 
                !['completed', 'cancelled', 'no_show'].includes(b.status)
              )
              
              return {
                ...t,
                can_book: t.active && !passed && !hasActiveBooking,
                subtitle: passed
                  ? "Already completed"
                  : hasActiveBooking
                    ? "Already has an active booking for this inspection type"
                    : t.subtitle
              }
            }))
          }
        }
      }
      
      // Show success screen
      setOk(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create booking'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminDeleteBooking(bookingId: string) {
    if (!confirm('Are you sure you want to delete this booking?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
      if (error) throw error
      toast.success('Booking deleted successfully')
      setOk(true) // triggers refetch
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete booking'
      toast.error(errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Admin team selector
  const adminTeamSelector = userRole === 'admin' && teams.length > 0 && (
    <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 shadow-md">
      <CardHeader className="border-b border-primary/20">
        <CardTitle className="flex items-center gap-2 text-primary">
          <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">A</span>
          Admin Booking Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Team to Book For:
        </label>
        <select
          value={adminViewTeam ?? ''}
          onChange={e => {
            setAdminViewTeam(e.target.value)
            // Reset selection when changing teams
            setSelectedInspectionType(null)
            setSelectedTime("")
            setNotes("")
            setError(null)
          }}
          className="w-full px-4 py-3 rounded-lg border-2 border-primary/30 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-semibold text-gray-900"
        >
          {teams.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
          <Info className="w-3 h-3" />
          You can book inspections for any team as an administrator.
        </p>
      </CardContent>
    </Card>
  )

  // Admin bookings grid for visual management
  function AdminBookingsGrid() {
    if (userRole !== 'admin' || !selectedInspectionType) return null
    return (
      <Card className="shadow-lg border-gray-200 mt-6">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            All Bookings - {selectedInspectionType.name} ({todayDate})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map(time => {
              // For each possible concurrent slot, show bookings
              const bookingsForTime = []
              for (let lane = 1; lane <= selectedInspectionType.concurrent_slots; lane++) {
                const booking = allBookings.find(b =>
                  b.start_time === time &&
                  b.resource_index === lane
                )
                if (booking) {
                  bookingsForTime.push(
                    <div 
                      key={time + "-lane-" + lane} 
                      className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-300 rounded-lg px-4 py-3 flex items-center justify-between gap-2 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-blue-900 truncate">{booking.teams?.name}</div>
                        <div className="text-xs text-blue-700 flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{time}</span>
                          <Badge variant="outline" className="text-xs">Lane {lane}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        onClick={() => handleAdminDeleteBooking(booking.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                }
              }
              if (bookingsForTime.length > 0) {
                return bookingsForTime
              }
              return (
                <div 
                  key={time + "-empty"} 
                  className="px-4 py-3 text-sm text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
                >
                  <div className="text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <div>{time}</div>
                    <div className="text-xs text-gray-400">Available</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading booking data...</p>
        </div>
      </div>
    )
  }
  
  // Only show error if user is not admin and has no team_id
  // Admins can always book for any team
  if (!teamId && !adminViewTeam && userRole !== 'admin') {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">No team profile found</p>
                <p className="text-sm text-red-600 mt-1">Please complete your profile first to book inspections.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (ok) {
    const bookedTeamName = userRole === 'admin' && adminViewTeam
      ? teams.find(t => t.id === adminViewTeam)?.name
      : null
    
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h2>
                <p className="text-green-700">Your inspection has been successfully booked.</p>
                {bookedTeamName && userRole === 'admin' && (
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/60 rounded-lg border border-green-300">
                    <Badge className="bg-primary text-white">Admin</Badge>
                    <span className="text-sm font-semibold text-green-800">Booked for: {bookedTeamName}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Button
                  onClick={() => {
                    setOk(false)
                    setSelectedInspectionType(null)
                    setSelectedTime("")
                    setNotes("")
                    setError(null)
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Book Another Inspection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/scrutineering/calendar'}
                  className="gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  View Calendar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Book Inspection
          </h1>
          <div className="mt-2 flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <p className="text-base font-medium">
              Available slots for: <span className="font-semibold text-primary">{todayDate}</span>
            </p>
            {userRole === 'admin' && adminViewTeam && (
              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
                Admin Mode
              </Badge>
            )}
          </div>
        </div>
        {error && (
          <Button
            variant="outline"
            onClick={() => {
              setError(null)
              window.location.reload()
            }}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {adminTeamSelector}

      {/* Step 1: Select Inspection Type */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Select Inspection Type
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {inspectionTypes.length === 0 && !initialLoading && !error && (
            <div className="mb-4 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">No inspection types available</p>
                  <p className="text-sm text-yellow-700 mt-1">Please check your connection or contact support if this issue persists.</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inspectionTypes.map((t) => {
              const colors = TYPE_COLORS[t.name] || { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300', gradient: 'from-gray-50 to-gray-100/50' }
              const isSelected = selectedInspectionType?.id === t.id
              
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => t.can_book ? setSelectedInspectionType(t) : null}
                  disabled={!t.can_book}
                  className={`
                    flex flex-col items-start border-2 rounded-xl px-5 py-4 transition-all duration-200
                    ${t.can_book 
                      ? `bg-gradient-to-br ${colors.gradient} hover:shadow-lg hover:scale-[1.02] cursor-pointer ${isSelected ? `border-primary ring-2 ring-primary/20 shadow-md` : colors.border}` 
                      : "bg-gray-100 opacity-60 cursor-not-allowed border-gray-300"
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-2 w-full">
                    {TYPE_ICONS[t.name]}
                    <div className={`font-bold text-lg ${colors.text}`}>{t.name}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{t.duration_minutes} min</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t.concurrent_slots} slot{t.concurrent_slots > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {t.subtitle && (
                    <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${t.passed ? "text-green-600" : "text-red-500"}`}>
                      {t.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {t.subtitle}
                    </div>
                  )}
                  {isSelected && (
                    <div className="mt-2 w-full flex justify-end">
                      <Badge className="bg-primary text-white">Selected</Badge>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
      {/* Step 2: Select Time Slot */}
      {selectedInspectionType && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Select Time Slot - {selectedInspectionType.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
              {slots.map(time => {
                const full = !isSlotAvailable(time)
                const isSelected = selectedTime === time
                return (
                  <button
                    key={time}
                    disabled={full || loading}
                    onClick={() => handleSlotClick(time)}
                    className={`
                      px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200
                      ${full 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300" 
                        : isSelected
                          ? "bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg scale-105 border-2 border-primary"
                          : "bg-white hover:bg-primary/10 text-primary border-2 border-primary/30 hover:border-primary cursor-pointer hover:shadow-md"
                      }
                      ${loading ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Clock className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                      <span>{time}</span>
                      {full && <span className="text-xs">Full</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            
            {slots.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No available time slots for this inspection type.</p>
              </div>
            )}

            <div className="space-y-4 mt-6">
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                Notes
                <span title="Optional. Add context or comments for your booking.">
                  <Info className="h-4 w-4 text-gray-400" />
                </span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={200}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none"
                placeholder="Optional remarks (200 characters max)"
                rows={3}
              />
              <div className="text-xs text-gray-500 text-right">{notes.length}/200</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                disabled={!selectedTime || loading}
                type="button"
                className="flex-1 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary text-white font-semibold py-3 text-base shadow-md hover:shadow-lg transition-all duration-200"
                onClick={handleConfirmBooking}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm Booking
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                type="button"
                className="flex items-center justify-center gap-2"
                onClick={() => { 
                  setSelectedInspectionType(null)
                  setSelectedTime("")
                  setNotes("")
                  setError(null)
                  setOk(false)
                }}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                Change Type
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {AdminBookingsGrid()}
    </div>
  )
}
