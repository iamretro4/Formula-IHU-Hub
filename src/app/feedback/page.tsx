'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { DateTime } from 'luxon'
import {
  Loader2,
  AlertCircle,
  Info,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Users,
  MapPin,
  FileText,
  UserCheck,
  CalendarDays,
  Award,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'

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
  code?: string
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
  teams?: Team
}

const EEST_ZONE = 'Europe/Athens'
const FEEDBACK_SLOTS_TIMES = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30']

export default function FeedbackBookingPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
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
  const [isLoading, setIsLoading] = useState(true)
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
  const [processingBooking, setProcessingBooking] = useState<string | null>(null)

  const loadApprovedEvents = useCallback(async (team: string | null) => {
    if (!team) return
    try {
      const { data, error } = await supabase.rpc('fetch_approved_events_for_team' as any, { team_id_input: team })
      if (error) {
        setError(error.message)
        toast.error(error.message)
        logger.error('[Feedback] Error loading approved events', error)
      } else {
        setApprovedEvents((data ?? []) as Event[])
      }
    } catch (err) {
      logger.error('[Feedback] Error in loadApprovedEvents', err)
    }
  }, [supabase])

  const fetchBookings = useCallback(async (eventId: string, date: string) => {
    try {
      const { data, error } = await supabase.from('feedback_bookings' as any)
        .select('*, teams:team_id(id, name, code)')
        .eq('slot_id', eventId)
        .eq('date', date)
        .order('start_time')
      
      if (error) {
        setError(error.message)
        logger.error('[Feedback] Error fetching bookings', error)
      } else {
        setBookings((data ?? []) as unknown as Booking[])
      }
    } catch (err) {
      logger.error('[Feedback] Error in fetchBookings', err)
    }
  }, [supabase])

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, code')
        .order('name')
      
      if (error) throw error
      
      const teamsData = (data ?? []) as Team[]
      setTeams(teamsData)
      if (!adminTeamId && teamsData.length > 0) setAdminTeamId(teamsData[0].id)
    } catch (err) {
      logger.error('[Feedback] Error fetching teams', err)
    }
  }, [supabase, adminTeamId])

  const fetchJudges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .or('app_role.eq.design_judge_overall,app_role.eq.bp_judge,app_role.eq.cm_judge')
      
      if (error) throw error
      setJudges((data ?? []) as Judge[])
    } catch (err) {
      logger.error('[Feedback] Error fetching judges', err)
    }
  }, [supabase])

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        setUser(user as User | null)
        if (!user) return
        
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('team_id, app_role')
          .eq('id', user.id)
          .single() as { data: Profile | null, error: any }
        
        if (profileError) throw profileError
        setProfile(profileData)
        setTeamId(profileData?.team_id ?? null)
        setUserRole(profileData?.app_role ?? null)
        
        if (profileData?.app_role === 'admin') {
          await fetchTeams()
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error.message)
        toast.error(error.message)
        logger.error('[Feedback] Error loading user', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [supabase, fetchTeams])

  useEffect(() => {
    if (teamId) {
      void loadApprovedEvents(teamId)
    }
  }, [teamId, loadApprovedEvents])

  useEffect(() => {
    if (selectedEvent && selectedDate) {
      void fetchBookings(selectedEvent.id, selectedDate)
    }
  }, [selectedEvent, selectedDate, fetchBookings])

  useEffect(() => {
    if (userRole === 'admin' && adminTeamId) {
      void loadApprovedEvents(adminTeamId)
      void fetchJudges()
    }
  }, [userRole, adminTeamId, loadApprovedEvents, fetchJudges])

  function isSlotBooked(time: string) {
    if (!bookings) return false
    return bookings.some(bk => bk.start_time === time && bk.status !== 'rejected')
  }

  async function bookAppointment() {
    setError(null)
    setSuccessMessage(null)
    
    if (!selectedEvent) {
      const errorMsg = 'Please choose an event.'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }
    if (!selectedDate) {
      const errorMsg = 'Please select a date.'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }
    if (!selectedTime) {
      const errorMsg = 'Please select a time slot.'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    const durationMinutes = selectedEvent.name === 'Design Event' ? 60 : 30
    const dtStart = DateTime.fromISO(`${selectedDate}T${selectedTime}`, { zone: EEST_ZONE })
    const dtEnd = dtStart.plus({ minutes: durationMinutes })

    setLoading(true)

    try {
      const { error: insertError } = await supabase.from('feedback_bookings' as any).insert([{
        team_id: userRole === 'admin' && adminTeamId ? adminTeamId : teamId,
        slot_id: selectedEvent.id,
        requested_by: user?.id,
        date: selectedDate,
        start_time: selectedTime,
        end_time: dtEnd.toFormat('HH:mm'),
        location: selectedEvent.location || 'TBD',
        notes,
        status: 'pending',
      } as any])

      if (insertError) throw insertError

      toast.success('Appointment booked successfully!')
      await fetchBookings(selectedEvent.id, selectedDate)
      setSelectedTime('')
      setNotes('')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      const errorMsg = `Booking failed: ${error.message}`
      setError(errorMsg)
      toast.error(errorMsg)
      logger.error('[Feedback] Error booking appointment', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateBookingStatus(id: string, status: string) {
    setProcessingBooking(id)
    try {
      const { error: updateError } = await supabase
        .from('feedback_bookings' as any)
        .update({ status } as any)
        .eq('id', id)
      
      if (updateError) throw updateError
      
      toast.success(`Booking ${status} successfully`)
      if (selectedEvent && selectedDate) await fetchBookings(selectedEvent.id, selectedDate)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      toast.error(error.message || `Failed to ${status} booking`)
      logger.error('[Feedback] Error updating booking status', err)
    } finally {
      setProcessingBooking(null)
    }
  }

  async function approveBooking(id: string) {
    await updateBookingStatus(id, 'approved')
  }
  
  async function rejectBooking(id: string) {
    if (!confirm('Are you sure you want to reject this booking?')) return
    await updateBookingStatus(id, 'rejected')
  }

  async function rescheduleBooking() {
    if (!modalBooking || !modalDate || !modalTime) {
      const errorMsg = 'Please select date and time for reschedule'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }
    
    setLoading(true)
    try {
      const durationMinutes = modalBooking.slot?.name === 'Design Event' ? 60 : 30
      const dtStart = DateTime.fromISO(`${modalDate}T${modalTime}`, { zone: EEST_ZONE })
      const dtEnd = dtStart.plus({ minutes: durationMinutes })

      const { error: updateError } = await supabase
        .from('feedback_bookings' as any)
        .update({
          date: modalDate,
          start_time: modalTime,
          end_time: dtEnd.toFormat('HH:mm'),
          status: 'rescheduled',
        } as any)
        .eq('id', modalBooking.id)

      if (updateError) throw updateError

      toast.success('Rescheduled successfully')
      if (selectedEvent && selectedDate) await fetchBookings(selectedEvent.id, selectedDate)
      setModalBooking(null)
      setModalDate('')
      setModalTime('')
      setModalMode(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      toast.error(error.message)
      logger.error('[Feedback] Error rescheduling booking', err)
    } finally {
      setLoading(false)
    }
  }

  async function assignJudge() {
    if (!modalBooking || !selectedJudge) {
      const errorMsg = 'Please select a judge first'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }
    
    setLoading(true)
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('feedback_judge_assignments' as any)
        .select('id')
        .eq('booking_id', modalBooking.id)
        .single()
      
      let error
      if (existing) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('feedback_judge_assignments' as any)
          .update({ judge_id: selectedJudge } as any)
          .eq('booking_id', modalBooking.id)
        error = updateError
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from('feedback_judge_assignments' as any)
          .insert({
            booking_id: modalBooking.id,
            judge_id: selectedJudge,
          } as any)
        error = insertError
      }
      
      if (error) throw error

      toast.success('Judge assigned successfully')
      setModalBooking(null)
      setSelectedJudge(null)
      setModalMode(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      toast.error(error.message)
      logger.error('[Feedback] Error assigning judge', err)
    } finally {
      setLoading(false)
    }
  }

  function openRescheduleModal(booking: Booking) {
    setModalBooking(booking)
    setModalMode('reschedule')
    setModalDate(booking.date)
    setModalTime(booking.start_time)
  }

  function openAssignJudgeModal(booking: Booking) {
    setModalBooking(booking)
    setModalMode('assignJudge')
    setSelectedJudge(null)
  }

  function closeModal() {
    setModalBooking(null)
    setModalMode(null)
    setModalDate('')
    setModalTime('')
    setSelectedJudge(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'rescheduled':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Rescheduled</Badge>
      case 'pending':
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading feedback page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          Feedback Appointments
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Book feedback sessions with judges for approved scoring events
        </p>
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

      {/* Admin Controls */}
      {userRole === 'admin' && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              Manage feedback bookings for all teams
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-team-select" className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Team
              </Label>
              <Select value={adminTeamId ?? ''} onValueChange={setAdminTeamId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        {t.code && <Badge variant="outline" className="text-xs">{t.code}</Badge>}
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bookings.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Feedback Bookings
                </h3>
                {bookings.map(bk => (
                  <Card key={bk.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {bk.teams?.code && (
                                <Badge variant="outline" className="font-bold">
                                  {bk.teams.code}
                                </Badge>
                              )}
                              <span className="font-semibold">{bk.teams?.name || 'Unknown Team'}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium">{bk.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{bk.start_time} - {bk.end_time}</span>
                              </div>
                              {bk.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{bk.location}</span>
                                </div>
                              )}
                            </div>
                            {bk.notes && (
                              <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                <MessageSquare className="w-3 h-3 inline mr-1" />
                                {bk.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(bk.status)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                          {(bk.status === 'pending' || bk.status === 'rescheduled') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRescheduleModal(bk)}
                                className="gap-2"
                              >
                                <CalendarDays className="w-4 h-4" />
                                Reschedule
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approveBooking(bk.id)}
                                disabled={processingBooking === bk.id}
                                className="gap-2"
                              >
                                {processingBooking === bk.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectBooking(bk.id)}
                                disabled={processingBooking === bk.id}
                                className="gap-2"
                              >
                                {processingBooking === bk.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAssignJudgeModal(bk)}
                            className="gap-2"
                          >
                            <UserCheck className="w-4 h-4" />
                            Assign Judge
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {bookings.length === 0 && selectedEvent && (
              <div className="text-center py-8">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No bookings found for this event and date</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Form */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Request Feedback Appointment
          </CardTitle>
          <CardDescription>
            Select an event, date, and time slot for your feedback session
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="event-select" className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4" />
              Event Type
            </Label>
            <Select
              value={selectedEvent?.id ?? ''}
              onValueChange={(value) => {
                const ev = approvedEvents.find(a => a.id === value)
                setSelectedEvent(ev ?? null)
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent>
                {approvedEvents.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {approvedEvents.length === 0 && teamId && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                No approved events available. Please ensure your team has approved scores.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-picker" className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Preferred Date
              </Label>
              <Input
                id="date-picker"
                type="date"
                className="h-11"
                min={DateTime.now().setZone(EEST_ZONE).toISODate() || undefined}
                value={selectedDate || ''}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-select" className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Preferred Time
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select time slot..." />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_SLOTS_TIMES.map(t => {
                    const isBooked = isSlotBooked(t)
                    return (
                      <SelectItem 
                        key={t} 
                        value={t} 
                        disabled={isBooked}
                        className={isBooked ? 'opacity-50' : ''}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {t}
                          {isBooked && (
                            <Badge variant="outline" className="text-xs ml-2">
                              Booked
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any specific topics you&rsquo;d like to discuss..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Optional: Add any specific topics or questions you&rsquo;d like to discuss during the feedback session
            </p>
          </div>

          <Button
            onClick={bookAppointment}
            disabled={loading || !selectedEvent || !selectedTime}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Booking Appointment...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-5 w-5" />
                Request Appointment
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Reschedule Modal */}
      <Dialog open={modalMode === 'reschedule' && !!modalBooking} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              Select a new date and time for this feedback appointment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modal-date">New Date</Label>
              <Input
                id="modal-date"
                type="date"
                value={modalDate}
                onChange={e => setModalDate(e.target.value)}
                min={DateTime.now().setZone(EEST_ZONE).toISODate() || undefined}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-time">New Time</Label>
              <Select value={modalTime} onValueChange={setModalTime}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select time..." />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_SLOTS_TIMES.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={rescheduleBooking} disabled={loading || !modalDate || !modalTime}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Judge Modal */}
      <Dialog open={modalMode === 'assignJudge' && !!modalBooking} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Assign Judge
            </DialogTitle>
            <DialogDescription>
              Select a judge for this feedback appointment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="judge-select">Select Judge</Label>
              <Select value={selectedJudge || ''} onValueChange={setSelectedJudge}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a judge..." />
                </SelectTrigger>
                <SelectContent>
                  {judges.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.first_name} {j.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {judges.length === 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  No judges available
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={assignJudge} disabled={loading || !selectedJudge}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assign Judge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
