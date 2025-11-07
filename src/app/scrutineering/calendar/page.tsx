'use client'
import React from "react"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

export default function ScrutineeringCalendarDay() {
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [teamId, setTeamId] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('app_role, team_id')
        .eq('id', user.id)
        .single()
      setUserRole(profile?.app_role || '')
      setTeamId(profile?.team_id || null)
      const { data: types } = await supabase
        .from('inspection_types')
        .select('*')
        .order('sort_order')
      const typedTypes = (types ?? []) as InspectionType[]
      setInspectionTypes(typedTypes.filter(t => allowedTypes.includes(t.name)))

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, inspection_type_id, team_id, start_time, end_time, resource_index, status, date, teams(name), inspection_types(name)')
        .eq('date', today)
      setAllBookings((bookings ?? []) as unknown as Booking[])
    })()
    return () => { active = false }
  }, [supabase, today])

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

  const typeColors: Record<string, string> = {
    Electrical: 'bg-yellow-100 text-yellow-700',
    Mechanical: 'bg-blue-100 text-blue-700',
    Accumulator: 'bg-green-100 text-green-700',
  }

  return (
    <div className="p-5">
      <header className="flex flex-col items-center gap-0 mb-4">
        <h1 className="text-2xl font-extrabold mb-1">Scrutineering Grid - Today</h1>
        <div className="text-sm font-medium text-slate-500 tracking-wide">
          {new Date(today).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
        </div>
      </header>
      <div className="overflow-x-auto bg-slate-50 p-4 rounded-2xl shadow border">
        <div className="grid" style={{
          gridTemplateColumns: `minmax(70px,1fr) repeat(${inspectionTypes.length}, minmax(180px,1fr))`,
          gap: "2rem"
        }}>
          {/* Grid header row */}
          <div key="calendar-time-header" className="font-semibold text-gray-500 text-xs text-center mb-2">Time</div>
          {inspectionTypes.map(type =>
            <div key={`calendar-header-${type.id}`} className={`font-semibold px-2 py-1 rounded mb-2 text-center border shadow-sm ${typeColors[type.name] || "bg-slate-100 text-slate-700"}`}>
              {type.name}
            </div>
          )}
          {/* Grid time + types row-by-row */}
          {grid.map((row, idx) => {
            const timeSlot = row[0] as string
            const bookings = row.slice(1) as (Booking | undefined)[]
            return (
              <React.Fragment key={`calendar-row-${timeSlot}`}>
                <div key={`calendar-time-${timeSlot}`} className="py-1 px-2 font-mono text-sm text-gray-500 text-center border-l-2 border-transparent">{timeSlot}</div>
                {bookings.map((booking: Booking | undefined, colIdx) => {
                  const type = inspectionTypes[colIdx]
                  const isBooked = !!booking
                  const isYours = isBooked && booking?.team_id === teamId
                  return (
                    <div
                      key={`calendar-${timeSlot}-${type?.id}-${booking?.id ?? colIdx}`}
                      className={`mb-1 rounded-lg flex flex-col items-center justify-center border shadow-sm px-1.5 py-2 bg-white min-h-[54px] ${
                        isBooked
                          ? (isYours
                            ? "bg-emerald-100 border-emerald-300"
                            : "bg-gray-100 border-gray-200 ring-0")
                          : "hover:bg-primary/10 cursor-pointer"
                      }`}
                    >
                      {isBooked ? (
                        <>
                          <span className={`inline-block text-xs font-bold whitespace-pre-wrap ${isYours ? "text-emerald-800" : "text-gray-600"}`}>
                            {isYours ? "Your Team" : "Reserved"}
                          </span>
                          <span className="text-xxs text-gray-400 font-medium">
                            {getTeamName(booking)}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-400">{booking?.start_time}</span>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="text-xs w-full max-w-[100px] shadow"
                          variant="outline"
                          onClick={() => router.push('/scrutineering/book')}
                        >
                          + Book
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
      {/* Agenda/Booked panel */}
      <aside className="max-w-2xl mx-auto my-10">
        <h2 className="text-base font-semibold mb-3">Booked Inspections (Today)</h2>
        <div className="flex flex-col gap-2">
          {allBookings.length === 0 ? (
            <div className="rounded border p-6 text-center text-gray-500 bg-white">No bookings for today.</div>
          ) : (
            allBookings.map(b => (
              <div key={`panel-card-${b.id}`} className="border rounded-lg bg-white p-4 flex flex-col sm:flex-row justify-between items-center shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 w-full">
                  <div className="font-bold flex gap-2 items-center">
                    {/* Inspection type always shown */}
                    <span>{getInspectionTypeName(b)}</span>
                    <span className="font-medium text-gray-600">{getTeamName(b)}</span>
                  </div>
                  <div className="text-gray-500 text-sm">
                    {b.start_time}
                    {b.resource_index ? <>, Lane {b.resource_index}</> : null}
                  </div>
                </div>
                <div>
                  <Badge>{b.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
