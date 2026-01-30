'use client'
import React from "react"
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import getSupabaseClient, { ensureSupabaseConnection } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  Calendar, 
  Clock, 
  Zap, 
  Wrench, 
  Battery, 
  Plus, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

type InspectionType = {
  id: string
  name: string
  duration_minutes: number
  concurrent_slots: number
  sort_order: number
  active: boolean
  key: string
  prerequisites?: string[]
}

type Booking = {
  id: string
  inspection_type_id: string
  team_id: string
  start_time: string
  end_time: string
  resource_index: number
  status: string
  date: string
  teams?: { name: string } | { name: string }[] | null
  inspection_types?: { name: string } | { name: string }[] | null
  team?: { name: string } | { name: string }[] | null
}

const allowedTypes = ['Mechanical', 'Accumulator', 'Electrical']

function getSlots(startTime: string, endTime: string, duration: number) {
  const slots: string[] = []
  let [h, m] = startTime.split(':').map(Number)
  let [eh, em] = endTime.split(':').map(Number)
  let end = eh * 60 + em
  let minutes = h * 60 + m
  while (minutes + duration <= end) {
    let hours = String(Math.floor(minutes / 60)).padStart(2, '0')
    let mins = String(minutes % 60).padStart(2, '0')
    slots.push(`${hours}:${mins}`)
    minutes += duration
  }
  return slots
}

function getTeamName(b: Booking) {
  if (!b.teams && !b.team) return ""
  
  // Handle array format
  if (Array.isArray(b.teams) && b.teams[0]?.name) return b.teams[0].name
  if (Array.isArray(b.team) && b.team[0]?.name) return b.team[0].name
  
  // Handle object format
  if (b.teams && typeof b.teams === 'object' && 'name' in b.teams) return b.teams.name
  if (b.team && typeof b.team === 'object' && 'name' in b.team) return b.team.name
  
  return ""
}

function getInspectionTypeName(b: Booking) {
  if (!b.inspection_types) return ""
  
  if (Array.isArray(b.inspection_types) && b.inspection_types[0]?.name) {
    return b.inspection_types[0].name
  }
  if (typeof b.inspection_types === 'object' && 'name' in b.inspection_types) {
    return b.inspection_types.name
  }
  return ""
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Electrical: <Zap className="w-4 h-4" />,
  Mechanical: <Wrench className="w-4 h-4" />,
  Accumulator: <Battery className="w-4 h-4" />,
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <AlertTriangle className="w-3 h-3" /> },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircle2 className="w-3 h-3" /> },
}

