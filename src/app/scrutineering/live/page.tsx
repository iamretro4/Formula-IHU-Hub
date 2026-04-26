'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Loader2, 
  Play, 
  FileText, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  Calendar,
  Users,
  Zap,
  Wrench,
  Battery,
  Info,
  LayoutGrid
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { logger } from '@/lib/utils/logger'
import { todayInEventTz } from '@/lib/utils/formatting'
import toast from 'react-hot-toast'

const QUEUE_TABS = ['upcoming', 'ongoing', 'completed']

const EV_PHASES = [
  { name: 'PRE', desc: 'Pre-Inspection' },
  { name: 'MECH', desc: 'Mechanical' },
  { name: 'ACC', desc: 'Accumulator' },
  { name: 'ELEC', desc: 'Electrical' },
  { name: 'TILT', desc: 'Tilt Test' },
  { name: 'RAIN', desc: 'Rain Test' },
  { name: 'BRAKE', desc: 'Brake Test' }
]

const CV_PHASES = [
  { name: 'PRE', desc: 'Pre-Inspection' },
  { name: 'MECH', desc: 'Mechanical' },
  { name: 'TILT', desc: 'Tilt Test' },
  { name: 'NOISE', desc: 'Noise Test' },
  { name: 'BRAKE', desc: 'Brake Test' }
]

const TYPE_STYLES: Record<string, { accent: string; gradient: string; glow: string }> = {
  Electrical: { 
    accent: 'bg-yellow-500', 
    gradient: 'from-yellow-500/10 to-yellow-500/5',
    glow: 'shadow-yellow-500/20'
  },
  Mechanical: { 
    accent: 'bg-blue-500', 
    gradient: 'from-blue-500/10 to-blue-500/5',
    glow: 'shadow-blue-500/20'
  },
  Accumulator: { 
    accent: 'bg-green-500', 
    gradient: 'from-green-500/10 to-green-500/5',
    glow: 'shadow-green-500/20'
  },
  'Tilt Test': { accent: 'bg-orange-500', gradient: 'from-orange-500/10 to-orange-500/5', glow: 'shadow-orange-500/20' },
  'Rain Test': { accent: 'bg-cyan-500', gradient: 'from-cyan-500/10 to-cyan-500/5', glow: 'shadow-cyan-500/20' },
  'Noise Test': { accent: 'bg-indigo-500', gradient: 'from-indigo-500/10 to-indigo-500/5', glow: 'shadow-indigo-500/20' },
  'Brake Test': { accent: 'bg-red-500', gradient: 'from-red-500/10 to-red-500/5', glow: 'shadow-red-500/20' },
  'Pre-Inspection': { accent: 'bg-gray-500', gradient: 'from-gray-500/10 to-gray-500/5', glow: 'shadow-gray-500/20' },
}

type Team = {
  name: string
  code: string
  vehicle_class?: string
}

type InspectionType = {
  name: string
  duration_minutes: number
}

type InspectionResult = {
  id: string
  status: string
  completed_at?: string
  scrutineer_ids?: string[]
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
  started_at?: string
  is_rescrutineering: boolean
  created_by: string
  teams?: Team | null
  inspection_types?: InspectionType | null
  inspection_results?: InspectionResult[] | null
}

type InspectionProgress = {
  item_id: string
  status?: string
  user_id?: string
  user_profiles?: {
    first_name?: string
    last_name?: string
  } | null
}

