'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { DateTime } from 'luxon'
import {
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react'

type User = {
  id: string
  email?: string
}

type Profile = {
  team_id: string | null
  app_role: string | null
}

type Event = {
  id: string
  name: string
  location?: string
}

type Team = {
  id: string
  name: string
}

type Judge = {
  id: string
  first_name: string
  last_name: string
}

type Booking = {
  id: string
  team_id: string
  slot_id: string
  requested_by: string
  date: string
  start_time: string
  end_time: string
  location: string
  notes?: string
  status: string
  slot?: Event
}

const EEST_ZONE = 'Europe/Athens'
const FEEDBACK_SLOTS_TIMES = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30']

export default function FeedbackBookingPage() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [approvedEvents, setApprovedEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const [selectedDate, setSelectedDate] = useState(DateTime.now().setZone(EEST_ZONE).toISODate())
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [adminTeamId, setAdminTeamId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [modalBooking, setModalBooking] = useState<Booking | null>(null)
  const [modalMode, setModalMode] = useState<'reschedule' | 'assignJudge' | null>(null)
  const [modalDate, setModalDate] = useState('')
  const [modalTime, setModalTime] = useState('')
  const [selectedJudge, setSelectedJudge] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user as User | null)
      if (!user) return
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('team_id, app_role')
        .eq('id', user.id)
        .single() as { data: Profile | null }
      setProfile(profileData)
      setTeamId(profileData?.team_id ?? null)
      setUserRole(profileData?.app_role ?? null)
      if (profileData?.app_role === 'admin') fetchTeams()
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (teamId) loadApprovedEvents(teamId)
  }, [teamId])

  useEffect(() => {
    if (selectedEvent && selectedDate) fetchBookings(selectedEvent.id, selectedDate)
  }, [selectedEvent, selectedDate])

  useEffect(() => {
    if (userRole === 'admin' && adminTeamId) {
      loadApprovedEvents(adminTeamId)
      fetchJudges()
    }
  }, [userRole, adminTeamId])

  async function loadApprovedEvents(team: string) {
    if (!team) return
    const { data, error } = await supabase.rpc('fetch_approved_events_for_team', { team_id_input: team })
    if (error) setError(error.message)
    else setApprovedEvents((data ?? []) as Event[])
  }

  async function fetchBookings(eventId: string, date: string) {
    const { data, error } = await supabase.from('feedback_bookings')
      .select('*')
      .eq('slot_id', eventId)
      .eq('date', date)
    if (error) setError(error.message)
    else setBookings((data ?? []) as Booking[])
  }

  async function fetchTeams() {
    const { data } = await supabase.from('teams').select('id, name').order('name')
    const teams = (data ?? []) as Team[]
    setTeams(teams)
    if (!adminTeamId && teams.length > 0) setAdminTeamId(teams[0].id)
  }

  async function fetchJudges() {
    const { data } = await supabase.from('user_profiles').select('id, first_name, last_name').eq('app_role', 'judge')
    setJudges((data ?? []) as Judge[])
  }

  function isSlotBooked(time: string) {
    if (!bookings) return false
    return bookings.some(bk => bk.start_time === time && bk.status !== 'rejected')
  }

  async function bookAppointment() {
    setError(null)
    setSuccessMessage(null)
    if (!selectedEvent) {
      setError('Please choose an event.')
      return
    }
    if (!selectedDate) {
      setError('Please select a date.')
      return
    }
    if (!selectedTime) {
      setError('Please select a time slot.')
      return
    }

    const durationMinutes = selectedEvent.name === 'Design Event' ? 60 : 30
    const dtStart = DateTime.fromISO(`${selectedDate}T${selectedTime}`, { zone: EEST_ZONE })
    const dtEnd = dtStart.plus({ minutes: durationMinutes })

    setLoading(true)

    const { error } = await supabase.from('feedback_bookings').insert([{
      team_id: userRole === 'admin' && adminTeamId ? adminTeamId : teamId,
      slot_id: selectedEvent.id,
      requested_by: user?.id,
      date: selectedDate,
      start_time: selectedTime,
      end_time: dtEnd.toFormat('HH:mm'),
      location: selectedEvent.location,
      notes,
      status: 'pending',
    } as any])

    setLoading(false)

    if (error) {
      setError(`Booking failed: ${error.message}`)
    } else {
      setSuccessMessage('Appointment booked successfully!')
      fetchBookings(selectedEvent.id, selectedDate)
      setSelectedTime('')
      setNotes('')
    }
  }

  async function updateBookingStatus(id: string, status: string) {
    const { error } = await supabase.from('feedback_bookings').update({ status } as any).eq('id', id)
    if (error) setError(error.message)
    else if (selectedEvent && selectedDate) fetchBookings(selectedEvent.id, selectedDate)
  }

  async function approveBooking(id: string) {
    await updateBookingStatus(id, 'approved')
  }
  async function rejectBooking(id: string) {
    await updateBookingStatus(id, 'rejected')
  }

  async function rescheduleBooking() {
    if (!modalBooking || !modalDate || !modalTime) {
      setError('Select date and time for reschedule')
      return
    }
    const durationMinutes = modalBooking.slot?.name === 'Design Event' ? 60 : 30
    const dtStart = DateTime.fromISO(`${modalDate}T${modalTime}`, { zone: EEST_ZONE })
    const dtEnd = dtStart.plus({ minutes: durationMinutes })

    const { error } = await supabase.from('feedback_bookings').update({
      date: modalDate,
      start_time: modalTime,
      end_time: dtEnd.toFormat('HH:mm'),
      status: 'rescheduled',
    } as any).eq('id', modalBooking.id)

    if (error) setError(error.message)
    else {
      setSuccessMessage('Rescheduled successfully')
      if (selectedEvent && selectedDate) fetchBookings(selectedEvent.id, selectedDate)
      setModalBooking(null)
      setModalDate('')
      setModalTime('')
      setModalMode(null)
    }
  }

  async function assignJudge() {
    if (!modalBooking || !selectedJudge) {
      setError('Select a judge first')
      return
    }
    const { error } = await supabase.from('feedback_judge_assignments').insert({
      booking_id: modalBooking.id,
      judge_id: selectedJudge,
    } as any)
    if (error) setError(error.message)
    else {
      setSuccessMessage('Judge assigned')
      setModalBooking(null)
      setSelectedJudge(null)
      setModalMode(null)
    }
  }

  function AdminControls() {
    if (userRole !== 'admin') return null

    return (
      <div style={{ marginBottom: '15px' }}>
        <h2 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Admin Panel</h2>
        <label htmlFor="team-picker" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Select Team</label>
        <select
          id="team-picker"
          value={adminTeamId ?? ''}
          onChange={e => setAdminTeamId(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '16px' }}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Feedback Bookings</h3>
        {bookings.length === 0 && <div>No bookings found</div>}
        {bookings.map(bk => (
          <div key={bk.id} style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '8px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <strong>{bk.date} {bk.start_time} - {bk.end_time}</strong> <br />
              Status: <em>{bk.status}</em><br />
              Notes: {bk.notes || 'N/A'} <br />
              Location: {bk.location}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(bk.status === 'pending' || bk.status === 'rescheduled') && (
                <>
                  <button style={buttonStyle} onClick={() => { setModalBooking(bk); setModalMode('reschedule'); setModalDate(bk.date); setModalTime(bk.start_time) }}>Reschedule</button>
                  <button style={buttonStyle} onClick={() => approveBooking(bk.id)}>Approve</button>
                  <button style={{ ...buttonStyle, backgroundColor: '#ef4444', color: 'white' }} onClick={() => rejectBooking(bk.id)}>Reject</button>
                </>
              )}
              <button style={{ ...buttonStyle, backgroundColor: '#f3f4f6' }} onClick={() => { setModalBooking(bk); setModalMode('assignJudge'); setSelectedJudge(null) }}>
                Assign Judge
              </button>
            </div>
          </div>
        ))}

        {modalMode && modalBooking && (
          <div style={modalOverlayStyle as any}>
            <div style={modalContentStyle}>
              {modalMode === 'reschedule' && (
                <>
                  <h4 style={modalHeaderStyle}>Reschedule Booking</h4>
                  <label style={modalLabelStyle}>New Date</label>
                  <input type="date" value={modalDate} onChange={e => setModalDate(e.target.value)} style={modalInputStyle} min={DateTime.now().toISODate() || undefined} />
                  <label style={modalLabelStyle}>New Time</label>
                  <select value={modalTime} onChange={e => setModalTime(e.target.value)} style={modalInputStyle}>
                    <option value="">Select time</option>
                    {FEEDBACK_SLOTS_TIMES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div style={modalButtonsStyle}>
                    <button style={modalCancelButtonStyle} onClick={() => setModalMode(null)}>Cancel</button>
                    <button style={modalActionButtonStyle} onClick={rescheduleBooking}>Save</button>
                  </div>
                </>
              )}
              {modalMode === 'assignJudge' && (
                <>
                  <h4 style={modalHeaderStyle}>Assign Judge</h4>
                  <label style={modalLabelStyle}>Select Judge</label>
                  <select value={selectedJudge || ''} onChange={e => setSelectedJudge(e.target.value)} style={modalInputStyle}>
                    <option value="">Select a judge</option>
                    {judges.map(j => (
                      <option key={j.id} value={j.id}>{j.first_name} {j.last_name}</option>
                    ))}
                  </select>
                  <div style={modalButtonsStyle}>
                    <button style={modalCancelButtonStyle} onClick={() => setModalMode(null)}>Cancel</button>
                    <button style={modalActionButtonStyle} onClick={assignJudge} disabled={!selectedJudge}>Assign</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '1rem auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Feedback Appointments</h1>
      <p>Book feedback sessions with judges for approved scoring events.</p>

      <AdminControls />

      <div style={{ marginTop: '20px' }}>
        <label htmlFor="event-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Event Type
        </label>
        <select
          id="event-select"
          onChange={e => {
            const ev = approvedEvents.find(a => a.id === e.target.value)
            setSelectedEvent(ev ?? null)
          }}
          value={selectedEvent?.id ?? ''}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '12px' }}
        >
          <option value="">Select event</option>
          {approvedEvents.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        <label htmlFor="date-picker" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Preferred Date
        </label>
        <input
          id="date-picker"
          type="date"
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '12px' }}
          min={DateTime.now().setZone(EEST_ZONE).toISODate() || undefined}
          value={selectedDate || ''}
          onChange={e => setSelectedDate(e.target.value)}
        />

        <label htmlFor="time-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Preferred Time
        </label>
        <select
          id="time-select"
          value={selectedTime}
          onChange={e => setSelectedTime(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '12px' }}
        >
          <option value="">Select time slot</option>
          {FEEDBACK_SLOTS_TIMES.map(t => (
            <option key={t} value={t} disabled={isSlotBooked(t)}>{t}{isSlotBooked(t) ? ' (Booked)' : ''}</option>
          ))}
        </select>

        <label htmlFor="notes" style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
          Additional Notes
        </label>
        <textarea
          id="notes"
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '12px' }}
          placeholder="Any specific topics you'd like to discuss..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />

        <button
          onClick={bookAppointment}
          disabled={loading || !selectedEvent || !selectedTime}
          style={{
            padding: '10px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 'bold',
            cursor: loading || !selectedEvent || !selectedTime ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Booking...' : 'Request Appointment'}
        </button>

        {error && (
          <div style={{ marginTop: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle /> <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ marginTop: '1rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info /> <span>{successMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const buttonStyle = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: '#3b82f6',
  color: 'white',
  fontWeight: 'bold',
}

const modalOverlayStyle = {
  position: 'fixed' as const,
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1rem',
  zIndex: 1000,
}

const modalContentStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '1rem',
  width: '100%',
  maxWidth: '400px',
}

const modalHeaderStyle = {
  fontWeight: 'bold',
  fontSize: '1.25rem',
  marginBottom: '1rem',
}

const modalLabelStyle = {
  marginBottom: '0.4rem',
  fontWeight: 'bold',
}

const modalInputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  marginBottom: '1rem',
}

const modalButtonsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.5rem',
}

const modalCancelButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#e5e7eb',
  color: '#374151',
  cursor: 'pointer',
}

const modalActionButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#3b82f6',
}
