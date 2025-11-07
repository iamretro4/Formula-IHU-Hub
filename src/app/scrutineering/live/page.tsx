'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FaPlay, FaFilePdf, FaUndo } from 'react-icons/fa'
import { jsPDF } from 'jspdf'

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
  const [reinspectLoading, setReinspectLoading] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = useMemo(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => { setToday(new Date().toISOString().split('T')[0]) }, [])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Queue] Auth state changed:', event)
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
            console.error('[Queue] Profile error after auth change:', profileError)
            return
          }
          setRole(profile.app_role || '')
          setTeamId(profile.team_id || null)
          setAuthError(null)
        } catch (err) {
          console.error('[Queue] Error handling auth state change:', err)
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
          console.error('[Queue] Auth error:', userError)
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
          console.error('[Queue] Profile error:', profileError)
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
        console.error('[Queue] Unexpected error loading user:', err)
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
          console.error('[Queue] Error fetching bookings:', error)
          // Check if it's an auth error
          if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token') || error.message?.includes('expired') || error.code === '42501') {
            setAuthError('Session expired. Please sign in again.')
            // Stop polling on auth errors
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
          }
          if (!cancelled) {
            setBookings([])
            setLoading(false)
          }
          return
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
              console.error('[Queue] Error fetching inspection results:', resultsError)
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
              console.log('[Queue] Completed bookings:', completed.length)
              completed.forEach((b: any) => {
                const results = b.inspection_results
                const firstResult = Array.isArray(results) && results.length > 0 ? results[0] : null
                console.log('[Queue] Booking details:', {
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
                console.log('[Queue] Raw inspection_results:', JSON.stringify(results, null, 2))
              })
            }
          }
        } else {
          if (!cancelled) {
            setBookings([])
          }
        }
      } catch (err) {
        console.error('[Queue] Unexpected error:', err)
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
      console.log('[Queue] Not passed - booking:', b.id, 'result:', result, 'status:', result?.status)
    }
    return isPassed
  }).length
  const failedCount = completedBookings.filter(b => {
    const result = b.inspection_results?.[0]
    const isFailed = result?.status === 'failed'
    if (completedBookings.length > 0 && !isFailed) {
      console.log('[Queue] Not failed - booking:', b.id, 'result:', result, 'status:', result?.status)
    }
    return isFailed
  }).length
  
  // Debug: log counts
  if (completedBookings.length > 0) {
    console.log('[Queue] Counts - completed:', completedBookings.length, 'passed:', passedCount, 'failed:', failedCount)
  }


  // Export PDF (existing logic)
  async function exportInspectionPDF(bookingId: string) {
    const { data: bookingData } = await supabase
      .from('bookings')
      .select(`
        *,
        inspection_types(name),
        teams(name, code),
        inspection_results(status, completed_at, scrutineer_ids)
      `)
      .eq('id', bookingId)
      .single()
    if (!bookingData) return alert("Booking not found.")
    const typedBooking = bookingData as unknown as Booking
    const { data: progress } = await supabase
      .from('inspection_progress')
      .select('*, user_profiles(first_name, last_name)')
      .eq('booking_id', bookingId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = new (jsPDF as any)()
    doc.text(`Inspection: ${typedBooking.inspection_types?.name ?? 'N/A'}`, 10, 10)
    doc.text(`Team: ${typedBooking.teams?.name ?? 'N/A'} (${typedBooking.teams?.code ?? '-'})`, 10, 20)
    doc.text(`Slot: ${typedBooking.start_time} - ${typedBooking.end_time}`, 10, 30)
    doc.text(`Status: ${typedBooking.inspection_results?.[0]?.status ?? '-'}`, 10, 40)
    doc.text(`Checklist:`, 10, 50)
    
    ((progress ?? []) as unknown as InspectionProgress[]).forEach((p: InspectionProgress, i: number) => {
      const inspectorName = p.user_profiles 
        ? `${p.user_profiles.first_name ?? ''} ${p.user_profiles.last_name ?? ''}`.trim() 
        : p.user_id ?? 'Unknown'
      doc.text(
        `${i + 1}. ${p.item_id} Status: ${p.status ?? '-'} By: ${inspectorName}`,
        10, 60 + i * 7)
    })
    doc.save(`${typedBooking.teams?.name ?? 'Team'}_${typedBooking.inspection_types?.name ?? 'Inspection'}_${typedBooking.start_time}.pdf`)
  }

  // Reinspect logic
  async function handleReinspect(bookingId: string) {
    setReinspectLoading(bookingId)
    await supabase
      .from('inspection_results')
      .update({ status: 'failed', completed_at: null } as any)
      .eq('booking_id', bookingId)
    await supabase
      .from('inspection_progress')
      .update({ status: 'failed', comment: null, locked: false } as any)
      .eq('booking_id', bookingId)
    setReinspectLoading(null)
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-black mb-1">Live Inspections Queue</h1>
      <p className="text-gray-500 mb-5">View and manage today's inspections.</p>
      <div className="flex bg-neutral-100 rounded overflow-hidden max-w-md mx-auto text-sm font-semibold mb-6">
        {QUEUE_TABS.map(t =>
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={`w-1/3 transition py-2 ${tab === t ? 'bg-white' : 'text-gray-500'}`}
          >
            {t[0].toUpperCase() + t.slice(1)} ({byStatus(t).length})
          </button>
        )}
      </div>
      {tab === 'completed' && (
        <div className="flex gap-4 mb-2">
          <span className="px-3 py-1 bg-green-50 border-green-200 border text-green-800 font-semibold rounded-full">
            Passed: {passedCount}
          </span>
          <span className="px-3 py-1 bg-red-50 border-red-200 border text-red-800 font-semibold rounded-full">
            Failed: {failedCount}
          </span>
        </div>
      )}
      {authError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold mb-2">{authError}</p>
          <Link
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
          >
            Sign In Again
          </Link>
        </div>
      )}
      <div>
        {loading ? (
          <div className="flex justify-center p-5"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...</div>
        ) : byStatus(tab).length === 0 ? (
          <div className="rounded border p-8 text-center bg-white text-gray-500">No {tab} inspections for today.</div>
        ) : (
          <div className="space-y-3">
            {byStatus(tab).map(b => (
              <div key={b.id} className="border rounded-lg px-5 py-4 bg-white shadow flex items-center justify-between">
                <div>
                  <div className="font-bold">{b.inspection_types?.name ?? "Inspection"}</div>
                  <div className="text-xs text-gray-500">{b.teams?.name ?? "Team"}</div>
                  <div className="text-xs">
                    Slot: {b.start_time}
                    {b.status === 'ongoing' &&
                      <span className="ml-2 px-2 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">Ongoing</span>
                    }
                    {tab === 'completed' && (
                      <span className="ml-2 px-2 py-0.5 rounded-full border font-bold"
                        style={{
                          background: b.inspection_results?.[0]?.status === 'passed' ? '#e6fff2' : b.inspection_results?.[0]?.status === 'failed' ? '#ffebee' : '#eee',
                          color: b.inspection_results?.[0]?.status === 'passed' ? '#0f5132' : b.inspection_results?.[0]?.status === 'failed' ? '#b71c1c' : '#555',
                          borderColor: b.inspection_results?.[0]?.status === 'passed' ? '#0f5132' : b.inspection_results?.[0]?.status === 'failed' ? '#b71c1c' : '#555',
                        }}>
                        {b.inspection_results?.[0]?.status === 'passed'
                          ? 'Passed'
                          : b.inspection_results?.[0]?.status === 'failed'
                          ? 'Failed'
                          : b.inspection_results?.[0]?.status ?? ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex flex-col items-end gap-2">
                  {tab === 'upcoming' && (role === 'scrutineer' || role === 'admin' || role === 'judge') && (
                    <Link
                      href={`/scrutineering/live/${b.id}`}
                      className="inline-flex items-center gap-1 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded font-semibold shadow text-sm transition"
                    >
                      <FaPlay className="mr-1" /> Start
                    </Link>
                  )}
                  {tab === 'ongoing' && (
                    <Link
                      href={`/scrutineering/live/${b.id}`}
                      className={`inline-flex items-center gap-1 px-4 py-2 rounded font-semibold shadow text-sm transition
                        ${role === 'scrutineer' || role === 'admin' || role === 'judge'
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-yellow-100 text-yellow-800 pointer-events-none border cursor-default'
                        }`}
                    >
                      <FaPlay className="mr-1" /> Ongoing
                    </Link>
                  )}
                  {tab === 'completed' && (
                    <div className="flex gap-2 items-center">
                      <Link
                        href={`/scrutineering/live/${b.id}`}
                        className="inline-flex items-center gap-1 bg-blue-900 hover:bg-blue-700 text-white px-3 py-2 rounded font-semibold shadow text-sm transition"
                      >
                        Review
                      </Link>
                      {(role === 'scrutineer' || role === 'admin' || role === 'judge') && (
                        <button
                          className="text-red-600 hover:text-red-900 ml-2 flex items-center gap-1"
                          onClick={() => exportInspectionPDF(b.id)}
                          title="Export as PDF"
                        >
                          <FaFilePdf className="mr-1" /> PDF
                        </button>
                      )}
                      {b.inspection_results?.[0]?.status === 'passed' && (role === 'scrutineer' || role === 'admin') && (
                        <button
                          className="ml-2 text-orange-700 hover:text-orange-900 flex items-center gap-1 border border-orange-300 rounded px-3 py-1 text-sm font-bold shadow"
                          disabled={reinspectLoading === b.id}
                          onClick={() => handleReinspect(b.id)}
                          title="Reset this inspection so the team must re-do all points"
                        >
                          {reinspectLoading === b.id
                            ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            : <FaUndo className="mr-1" />}
                          Re-inspect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
