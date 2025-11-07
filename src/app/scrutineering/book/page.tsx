'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, Info, ArrowLeft, Trash2 } from 'lucide-react'
import { DateTime } from 'luxon'

const EEST_ZONE = 'Europe/Athens'

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
  const supabase = createClientComponentClient()
  const todayDate = DateTime.now().setZone(EEST_ZONE).toISODate()

  // Initial load
  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) {
      return
    }
    
    let active = true
    ;(async () => {
      setInitialLoading(true)
      setError(null)
      
      if (!user || !authProfile) {
        setError('Not authenticated'); setInitialLoading(false); return
      }
      
      setUserRole(authProfile.app_role ?? null)
      if (!authProfile.team_id) {
        setError('No team profile found. Please complete your profile first.')
        setInitialLoading(false); return
      }
      setTeamId(authProfile.team_id)
      if (authProfile.app_role === 'admin') {
        const { data: allTeams } = await supabase.from('teams').select('id, name').order('name')
        setTeams((allTeams || []) as Team[])
        if (!adminViewTeam && allTeams && allTeams.length > 0) setAdminViewTeam(allTeams[0].id)
      } else {
        setAdminViewTeam(authProfile.team_id)
      }
      const { data: types, error: typesError } = await supabase
        .from('inspection_types')
        .select('id, name, duration_minutes, concurrent_slots, prerequisites, active, key')
        .order('sort_order', { ascending: true })
      if (typesError) {
        setError(typesError.message); setInitialLoading(false); return
      }
      const { data: teamB, error: bookingsError } = await supabase
        .from('bookings')
        .select('inspection_type_id, status')
        .eq('team_id', adminViewTeam ?? authProfile.team_id)
      if (bookingsError) {
        setError(bookingsError.message); setInitialLoading(false); return
      }
      setTeamBookings((teamB ?? []) as Booking[])
      setInspectionTypes(
        ((types ?? []) as any[]).map((t: any) => {
          const passed = (teamB as any[])?.some(
            (b: any) => b.inspection_type_id === t.id && b.status === 'passed'
          )
          let prerequisitesMet = true
          if (Array.isArray(t.prerequisites) && t.prerequisites.length > 0) {
            for (const reqKey of t.prerequisites) {
              const prereqType = ((types ?? []) as any[]).find((tt: any) => tt.key === reqKey)
              if (prereqType) {
                const prereqPassed = (teamB as any[])?.some(
                  (b: any) => b.inspection_type_id === prereqType.id && b.status === 'passed'
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
            can_book: !!t.active && prerequisitesMet && !passed,
            passed: !!passed,
            subtitle: !prerequisitesMet
              ? `You must pass: ${(Array.isArray(t.prerequisites) ? t.prerequisites.join(', ') : t.prerequisites)} before booking`
              : passed
                ? "Already completed"
                : undefined
          }
        })
      )
      setInitialLoading(false)
    })()
    return () => { active = false }
  }, [authLoading, user, authProfile, supabase, adminViewTeam])

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated'); setLoading(false); return
    }
    const useTeamId = userRole === 'admin' ? adminViewTeam : teamId
    if (!selectedInspectionType || !selectedTime) {
      setError('Select inspection type and time.'); setLoading(false); return
    }
    // Fetch bookings for this slot and find first available lane
    const { data: bookings } = await supabase
      .from('bookings')
      .select('resource_index')
      .eq('inspection_type_id', selectedInspectionType.id)
      .eq('date', todayDate)
      .eq('start_time', selectedTime)
    const reservedLanes = new Set(((bookings ?? []) as any[]).map((b: any) => b.resource_index))
    let lane = 1;
    while (reservedLanes.has(lane) && lane <= (selectedInspectionType?.concurrent_slots ?? 1)) lane++
    if (lane > (selectedInspectionType?.concurrent_slots ?? 1)) {
      setError('All slots full, please refresh.');
      setLoading(false);
      return
    }
    // Insert booking
    const { error: insertError } = await supabase.from('bookings').insert({
      team_id: useTeamId!,
      inspection_type_id: selectedInspectionType.id,
      date: todayDate,
      start_time: selectedTime,
      end_time: DateTime.fromISO(`${todayDate}T${selectedTime}:00`, { zone: EEST_ZONE })
        .plus({ minutes: selectedInspectionType?.duration_minutes ?? 120 })
        .toFormat('HH:mm'),
      resource_index: lane,
      status: 'upcoming',
      notes,
      is_rescrutineering: false,
      created_by: user.id
    } as any)
    setLoading(false)
    if (insertError) { setError(insertError.message); setOk(false) }
    else { setOk(true); setSelectedTime(""); setNotes("") }
  }

  async function handleAdminDeleteBooking(bookingId: string) {
    setLoading(true)
    await supabase.from('bookings').delete().eq('id', bookingId)
    setLoading(false)
    setOk(true) // triggers refetch
  }

  // Admin team selector
  const adminTeamSelector = userRole === 'admin' && teams.length > 0 && (
    <div className="mb-4">
      <label className="font-semibold mr-2">Book for Team:</label>
      <select
        value={adminViewTeam ?? ''}
        onChange={e => setAdminViewTeam(e.target.value)}
        className="border p-1 rounded"
      >
        {teams.map(team => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>
    </div>
  )

  // Admin bookings grid for visual management
  function AdminBookingsGrid() {
    if (userRole !== 'admin' || !selectedInspectionType) return null
    return (
      <div>
        <h2 className="font-semibold text-lg mb-2 mt-8">All Bookings for {selectedInspectionType.name} ({todayDate})</h2>
        <div className="grid grid-cols-3 gap-2">
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
                  <div key={time + "-lane-" + lane} className="bg-blue-100 rounded px-2 py-1 flex items-center gap-2">
                    <span className="font-bold">{booking.teams?.name}</span>
                    <span className="text-xs">({time}, Ln {lane})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-red-600"
                      onClick={() => handleAdminDeleteBooking(booking.id)}
                    ><Trash2 size={18}/></Button>
                  </div>
                )
              }
            }
            if (bookingsForTime.length > 0) {
              return bookingsForTime
            }
            return (
              <div key={time + "-empty"} className="px-2 py-1 text-xs text-gray-400 bg-gray-50 rounded border">
                {time} (Available)
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }
  if (!teamId) {
    return <div className="p-8 text-center text-red-600">No team profile found. Please complete your profile first.</div>
  }
  if (ok) {
    return <div className="max-w-lg mx-auto p-8 text-center text-green-700 font-bold">Booking successful!</div>
  }

  return (
    <div className="flex justify-center pt-12 bg-gray-100 min-h-screen">
      <div className="bg-white max-w-2xl w-full p-8 border rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Book Inspection</h1>
        <p className="text-gray-500 mb-4">
          Book an available inspection slot for today: <span className="font-semibold">{todayDate}</span>
        </p>
        {adminTeamSelector}
        <label className="block font-semibold mb-2">1. Select Inspection Type</label>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {inspectionTypes.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => t.can_book ? setSelectedInspectionType(t) : null}
              disabled={!t.can_book}
              className={`
                flex flex-col items-start border rounded-lg px-5 py-4 transition
                ${t.can_book ? "bg-white hover:border-blue-500 cursor-pointer" : "bg-neutral-100 opacity-60 cursor-not-allowed"}
                ${selectedInspectionType?.id === t.id ? "border-2 border-black" : "border-neutral-200"}
              `}
            >
              <div className="font-bold text-md mb-1">{t.name}</div>
              <div className="text-xs text-gray-600 mb-1">
                {t.duration_minutes} min / {t.concurrent_slots} slot(s)
              </div>
              {t.subtitle && (
                <div className={`text-xs font-semibold ${t.passed ? "text-green-600" : "text-red-500"}`}>{t.subtitle}</div>
              )}
            </button>
          ))}
        </div>
        {selectedInspectionType && (
          <div className="mt-8">
            <label className="block font-semibold mb-3">2. Select Time Slot</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {slots.map(time => {
                const full = !isSlotAvailable(time)
                return (
                  <button
                    key={time}
                    disabled={full || loading}
                    onClick={() => handleSlotClick(time)}
                    className={`
                      px-4 py-2 rounded-lg font-bold text-sm mb-1
                      ${full ? "bg-gray-100 text-gray-400 cursor-not-allowed border" : (selectedTime === time ? "bg-blue-600 text-white" : "bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-400 cursor-pointer")}
                      w-full
                    `}
                    style={{ minWidth: 80 }}
                  >
                    {time}{full ? ' (Full)' : ''}
                  </button>
                )
              })}
            </div>
            <label className="block font-semibold mt-4 mb-2 flex items-center gap-2">Notes
              <span title="Optional. Add context or comments for your booking.">
                <Info className="h-4 w-4 text-blue-400" />
              </span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={200}
              className="w-full border rounded px-3 py-2 bg-neutral-50 focus:bg-white focus:border-blue-300"
              placeholder="Optional remarks (200 chars max)"
            />
            <Button
              disabled={!selectedTime || loading}
              type="button"
              className="w-full mt-4 py-2 text-base font-bold rounded-lg"
              onClick={handleConfirmBooking}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking…
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full mt-2 flex items-center justify-center gap-2"
              onClick={() => { setSelectedInspectionType(null); setSelectedTime(""); setNotes(""); setError(null); setOk(false); }}
            >
              <ArrowLeft className="h-4 w-4" /> Change Inspection Type
            </Button>
            {error && <div className="text-center mt-3 text-red-600 font-semibold">{error}</div>}
          </div>
        )}
        {AdminBookingsGrid()}
      </div>
    </div>
  )
}