export default function ScrutineeringCalendarDay() {
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]
  const supabase = useMemo(() => getSupabaseClient(), [])
  const router = useRouter()
  const { user, profile: authProfile, loading: authLoading } = useAuth()

  // Team leaders only get User Management; redirect if they hit scrutineering
  useEffect(() => {
    if (authLoading || !authProfile) return
    if (authProfile.app_role === 'team_leader') {
      router.replace('/dashboard')
    }
  }, [authLoading, authProfile, router])

  const fetchData = useCallback(async () => {
    if (authLoading || !user) return
    
    setLoading(true)
    setError(null)
    let active = true

    try {
      // Ensure connection is valid before making queries
      const connected = await ensureSupabaseConnection()
      if (!connected && active) {
        console.warn('Supabase connection not available, retrying...')
        await new Promise(resolve => setTimeout(resolve, 500))
        const retryConnected = await ensureSupabaseConnection()
        if (!retryConnected) {
          throw new Error('Failed to establish database connection')
        }
      }

      // Verify user is still valid
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!currentUser || !active) return

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('app_role, team_id')
        .eq('id', currentUser.id)
        .single()
      
      if (profileError) throw profileError

      if (active) {
        setUserRole(profile?.app_role || '')
        setTeamId(profile?.team_id || null)
      }

      const { data: types, error: typesError } = await supabase
        .from('inspection_types')
        .select('*')
        .order('sort_order')
      
      if (typesError) throw typesError

      const typedTypes = (types ?? []) as InspectionType[]
      if (active) {
        setInspectionTypes(typedTypes.filter(t => allowedTypes.includes(t.name)))
      }

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, inspection_type_id, team_id, start_time, end_time, resource_index, status, date, teams(name), inspection_types(name)')
        .eq('date', today)
      
      if (bookingsError) throw bookingsError

      if (active) {
        setAllBookings((bookings ?? []) as unknown as Booking[])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar data'
      if (active) {
        setError(errorMessage)
        toast.error(errorMessage)
      }
      console.error('Error loading calendar data:', err)
    } finally {
      if (active) {
        setLoading(false)
      }
    }
  }, [supabase, today, user, authLoading])

  useEffect(() => {
    fetchData()
    return () => { /* cleanup handled by active flag */ }
  }, [fetchData])

  const gridTimes = getSlots('09:00', '19:00', 120)
  const grid = gridTimes.map(time =>
    [time, ...inspectionTypes.map(type =>
      allBookings.find(b =>
        !!b &&
        b.inspection_type_id &&
        type.id &&
        b.inspection_type_id === type.id &&
        b.start_time === time
      )
    )]
  )

  const typeColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
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

  if (authLoading || loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Scrutineering Calendar
          </h1>
          <div className="mt-2 flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <p className="text-base font-medium">
              {new Date(today).toLocaleDateString(undefined, { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </div>
        </div>
        {error && (
          <Button
            onClick={fetchData}
            variant="outline"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading calendar</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      {!error && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Today&rsquo;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="overflow-x-auto bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-inner">
              <div className="grid" style={{
                gridTemplateColumns: `minmax(80px,1fr) repeat(${inspectionTypes.length}, minmax(200px,1fr))`,
                gap: "1.5rem"
              }}>
                {/* Grid header row */}
                <div key="calendar-time-header" className="font-bold text-gray-700 text-sm text-center mb-2 flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Time
                </div>
                {inspectionTypes.map(type => {
                  const colors = typeColors[type.name] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', gradient: 'from-gray-50 to-gray-100/50' }
                  return (
                    <div 
                      key={`calendar-header-${type.id}`} 
                      className={`font-bold px-4 py-3 rounded-lg mb-2 text-center border-2 shadow-md bg-gradient-to-r ${colors.gradient} ${colors.border} ${colors.text} flex items-center justify-center gap-2`}
                    >
                      {TYPE_ICONS[type.name]}
                      {type.name}
                    </div>
                  )
                })}
                {/* Grid time + types row-by-row */}
                {grid.map((row, idx) => {
                  const timeSlot = row[0] as string
                  const bookings = row.slice(1) as (Booking | undefined)[]
                  return (
                    <React.Fragment key={`calendar-row-${timeSlot}`}>
                      <div 
                        key={`calendar-time-${timeSlot}`} 
                        className="py-3 px-2 font-mono text-sm font-semibold text-gray-700 text-center border-l-2 border-primary/30 bg-gray-50/50 rounded-l-lg"
                      >
                        {timeSlot}
                      </div>
                      {bookings.map((booking: Booking | undefined, colIdx) => {
                        const type = inspectionTypes[colIdx]
                        const isBooked = !!booking
                        const isYours = isBooked && booking?.team_id === teamId
                        const statusInfo = booking?.status ? STATUS_COLORS[booking.status.toLowerCase()] : null
                        return (
                          <div
                            key={`calendar-${timeSlot}-${type?.id}-${booking?.id ?? colIdx}`}
                            className={`mb-2 rounded-lg flex flex-col items-center justify-center border-2 shadow-md transition-all duration-200 px-2 py-3 min-h-[70px] ${
                              isBooked
                                ? (isYours
                                  ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-400 shadow-emerald-200/50 hover:shadow-lg"
                                  : "bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-300 hover:shadow-lg")
                                : "bg-white hover:bg-primary/5 hover:border-primary/30 cursor-pointer hover:shadow-lg"
                            }`}
                          >
                            {isBooked ? (
                              <>
                                <div className="flex items-center gap-1.5 mb-1">
                                  {statusInfo?.icon}
                                  <span className={`text-xs font-bold ${isYours ? "text-emerald-800" : "text-gray-700"}`}>
                                    {isYours ? "Your Team" : "Reserved"}
                                  </span>
                                </div>
                                <span className={`text-xs font-semibold ${isYours ? "text-emerald-700" : "text-gray-600"} mb-1`}>
                                  {getTeamName(booking)}
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{booking?.start_time}</span>
                                </div>
                                {booking?.resource_index && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    Lane {booking.resource_index}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Button
                                size="sm"
                                className="text-xs w-full max-w-[120px] shadow-md hover:shadow-lg transition-all duration-200"
                                variant="outline"
                                onClick={() => router.push('/scrutineering/book')}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Book Slot
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Agenda/Booked panel */}
      {!error && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Today&rsquo;s Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {allBookings.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No bookings scheduled for today</p>
                <p className="text-sm text-gray-400 mt-1">Book an inspection slot to get started</p>
                <Button
                  onClick={() => router.push('/scrutineering/book')}
                  className="mt-4 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Book Inspection
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allBookings.map(b => {
                  const typeName = getInspectionTypeName(b)
                  const teamName = getTeamName(b)
                  const colors = typeColors[typeName] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', gradient: 'from-gray-50 to-gray-100/50' }
                  const statusInfo = b.status ? STATUS_COLORS[b.status.toLowerCase()] : null
                  const isYours = b.team_id === teamId
                  
                  return (
                    <div 
                      key={`panel-card-${b.id}`} 
                      className={`border-2 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:shadow-lg transition-all duration-200 ${
                        isYours 
                          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300' 
                          : `bg-gradient-to-br ${colors.gradient} ${colors.border}`
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {TYPE_ICONS[typeName]}
                            <span className={`font-bold text-base ${colors.text}`}>
                              {typeName}
                            </span>
                            {isYours && (
                              <Badge className="bg-emerald-600 text-white">Your Team</Badge>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 mb-1">{teamName}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{b.start_time}</span>
                            </div>
                            {b.resource_index && (
                              <Badge variant="outline" className="text-xs">
                                Lane {b.resource_index}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {statusInfo && (
                          <Badge className={`${statusInfo.bg} ${statusInfo.text} border-0 flex items-center gap-1`}>
                            {statusInfo.icon}
                            {b.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
