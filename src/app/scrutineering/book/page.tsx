'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  AlertTriangle,
  Users,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { addMinutes, parseISO, format } from 'date-fns'
import { todayInEventTz } from '@/lib/utils/formatting'
import { logger } from '@/lib/utils/logger'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'Electrical Inspection': <Zap className="w-5 h-5" />,
  'Mechanical Inspection': <Wrench className="w-5 h-5" />,
  'Accumulator Inspection': <Battery className="w-5 h-5" />,
  'Pre-Inspection': <Users className="w-5 h-5" />,
  'Electrical': <Zap className="w-5 h-5" />,
  'Mechanical': <Wrench className="w-5 h-5" />,
  'Accumulator': <Battery className="w-5 h-5" />,
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string; accent: string }> = {
  Electrical: { 
    bg: 'bg-yellow-50', 
    text: 'text-yellow-800', 
    border: 'border-yellow-200',
    gradient: 'from-yellow-400/20 to-yellow-400/5',
    accent: 'bg-yellow-500'
  },
  Mechanical: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-800', 
    border: 'border-blue-200',
    gradient: 'from-blue-400/20 to-blue-400/5',
    accent: 'bg-blue-500'
  },
  Accumulator: { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-800', 
    border: 'border-emerald-200',
    gradient: 'from-emerald-400/20 to-emerald-400/5',
    accent: 'bg-emerald-500'
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
  ev_prerequisites?: string[] | null
  cv_prerequisites?: string[] | null
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
  const todayDate = todayInEventTz()
  const adminViewTeamRef = useRef<string | null>(null)
  const effectRunIdRef = useRef(0)

  // Restricted roles redirect (e.g. viewers or unassigned members)
  const router = useRouter()
  useEffect(() => {
    if (authLoading || !authProfile) return
    const allowedRoles = ['admin', 'scrutineer', 'team_leader', 'inspection_responsible']
    if (!allowedRoles.includes(authProfile.app_role)) {
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
  // Consolidated data loading to prevent state drift and redundant fetching
  const loadInitialData = async (targetTeamId: string | null, runId: number, active: boolean) => {
    if (!targetTeamId) return;
    
    try {
      // 1. Fetch inspection types with class-specific prerequisites
      const { data: types, error: typesError } = await supabase
        .from('inspection_types')
        .select('id, name, duration_minutes, concurrent_slots, ev_prerequisites, cv_prerequisites, active, key')
        .order('sort_order', { ascending: true })

      if (typesError) throw typesError;

      // 2. Fetch team bookings with results
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

      if (bookingsError) throw bookingsError;

      if (!active || runId !== effectRunIdRef.current) return;

      setTeamBookings((teamB ?? []) as Booking[])

      // 3. Process inspection types with robust prerequisite logic
      const processedTypes = ((types ?? []) as any[]).map((t: any) => {
        // Robust check for passed/failed results
        const relevantBookings = (teamB as any[])?.filter(b => b.inspection_type_id === t.id)
        const results = relevantBookings.flatMap(b => {
          const res = b.inspection_results
          return Array.isArray(res) ? res : (res ? [res] : [])
        })
        
        const passed = results.some((r: any) => r.status === 'passed')
        const failed = !passed && results.some((r: any) => r.status === 'failed')
        
        // Active booking check
        const hasActiveBooking = relevantBookings?.some(
          (b: any) => !['completed', 'cancelled', 'no_show'].includes(b.status)
        )
        
        let prerequisitesMet = true
        let failedPrereqName = ''
        let missingPrereqName = ''

        // Determinte prerequisites based on vehicle class
        const currentTeam = teams.find(t => t.id === targetTeamId) as any
        const teamClass = currentTeam?.vehicle_class || 'EV'
        const classPrereqs = teamClass === 'EV' ? (t.ev_prerequisites || []) : (t.cv_prerequisites || [])
        
        // Skip if this inspection type is NOT applicable to this class
        if (teamClass === 'EV' && t.ev_prerequisites === null) return null
        if (teamClass === 'CV' && t.cv_prerequisites === null) return null

        if (Array.isArray(classPrereqs) && classPrereqs.length > 0) {
          for (const reqKey of classPrereqs) {
            const prereqType = ((types ?? []) as any[]).find((tt: any) => tt.key === reqKey)
            if (prereqType) {
              const prereqResults = (teamB as any[])?.filter(b => b.inspection_type_id === prereqType.id)
                .flatMap(b => {
                  const res = b.inspection_results
                  return Array.isArray(res) ? res : (res ? [res] : [])
                })
              
              const prereqPassed = prereqResults.some((r: any) => r.status === 'passed')
              
              if (!prereqPassed) {
                prerequisitesMet = false
                const hasFailed = prereqResults.some((r: any) => r.status === 'failed')
                if (hasFailed) failedPrereqName = prereqType.name
                else if (!missingPrereqName) missingPrereqName = prereqType.name
              }
            }
          }
        }

        return {
          id: t.id,
          name: t.name,
          duration_minutes: t.duration_minutes ?? 120,
          concurrent_slots: t.concurrent_slots ?? 1,
          prerequisites: classPrereqs,
          key: t.key,
          passed: !!passed,
          active: !!t.active,
          can_book: (userRole === 'admin' || userRole === 'scrutineer') 
            ? !!t.active && !hasActiveBooking
            : !!t.active && prerequisitesMet && !passed && !hasActiveBooking,
          is_admin_override: (userRole === 'admin' || userRole === 'scrutineer') && (!prerequisitesMet || passed),
          subtitle: !prerequisitesMet
            ? failedPrereqName 
              ? `BLOCKED: Previous ${failedPrereqName} attempt FAILED. Fix and re-inspect.`
              : `LOCKED: You must pass ${missingPrereqName} first`
            : passed
              ? "Inspection passed successfully"
              : hasActiveBooking
                ? "Active session currently in progress"
                : failed
                  ? "Previous attempt failed. Ready for re-scrutineering."
                  : undefined
        }
      }).filter(Boolean)

      if (active && runId === effectRunIdRef.current) {
        setInspectionTypes(processedTypes as any[])
        setInitialLoading(false)
      }
    } catch (err) {
      logger.error('[Booking] Error loading data', err, { context: 'load_data', teamId: targetTeamId })
      if (active && runId === effectRunIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setInitialLoading(false)
      }
    }
  }

  useEffect(() => {
    const currentRunId = ++effectRunIdRef.current
    setInitialLoading(true)
    setError(null)
    
    if (authLoading || !user || !authProfile) {
      if (currentRunId === effectRunIdRef.current) setInitialLoading(false)
      return
    }
    
    let active = true
    setUserRole(authProfile.app_role || '')
    setTeamId(authProfile.team_id || null)
    const targetTeamId = authProfile.app_role === 'admin' 
      ? (adminViewTeam ?? adminViewTeamRef.current) 
      : authProfile.team_id

    // Load data flow
    if (authProfile.app_role === 'admin' && teams.length === 0) {
      // First time loading teams for admin
      supabase.from('teams').select('id, name').order('name').then(({ data, error }) => {
        if (error) {
          setError(`Failed to load teams: ${error.message}`)
          return
        }
        const loadedTeams = (data || []) as Team[]
        setTeams(loadedTeams)
        const initialTeamId = adminViewTeam ?? (loadedTeams.length > 0 ? loadedTeams[0].id : null)
        if (initialTeamId && !adminViewTeam) {
          setAdminViewTeam(initialTeamId)
          adminViewTeamRef.current = initialTeamId
        }
        loadInitialData(initialTeamId, currentRunId, active)
      })
    } else {
      loadInitialData(targetTeamId, currentRunId, active)
    }

    return () => { active = false }
  }, [authLoading, user, authProfile, adminViewTeam])


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
    const slots: string[] = []
    let curr = parseISO(`${todayDate}T${startTime}:00`)
    const end = parseISO(`${todayDate}T${endTime}:00`)
    while (addMinutes(curr, duration) <= end) {
      slots.push(format(curr, 'HH:mm'))
      curr = addMinutes(curr, duration)
    }
    return slots
  }

  const slots = selectedInspectionType
    ? getSlots("09:00", "19:00", selectedInspectionType.duration_minutes)
    : []

  function isSlotAvailable(time: string) {
    if (!selectedInspectionType) return false
    if (userRole === 'admin') return true // Admins can book any slot
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
          `Please wait until the current session is finished.`
        )
      }

      // --- ADD PREREQUISITE VALIDATION ON SUBMISSION (Bypass for admins/scrutineers) ---
      const isStaff = userRole === 'admin' || userRole === 'scrutineer'
      if (!isStaff) {
        const { data: teamHistory, error: historyError } = await supabase
          .from('bookings')
          .select(`
            inspection_type_id,
            inspection_results(status)
          `)
          .eq('team_id', useTeamId)

        if (historyError) throw historyError;

        // Fetch all inspection types to map keys to IDs
        const { data: allTypes } = await supabase.from('inspection_types').select('*')
        const { data: teamData } = await supabase.from('teams').select('vehicle_class').eq('id', useTeamId).single()
        const teamClass = teamData?.vehicle_class || 'EV'
        const classPrereqs = teamClass === 'EV' ? (selectedInspectionType.ev_prerequisites as string[]) : (selectedInspectionType.cv_prerequisites as string[])

        if (Array.isArray(classPrereqs) && classPrereqs.length > 0) {
          for (const reqKey of classPrereqs) {
            const prereqType = (allTypes ?? []).find(tt => tt.key === reqKey)
            if (prereqType) {
              const hasPass = (teamHistory ?? []).some(b => {
                const res = b.inspection_results
                if (!res) return false
                const statusArray = Array.isArray(res) ? res : [res]
                return statusArray.some((r: any) => r.status === 'passed')
              })
              if (!hasPass) {
                throw new Error(`Prerequisite not met: Team must pass ${prereqType.name} before booking ${selectedInspectionType.name}.`)
              }
            }
          }
        }
      }
      // ------------------------------------------------

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
      
      // Find first free lane
      while (reservedLanes.has(lane)) lane++
      
      // Only block regular users if lane exceeds concurrent_slots
      if (userRole !== 'admin' && lane > (selectedInspectionType?.concurrent_slots ?? 1)) {
        throw new Error('All slots are full. Please refresh and try another time.')
      }

      // Calculate end time
      const endTime = format(
        addMinutes(parseISO(`${todayDate}T${selectedTime}:00`), selectedInspectionType?.duration_minutes ?? 120),
        'HH:mm'
      )

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
              // Robust check for passed/failed results
              const relevantBookings = (bookingsWithResults as any[])?.filter(b => b.inspection_type_id === t.id)
              const results = relevantBookings.flatMap(b => {
                const res = b.inspection_results
                return Array.isArray(res) ? res : (res ? [res] : [])
              })
              
              const passed = results.some((r: any) => r.status === 'passed')
              
              // Check if active booking - booking status not completed/cancelled/no_show
              const hasActiveBooking = relevantBookings?.some(
                (b: any) => !['completed', 'cancelled', 'no_show'].includes(b.status)
              )
              
              return {
                ...t,
                can_book: userRole === 'admin'
                  ? t.active && !hasActiveBooking
                  : t.active && !passed && !hasActiveBooking,
                passed: !!passed,
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
    <Card className="mb-4 overflow-hidden border-none shadow-xl bg-slate-900 ring-1 ring-white/10">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
      <div className="relative py-3 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shrink-0">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="text-sm font-black text-white tracking-tight leading-tight block">Intelligence Oversight</span>
            <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest leading-tight">Admin Selection Mode</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-sm">
          <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 px-1">
            Target Team Designation
          </label>
          <select
            value={adminViewTeam ?? ''}
            onChange={e => {
              setAdminViewTeam(e.target.value)
              setSelectedInspectionType(null)
              setSelectedTime("")
              setNotes("")
              setError(null)
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-sm text-white font-bold focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
          >
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>
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
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-slate-50/50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
              Inspection <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Selection</span>
            </h1>
            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.3em] leading-none">
              Technical Scrutineering Slot Allocation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <Button
              variant="outline"
              onClick={() => {
                setError(null)
                window.location.reload()
              }}
              className="gap-2 rounded-xl h-9 px-3"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-bold uppercase text-[9px] tracking-widest">Refresh</span>
            </Button>
          )}
        </div>
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

      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">1</span>
            Select Inspection Type
          </CardTitle>
          <CardDescription>
            Choose the technical module for validation
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
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
                    flex flex-col items-start border-2 rounded-2xl px-5 py-5 transition-all duration-300 relative overflow-hidden
                    ${t.can_book 
                      ? `bg-white hover:shadow-xl hover:-translate-y-1 cursor-pointer ${isSelected ? `border-primary ring-4 ring-primary/10 shadow-lg` : 'border-gray-100 hover:border-gray-200'}` 
                      : "bg-gray-50 opacity-60 cursor-not-allowed border-gray-100"
                    }
                  `}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-20 pointer-events-none`} />
                  <div className="flex items-start gap-4 mb-4 relative w-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      isSelected ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>
                      {TYPE_ICONS[t.name] || <FileText className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className={`font-black text-lg leading-tight uppercase tracking-tight truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {t.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-bold border-gray-200 text-gray-500">
                          {t.duration_minutes} MIN
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-bold border-gray-200 text-gray-500 uppercase">
                          {t.concurrent_slots} SLOTS
                        </Badge>
                      </div>
                    </div>
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
      {selectedInspectionType && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">2</span>
              Select Time Slot - {selectedInspectionType.name}
            </CardTitle>
            <CardDescription>
              Choose an available window for the session
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
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
