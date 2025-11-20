'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import getSupabaseClient from '@/lib/supabase/client'
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
  Battery
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { logger } from '@/lib/utils/logger'
import toast from 'react-hot-toast'

const QUEUE_TABS = ['upcoming', 'ongoing', 'completed']

type Team = {
  name: string
  code: string
}

type InspectionType = {
  name: string
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
  const [bookings, setBookings] = useState<Booking[]>([])
  const [role, setRole] = useState<string>('')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [today, setToday] = useState('')
  const [tab, setTab] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reinspectLoading, setReinspectLoading] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = useMemo(() => getSupabaseClient(), [])

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    Electrical: <Zap className="w-4 h-4" />,
    Mechanical: <Wrench className="w-4 h-4" />,
    Accumulator: <Battery className="w-4 h-4" />,
  }

  useEffect(() => { setToday(new Date().toISOString().split('T')[0]) }, [])

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
            inspection_types(name),
            teams(name, code)
          `)
          .eq('date', today)
          .order('start_time')
        if ((role === 'team_leader' || role === 'team_member') && teamId) {
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

  // Tab filtering
  const byStatus = (tabFilter: string) =>
    bookings.filter(b =>
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
          teams(name, code),
          inspection_results(status, completed_at, scrutineer_ids)
        `)
        .eq('id', bookingId)
        .single()
      
      if (bookingError || !bookingData) {
        throw new Error(bookingError?.message || 'Booking not found')
      }
      
      const typedBooking = bookingData as unknown as Booking
      const { data: progress, error: progressError } = await supabase
        .from('inspection_progress')
        .select('*, user_profiles(first_name, last_name)')
        .eq('booking_id', bookingId)
      
      if (progressError) {
        logger.error('[Queue] Error fetching progress for PDF', progressError, { context: 'export_pdf', bookingId })
      }
      
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text(`Inspection Report`, 10, 10)
      doc.setFontSize(12)
      doc.text(`Inspection: ${typedBooking.inspection_types?.name ?? 'N/A'}`, 10, 20)
      doc.text(`Team: ${typedBooking.teams?.name ?? 'N/A'} (${typedBooking.teams?.code ?? '-'})`, 10, 27)
      doc.text(`Slot: ${typedBooking.start_time} - ${typedBooking.end_time}`, 10, 34)
      doc.text(`Date: ${typedBooking.date}`, 10, 41)
      doc.text(`Status: ${typedBooking.inspection_results?.[0]?.status ?? '-'}`, 10, 48)
      doc.text(`Checklist Items:`, 10, 58)
      
      let yPos = 65;
      ((progress ?? []) as unknown as InspectionProgress[]).forEach((p: InspectionProgress, i) => {
        const inspectorName = p.user_profiles 
          ? `${p.user_profiles.first_name ?? ''} ${p.user_profiles.last_name ?? ''}`.trim() 
          : p.user_id ?? 'Unknown'
        doc.text(
          `${i + 1}. ${p.item_id} - Status: ${p.status ?? '-'} - By: ${inspectorName}`,
          10, yPos)
        yPos += 7
        if (yPos > 280) {
          doc.addPage()
          yPos = 20
        }
      })
      
      const fileName = `${typedBooking.teams?.name ?? 'Team'}_${typedBooking.inspection_types?.name ?? 'Inspection'}_${typedBooking.start_time}.pdf`
      doc.save(fileName)
      toast.success('PDF exported successfully')
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
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Play className="w-8 h-8 text-primary" />
            Live Inspections Queue
          </h1>
          <div className="mt-2 flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <p className="text-base font-medium">
              Today: <span className="font-semibold text-primary">{today}</span>
            </p>
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100/50">
              {QUEUE_TABS.map(t => (
                <TabsTrigger 
                  key={t} 
                  value={t}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  {t === 'upcoming' && <Clock className="w-4 h-4" />}
                  {t === 'ongoing' && <Play className="w-4 h-4" />}
                  {t === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                  <span className="capitalize">{t}</span>
                  <Badge variant="outline" className="ml-1">
                    {byStatus(t).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {tab === 'completed' && (
              <div className="flex gap-4 mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-300 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-xs text-green-600 font-medium">Passed</div>
                    <div className="text-xl font-bold text-green-800">{passedCount}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-300 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="text-xs text-red-600 font-medium">Failed</div>
                    <div className="text-xl font-bold text-red-800">{failedCount}</div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {byStatus(tab).map(b => {
                    const inspectionTypeName = b.inspection_types?.name ?? "Inspection"
                    const resultStatus = b.inspection_results?.[0]?.status
                    const canManage = role === 'scrutineer' || role === 'admin' || role === 'judge'
                    
                    return (
                      <Card 
                        key={b.id} 
                        className={`shadow-md hover:shadow-lg transition-all duration-200 ${
                          b.status === 'ongoing' ? 'border-yellow-300 bg-yellow-50/30' :
                          resultStatus === 'passed' ? 'border-green-300 bg-green-50/30' :
                          resultStatus === 'failed' ? 'border-red-300 bg-red-50/30' :
                          'border-gray-200'
                        }`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {TYPE_ICONS[inspectionTypeName]}
                                <h3 className="font-bold text-lg text-gray-900">{inspectionTypeName}</h3>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Users className="w-4 h-4" />
                                  <span className="font-semibold">{b.teams?.name ?? "Team"}</span>
                                  {b.teams?.code && (
                                    <Badge variant="outline" className="text-xs">
                                      {b.teams.code}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>{b.start_time} - {b.end_time}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Lane {b.resource_index}
                                  </Badge>
                                </div>
                                {b.status === 'ongoing' && (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                    <Play className="w-3 h-3 mr-1" />
                                    Ongoing
                                  </Badge>
                                )}
                                {tab === 'completed' && resultStatus && (
                                  <Badge 
                                    className={
                                      resultStatus === 'passed' 
                                        ? 'bg-green-100 text-green-800 border-green-300' 
                                        : resultStatus === 'failed'
                                        ? 'bg-red-100 text-red-800 border-red-300'
                                        : 'bg-gray-100 text-gray-800 border-gray-300'
                                    }
                                  >
                                    {resultStatus === 'passed' ? (
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                    ) : resultStatus === 'failed' ? (
                                      <XCircle className="w-3 h-3 mr-1" />
                                    ) : null}
                                    {resultStatus === 'passed' ? 'Passed' : resultStatus === 'failed' ? 'Failed' : resultStatus}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {tab === 'upcoming' && canManage && (
                                <Link href={`/scrutineering/live/${b.id}`}>
                                  <Button className="gap-2 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary">
                                    <Play className="w-4 h-4" />
                                    Start
                                  </Button>
                                </Link>
                              )}
                              {tab === 'ongoing' && (
                                <Link href={`/scrutineering/live/${b.id}`}>
                                  <Button 
                                    variant={canManage ? "default" : "outline"}
                                    className={`gap-2 ${
                                      canManage 
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                    }`}
                                    disabled={!canManage}
                                  >
                                    <Play className="w-4 h-4" />
                                    {canManage ? 'Continue' : 'View'}
                                  </Button>
                                </Link>
                              )}
                              {tab === 'completed' && (
                                <div className="flex flex-col gap-2">
                                  <Link href={`/scrutineering/live/${b.id}`}>
                                    <Button variant="outline" className="gap-2 w-full">
                                      <Eye className="w-4 h-4" />
                                      Review
                                    </Button>
                                  </Link>
                                  {canManage && (
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => exportInspectionPDF(b.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Export as PDF"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </Button>
                                      {resultStatus === 'passed' && role !== 'judge' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={reinspectLoading === b.id}
                                          onClick={() => handleReinspect(b.id)}
                                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                          title="Reset this inspection"
                                        >
                                          {reinspectLoading === b.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <RotateCcw className="w-4 h-4" />
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
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