export default function InspectionQueuePage() {
  const router = useRouter()
  const { profile: authProfile, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [role, setRole] = useState<string>('')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [today, setToday] = useState(todayInEventTz())
  const [tab, setTab] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reinspectLoading, setReinspectLoading] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<'ALL' | 'EV' | 'CV'>('ALL')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = useMemo(() => getSupabaseClient(), [])

  // Team members are not permitted; redirect if they hit scrutineering directly
  useEffect(() => {
    if (authLoading || !authProfile) return
    if (authProfile.app_role === 'team_member') {
      router.replace('/dashboard')
    }
  }, [authLoading, authProfile, router])

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    Electrical: <Zap className="w-4 h-4" />,
    Mechanical: <Wrench className="w-4 h-4" />,
    Accumulator: <Battery className="w-4 h-4" />,
  }

  useEffect(() => { setToday(todayInEventTz()) }, [])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('[Queue] Auth state changed', { event })
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Reload user profile when auth state changes
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError || !user) {
            setAuthError('Session expired. Please sign in again.')
            setRole('')
            setTeamId(null)
            return
          }
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('app_role, team_id')
            .eq('id', user.id).single()
          if (profileError || !profile) {
            logger.error('[Queue] Profile error after auth change', profileError, { context: 'auth_state_change' })
            return
          }
          setRole(profile.app_role || '')
          setTeamId(profile.team_id || null)
          setAuthError(null)
        } catch (err) {
          logger.error('[Queue] Error handling auth state change', err, { context: 'auth_state_change' })
        }
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Fetch current user & role info
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          logger.error('[Queue] Auth error', userError, { context: 'load_user' })
          if (userError.message?.includes('JWT') || userError.message?.includes('token') || userError.message?.includes('expired')) {
            setAuthError('Session expired. Please sign in again.')
          }
          return
        }
        if (!user || cancelled) {
          setAuthError('Not authenticated. Please sign in.')
          return
        }
        setAuthError(null)
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('app_role, team_id')
          .eq('id', user.id).single()
        if (profileError) {
          logger.error('[Queue] Profile error', profileError, { context: 'load_user' })
          // Check if it's an auth error
          if (profileError.code === 'PGRST301' || profileError.message?.includes('JWT') || profileError.message?.includes('token')) {
            setAuthError('Session expired. Please sign in again.')
          }
          return
        }
        if (!profile || cancelled) return
        if (!cancelled) {
          setRole(profile.app_role || '')
          setTeamId(profile.team_id || null)
        }
      } catch (err) {
        logger.error('[Queue] Unexpected error loading user', err, { context: 'load_user' })
        setAuthError('Failed to load user data. Please refresh the page.')
      }
    })()
    return () => { cancelled = true }
  }, [supabase])

  // Fetch bookings (poll every 12s)
  useEffect(() => {
    if (!today) {
      setLoading(false)
      return
    }
    let cancelled = false
    let isInitialLoad = true
    async function loadQueue() {
      if (cancelled) return
      try {
        // Only show loading spinner on initial load, not on polling updates
        if (isInitialLoad) {
          setLoading(true)
        }
        let query = supabase
          .from('bookings')
          .select(`
            *,
            inspection_results(id, status, completed_at, scrutineer_ids),
            inspection_types(name, duration_minutes),
            teams(name, code, vehicle_class)
          `)
          .eq('date', today)
          .order('start_time')
        if ((role === 'team_leader' || role === 'team_member' || role === 'inspection_responsible') && teamId) {
          query = query.eq('team_id', teamId)
        }
        const { data, error } = await query
        if (cancelled) return
        
        if (error) {
          logger.error('[Queue] Error fetching bookings', error, { context: 'load_queue' })
          // Check if it's an auth error
          if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token') || error.message?.includes('expired') || error.code === '42501') {
            setAuthError('Session expired. Please sign in again.')
            // Stop polling on auth errors
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          } else {
            setError(error.message || 'Failed to load inspections')
          }
          if (!cancelled) {
            setBookings([])
            setLoading(false)
          }
          return
        }
        
        // Clear error on successful load
        if (!cancelled) {
          setError(null)
        }
        
        if (data) {
          // Fetch inspection_results separately to ensure we have the data
          const bookingIds = data.map((b: any) => b.id)
          let resultsData: any[] | null = null
          
          if (bookingIds.length > 0) {
            const { data: results, error: resultsError } = await supabase
              .from('inspection_results')
              .select('booking_id, status, completed_at, scrutineer_ids')
              .in('booking_id', bookingIds)
            
            if (cancelled) return
            
            if (resultsError) {
              logger.error('[Queue] Error fetching inspection results', resultsError, { context: 'load_queue', bookingIds })
              // Check if it's an auth error
              if (resultsError.code === 'PGRST301' || resultsError.message?.includes('JWT') || resultsError.message?.includes('token') || resultsError.message?.includes('expired') || resultsError.code === '42501') {
                setAuthError('Session expired. Please sign in again.')
                // Stop polling on auth errors
                if (intervalRef.current) {
                  clearInterval(intervalRef.current)
                  intervalRef.current = null
                }
              }
            } else {
              resultsData = results
            }
          }
          
          if (cancelled) return
          
          // Merge inspection_results into bookings
          const bookingsWithResults = data.map((booking: any) => {
            const result = resultsData?.find((r: any) => r.booking_id === booking.id)
            return {
              ...booking,
              inspection_results: result ? [result] : null
            }
          })
          
          if (!cancelled) {
            setBookings(bookingsWithResults as unknown as Booking[])
            
            // Debug: log inspection results structure for completed bookings
            const completed = bookingsWithResults.filter((b: any) => b.status === 'completed')
            if (completed.length > 0) {
              logger.debug('[Queue] Completed bookings', { count: completed.length })
              completed.forEach((b: any) => {
                const results = b.inspection_results
                const firstResult = Array.isArray(results) && results.length > 0 ? results[0] : null
                logger.debug('[Queue] Booking details', {
                  id: b.id,
                  bookingStatus: b.status,
                  hasInspectionResults: !!results,
                  inspectionResultsType: Array.isArray(results) ? 'array' : results === null ? 'null' : typeof results,
                  inspectionResultsLength: Array.isArray(results) ? results.length : 'N/A',
                  firstResult: firstResult,
                  firstResultStatus: firstResult?.status,
                  firstResultKeys: firstResult ? Object.keys(firstResult) : []
                })
                // Also log the raw inspection_results to see everything
                logger.debug('[Queue] Raw inspection_results', { results: JSON.stringify(results, null, 2) })
              })
            }
          }
        } else {
          if (!cancelled) {
            setBookings([])
          }
        }
      } catch (err) {
        logger.error('[Queue] Unexpected error', err, { context: 'load_queue' })
        if (!cancelled) {
          setBookings([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          isInitialLoad = false
        }
      }
    }
    loadQueue()
    intervalRef.current = setInterval(() => {
      if (!cancelled) {
        loadQueue()
      }
    }, 12000)
    return () => { 
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [supabase, today, role, teamId])

  // 🔔 Discord: Poll for inspection reminders every 5 minutes
  // This triggers the server-side check for bookings starting within 15 min
  useEffect(() => {
    // Only admins/scrutineers should trigger reminders to avoid duplicates
    if (!role || !['admin', 'scrutineer'].includes(role)) return

    const checkReminders = () => {
      fetch('/api/discord/reminders').catch(() => {})
    }

    // Check immediately on load, then every 5 minutes
    checkReminders()
    const reminderInterval = setInterval(checkReminders, 5 * 60 * 1000)
    return () => clearInterval(reminderInterval)
  }, [role])

  // Tab & Class filtering
  const filteredBookings = useMemo(() => {
    let list = bookings
    if (selectedClass !== 'ALL') {
      list = list.filter(b => b.teams?.vehicle_class === selectedClass)
    }
    return list
  }, [bookings, selectedClass])

  const byStatus = (tabFilter: string) =>
    filteredBookings.filter(b =>
      tabFilter === 'upcoming'
        ? b.status === 'upcoming'
        : tabFilter === 'ongoing'
        ? b.status === 'ongoing'
        : b.status === 'completed'
    )

  // Robust passed/failed count logic
  // Note: inspection_results is a one-to-one relation, so it's an array with at most one element
  const completedBookings = bookings.filter(b => b.status === 'completed')
  const passedCount = completedBookings.filter(b => {
    const result = b.inspection_results?.[0]
    const isPassed = result?.status === 'passed'
    if (completedBookings.length > 0 && !isPassed) {
      logger.debug('[Queue] Not passed', { bookingId: b.id, result, status: result?.status })
    }
    return isPassed
  }).length
  const failedCount = completedBookings.filter(b => {
    const result = b.inspection_results?.[0]
    const isFailed = result?.status === 'failed'
    if (completedBookings.length > 0 && !isFailed) {
      logger.debug('[Queue] Not failed', { bookingId: b.id, result, status: result?.status })
    }
    return isFailed
  }).length
  
  // Debug: log counts
  if (completedBookings.length > 0) {
    logger.debug('[Queue] Counts', { completed: completedBookings.length, passed: passedCount, failed: failedCount })
  }


  // Export PDF (existing logic)
  async function exportInspectionPDF(bookingId: string) {
    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          inspection_types(name),
          teams(name, code, vehicle_class),
          inspection_results(status, completed_at, scrutineer_ids)
        `)
        .eq('id', bookingId)
        .single()
      
      if (bookingError || !bookingData) {
        throw new Error(bookingError?.message || 'Booking not found')
      }
      
      const typedBooking = bookingData as any
      const { data: progress, error: progressError } = await supabase
        .from('inspection_progress')
        .select('*, user_profiles(first_name, last_name)')
        .eq('booking_id', bookingId)
      
      if (progressError) {
        logger.error('[Queue] Error fetching progress for PDF', progressError, { context: 'export_pdf', bookingId })
      }
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // --- HEADER ---
      doc.setFillColor(30, 64, 175)
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('FORMULA STUDENT INSPECTION SHEET', 15, 20)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Official Scrutineering Report - Formula IHU 2026`, 15, 28)
      
      // --- TEAM INFO ---
      doc.setTextColor(33, 33, 33)
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(248, 250, 252)
      doc.rect(10, 45, pageWidth - 20, 35, 'FD')
      
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('TEAM INFORMATION', 15, 52)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text(`Team: ${typedBooking.teams?.name ?? ""}`, 15, 60)
      doc.text(`Car #: ${typedBooking.teams?.code ?? "-"}`, 15, 67)
      doc.text(`Class: ${typedBooking.teams?.vehicle_class || 'N/A'}`, 15, 74)
      doc.text(`Inspection: ${typedBooking.inspection_types?.name ?? ""}`, 110, 60)
      doc.text(`Date: ${typedBooking.date}`, 110, 67)
      doc.text(`Status: ${typedBooking.inspection_results?.[0]?.status?.toUpperCase() ?? '-'}`, 110, 74)
      
      // --- ITEMS ---
      let yPos = 100
      doc.setFont('helvetica', 'bold'); doc.text('CHECKLIST PROGRESS:', 10, 95)
      
      const sortedProgress = (progress ?? []).sort((a: any, b: any) => a.item_id.localeCompare(b.item_id))
      
      sortedProgress.forEach((p: any, i: number) => {
        if (yPos > 270) { doc.addPage(); yPos = 20 }
        const inspector = p.user_profiles ? `${p.user_profiles.first_name} ${p.user_profiles.last_name}` : 'Unknown'
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        doc.text(`${i + 1}. Item ${p.item_id.split('-')[0]}... - PASS - By: ${inspector}`, 10, yPos)
        yPos += 7
      })
      
      const fileName = `FIHU26_${typedBooking.teams?.code || 'CAR'}_${typedBooking.inspection_types?.name.replace(/ /g, '_')}.pdf`
      doc.save(fileName)
      toast.success('Premium PDF exported successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF'
      toast.error(errorMessage)
      logger.error('[Queue] Error exporting PDF', err, { context: 'export_pdf', bookingId })
    }
  }

  // Reinspect logic
  async function handleReinspect(bookingId: string) {
    if (!confirm('Are you sure you want to reset this inspection? This will mark it as failed and allow the team to re-book.')) {
      return
    }
    
    setReinspectLoading(bookingId)
    try {
      const { error: resultError } = await supabase
        .from('inspection_results')
        .update({ status: 'failed', completed_at: null } as any)
        .eq('booking_id', bookingId)
      
      if (resultError) throw resultError
      
      const { error: progressError } = await supabase
        .from('inspection_progress')
        .update({ status: 'failed', comment: null, locked: false } as any)
        .eq('booking_id', bookingId)
      
      if (progressError) throw progressError
      
      // 🔔 Discord: Inspection reset
      const resetBooking = bookings.find(b => b.id === bookingId)
      if (resetBooking) {
        fetch('/api/discord/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'inspection_reset',
            teamName: resetBooking.teams?.name || 'Unknown',
            teamCode: resetBooking.teams?.code || '??',
            inspectionType: resetBooking.inspection_types?.name || 'Inspection',
          }),
        }).catch(() => {})
      }
      
      toast.success('Inspection reset successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset inspection'
      toast.error(errorMessage)
      logger.error('[Queue] Error resetting inspection', err, { context: 'reinspect', bookingId })
    } finally {
      setReinspectLoading(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 bg-gray-50/50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
              Scrutineering <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Cockpit</span>
            </h1>
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-3 h-3" />
              <p className="text-[9px] font-bold uppercase tracking-widest leading-none">
                Competition Day: <span className="text-gray-700">{today}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
        
        <div className="flex items-center gap-3 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl border border-gray-200">
          <Tabs 
            value={selectedClass} 
            onValueChange={(v) => setSelectedClass(v as any)}
            className="w-full md:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full md:w-[240px] bg-transparent">
              <TabsTrigger value="ALL" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="EV" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">EV</TabsTrigger>
              <TabsTrigger value="CV" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">CV</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>


      {/* Error States */}
      {authError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-semibold">Authentication Error</p>
                <p className="text-sm text-red-600 mt-1">{authError}</p>
              </div>
              <Link href="/auth/signin">
                <Button variant="destructive" className="gap-2">
                  Sign In Again
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {error && !authError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading inspections</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats and Tabs */}
      <Card className="shadow-lg border-gray-200">
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8">
              <TabsList className="flex w-full md:w-auto bg-gray-100 p-1 rounded-xl border border-gray-200 h-11">
                {QUEUE_TABS.map(t => (
                  <TabsTrigger 
                    key={t} 
                    value={t}
                    className="flex-1 md:flex-none md:min-w-[140px] gap-3 px-6 rounded-lg font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    {t === 'upcoming' && <Clock className="w-4 h-4" />}
                    {t === 'ongoing' && <Play className="w-4 h-4" />}
                    {t === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                    <span className="capitalize">{t}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${tab === t ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                      {byStatus(t).length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            {tab === 'completed' && (
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 mb-8">
                <div className="flex-1 flex items-center gap-3.5 px-5 py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-[1.25rem]">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-[9px] text-emerald-600 font-black uppercase tracking-widest leading-none mb-1">Validated</div>
                    <div className="text-xl font-black text-emerald-900 leading-none">{passedCount} Entities</div>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-3.5 px-5 py-3.5 bg-rose-50/50 border border-rose-100 rounded-[1.25rem]">
                  <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                    <XCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-[9px] text-rose-600 font-black uppercase tracking-widest leading-none mb-1">Required Re-test</div>
                    <div className="text-xl font-black text-rose-900 leading-none">{failedCount} Entities</div>
                  </div>
                </div>
              </div>
            )}
            <TabsContent value={tab} className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-gray-600 font-medium">Loading inspections...</p>
                </div>
              ) : byStatus(tab).length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50">
                  <div className="flex justify-center mb-3">
                    {tab === 'upcoming' && <Clock className="w-12 h-12 text-gray-300" />}
                    {tab === 'ongoing' && <Play className="w-12 h-12 text-gray-300" />}
                    {tab === 'completed' && <CheckCircle2 className="w-12 h-12 text-gray-300" />}
                  </div>
                  <p className="text-gray-500 font-medium">No {tab} inspections for today</p>
                  <p className="text-sm text-gray-400 mt-1">Check back later or view other tabs</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {byStatus(tab).map(b => {
                    const inspectionTypeName = b.inspection_types?.name ?? "Inspection"
                    const resultStatus = b.inspection_results?.[0]?.status
                    const canManage = role === 'scrutineer' || role === 'admin' || role === 'judge'
                    const style = TYPE_STYLES[inspectionTypeName] || TYPE_STYLES['Pre-Inspection']
                    
                    return (
                      <Card 
                        key={b.id} 
                        className={`group relative overflow-hidden transition-all duration-300 border-gray-200 hover:border-gray-300 hover:shadow-xl hover:-translate-y-1 ${
                          b.status === 'ongoing' ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
                        }`}
                      >
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${style.accent}`} />
                        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                        
                        <CardContent className="p-5">
                          <div className="flex flex-col h-full gap-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <h3 className="font-bold text-gray-900 leading-tight">{inspectionTypeName}</h3>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {b.is_rescrutineering && (
                                      <Badge variant="outline" className="text-[8px] h-3 px-1 border-orange-200 text-orange-600 uppercase font-black">RE-TEST</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-gray-400 tabular-nums">{b.start_time}</div>
                                <div className="text-[10px] font-medium text-gray-300 leading-none">Scheduled</div>
                              </div>
                            </div>

                            <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded-md leading-none">
                                      Car #{b.teams?.code || '??'}
                                    </div>
                                    <Badge className={`text-[8px] h-3.5 px-1.5 border-none tracking-tighter ${
                                      b.teams?.vehicle_class === 'EV' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                                    }`}>
                                      {b.teams?.vehicle_class}
                                    </Badge>
                                  </div>
                                  <div className="text-sm font-bold text-gray-800 truncate">{b.teams?.name}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-2">
                              <div>
                                {b.status === 'ongoing' ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-yellow-50 border border-yellow-200">
                                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                      <span className="text-[10px] font-bold text-yellow-700 uppercase">Active</span>
                                    </div>
                                    <OngoingTimer 
                                      startedAt={b.started_at} 
                                      durationMinutes={b.inspection_types?.duration_minutes || 120} 
                                    />
                                  </div>
                                ) : tab === 'completed' && resultStatus ? (
                                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-black text-[10px] uppercase shadow-sm ${
                                    resultStatus === 'passed' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {resultStatus === 'passed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {resultStatus === 'passed' ? 'PASSED' : 'FAILED'}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-gray-400 font-medium italic text-[10px]">
                                    <Clock className="w-3 h-3" />
                                    Standby
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {tab === 'upcoming' && canManage && (
                                  <Link href={`/scrutineering/live/${b.id}`}>
                                    <Button size="sm" className="h-8 rounded-lg px-4 font-bold bg-primary hover:bg-primary-600 shadow-md">
                                      Start
                                    </Button>
                                  </Link>
                                )}
                                {tab === 'ongoing' && (
                                  <Link href={`/scrutineering/live/${b.id}`}>
                                    <Button 
                                      size="sm"
                                      className={`h-8 rounded-lg px-4 font-bold shadow-md transition-all ${
                                        canManage 
                                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                      }`}
                                    >
                                      {canManage ? 'Resume' : 'View'}
                                    </Button>
                                  </Link>
                                )}
                                {tab === 'completed' && (
                                  <div className="flex items-center gap-1">
                                    <Link href={`/scrutineering/live/${b.id}`}>
                                      <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold border-gray-200 hover:bg-gray-50">
                                        Logs
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => exportInspectionPDF(b.id)}
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function OngoingTimer({ startedAt, durationMinutes }: { startedAt?: string, durationMinutes: number }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!startedAt) return

    const start = new Date(startedAt).getTime()
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const elapsed = (now - start) / 1000 / 60
      const remaining = Math.max(0, durationMinutes - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(timer)
    }, 1000)

    return () => clearInterval(timer)
  }, [startedAt, durationMinutes])

  if (timeLeft === null) return null

  const mins = Math.floor(timeLeft)
  const secs = Math.floor((timeLeft - mins) * 60)
  const display = `${mins}:${secs.toString().padStart(2, '0')}`

  return (
    <div className={`text-[11px] font-black tabular-nums px-2 py-0.5 rounded-md border flex items-center gap-1.5 shadow-sm transition-colors ${
      timeLeft < 5 ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-primary/10 text-primary border-primary/20'
    }`}>
      <Clock className="w-3 h-3" />
      {timeLeft > 0 ? display : 'TIMEOUT'}
    </div>
  )
}
