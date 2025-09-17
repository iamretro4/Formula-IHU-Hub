import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Team } from '@/entities/Team';
import { FeedbackAppointment } from '@/entities/FeedbackAppointment';
import { DesignScore } from '@/entities/DesignScore';
import { BusinessPlanScore } from '@/entities/BusinessPlanScore';
import { CostScore } from '@/entities/CostScore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CalendarPlus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
];

export default function FeedbackBookingPage({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  const [bookingData, setBookingData] = useState({
    event_type: '',
    appointment_date: '',
    start_time: '',
    location: '',
    notes: ''
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load existing appointments
      const teamAppointments = await FeedbackAppointment.filter({ 
        team_id: user.team_id 
      }, '-created_date');
      setAppointments(teamAppointments);

      // Check which events have approved scores (can book feedback)
      const [designScores, bpScores, costScores] = await Promise.all([
        DesignScore.filter({ team_id: user.team_id, approved: true }),
        BusinessPlanScore.filter({ team_id: user.team_id, approved: true }),
        CostScore.filter({ team_id: user.team_id, approved: true })
      ]);

      const events = [];
      if (designScores.length > 0) events.push('design');
      if (bpScores.length > 0) events.push('business_plan');
      if (costScores.length > 0) events.push('cost_manufacturing');

      setAvailableEvents(events);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookAppointment = async () => {
    if (!bookingData.event_type || !bookingData.appointment_date || !bookingData.start_time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsBooking(true);
    try {
      const endTime = new Date(`1970-01-01T${bookingData.start_time}:00`);
      endTime.setMinutes(endTime.getMinutes() + 30); // 30-minute slots
      
      await FeedbackAppointment.create({
        team_id: user.team_id,
        judge_id: '', // Will be assigned by admin
        event_type: bookingData.event_type,
        appointment_date: bookingData.appointment_date,
        start_time: bookingData.start_time,
        end_time: endTime.toTimeString().substring(0, 5),
        location: bookingData.location,
        notes: bookingData.notes,
        booked_by: user.id
      });

      // Reset form
      setBookingData({
        event_type: '',
        appointment_date: '',
        start_time: '',
        location: '',
        notes: ''
      });

      loadData();
      alert('Feedback appointment requested successfully!');
    } catch (error) {
      console.error('Failed to book appointment:', error);
      alert('Failed to book appointment. Please try again.');
    }
    setIsBooking(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (availableEvents.length === 0) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback Appointments</h1>
            <p className="text-gray-600 mt-1">Book feedback sessions with judges</p>
          </div>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Feedback Available</AlertTitle>
          <AlertDescription>
            You can only book feedback appointments after your scores have been approved and released by the judges.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Appointments</h1>
          <p className="text-gray-600 mt-1">Book feedback sessions with judges</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5" />
              Book New Appointment
            </CardTitle>
            <CardDescription>
              Request a feedback appointment for your approved scores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select
                value={bookingData.event_type}
                onValueChange={(value) => setBookingData(prev => ({ ...prev, event_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map(event => (
                    <SelectItem key={event} value={event}>
                      {event.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Date</Label>
              <Input
                type="date"
                value={bookingData.appointment_date}
                onChange={(e) => setBookingData(prev => ({ ...prev, appointment_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred Time</Label>
              <Select
                value={bookingData.start_time}
                onValueChange={(value) => setBookingData(prev => ({ ...prev, start_time: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(time => (
                    <SelectItem key={time} value={time}>
                      {time} - {new Date(`1970-01-01T${time}:00`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Location</Label>
              <Input
                value={bookingData.location}
                onChange={(e) => setBookingData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Judge Tent, Team Paddock"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any specific topics you'd like to discuss..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleBookAppointment}
              disabled={isBooking || !bookingData.event_type}
              className="w-full"
            >
              {isBooking ? 'Requesting...' : 'Request Appointment'}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Your Appointments
            </CardTitle>
            <CardDescription>Scheduled and pending appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {appointment.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                        {' '}at {appointment.start_time}
                      </p>
                      {appointment.location && (
                        <p className="text-sm text-gray-600">
                          Location: {appointment.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {appointment.status === 'scheduled' ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <Clock className="w-4 h-4 text-orange-500" />
                      }
                      <span className="text-xs capitalize">
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {appointments.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No appointments scheduled yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}