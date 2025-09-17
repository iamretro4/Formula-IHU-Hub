
import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Team } from "@/entities/Team";
import { Booking } from "@/entities/Booking";
import { InspectionType } from "@/entities/InspectionType";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Calendar() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);

  const loadCalendarData = useCallback(async () => {
    try {
      const [currentUser, allBookings, allInspectionTypes, allTeams] = await Promise.all([
        User.me(),
        Booking.list(),
        InspectionType.list("sort_order"),
        Team.list()
      ]);

      setUser(currentUser);
      setInspectionTypes(allInspectionTypes);
      setTeams(allTeams);

      // Filter to today's bookings
      const todaysBookings = allBookings.filter(booking => booking.date === currentDate);
      
      // Filter based on user role
      let relevantBookings = todaysBookings;
      if (currentUser.app_role === 'team_member' || 
          currentUser.app_role === 'team_leader' || 
          currentUser.app_role === 'inspection_responsible') {
        relevantBookings = todaysBookings.filter(booking => 
          booking.team_id === currentUser.team_id
        );
      }

      setBookings(relevantBookings);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    }
    setLoading(false);
  }, [currentDate]); // Add currentDate to dependencies because it's used inside loadCalendarData

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]); // Depend on the memoized loadCalendarData

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : teamId;
  };

  const getInspectionTypeName = (inspectionTypeId) => {
    const type = inspectionTypes.find(t => t.id === inspectionTypeId);
    return type ? type.name : inspectionTypeId;
  };

  const getStatusColor = (status) => {
    const colors = {
      'upcoming': 'bg-blue-100 text-blue-800',
      'ongoing': 'bg-yellow-100 text-yellow-800 animate-pulse',
      'passed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors['upcoming'];
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getBookingsForTimeSlot = (time, inspectionTypeId, resourceIndex = 0) => {
    return bookings.filter(booking => 
      booking.start_time === time && 
      booking.inspection_type_id === inspectionTypeId &&
      booking.resource_index === resourceIndex
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspection Calendar</h1>
            <p className="text-gray-600 mt-1">
              Today: {new Date(currentDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
        
        {(user?.app_role === 'team_leader' || user?.app_role === 'inspection_responsible') && (
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to={createPageUrl("BookInspection")}>
              <Plus className="w-4 h-4 mr-2" />
              Book Inspection
            </Link>
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      <Card className="bg-white shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header */}
              <div className="grid grid-cols-10 bg-gray-50 border-b">
                <div className="p-3 font-semibold text-sm text-gray-700 border-r">Time</div>
                {inspectionTypes.map((type) => {
                  if (type.concurrent_slots === 1) {
                    return (
                      <div key={type.id} className="p-3 font-semibold text-sm text-gray-700 text-center border-r">
                        {type.name}
                      </div>
                    );
                  } else {
                    return (
                      <div key={type.id} className="col-span-2 border-r">
                        <div className="p-2 font-semibold text-sm text-gray-700 text-center border-b">
                          {type.name}
                        </div>
                        <div className="grid grid-cols-2">
                          <div className="p-1 text-xs text-gray-600 text-center border-r">Lane 1</div>
                          <div className="p-1 text-xs text-gray-600 text-center">Lane 2</div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Time Slots */}
              <div className="max-h-96 overflow-y-auto">
                {timeSlots.filter((_, index) => index % 4 === 0).map((time) => (
                  <div key={time} className="grid grid-cols-10 border-b hover:bg-gray-50">
                    <div className="p-3 text-sm text-gray-600 border-r font-medium">
                      {time}
                    </div>
                    {inspectionTypes.map((type) => {
                      if (type.concurrent_slots === 1) {
                        const slotBookings = getBookingsForTimeSlot(time, type.id, 0);
                        return (
                          <div key={type.id} className="p-2 border-r min-h-[60px] flex flex-col gap-1">
                            {slotBookings.map((booking) => (
                              <div key={booking.id} className="relative">
                                <Badge className={`${getStatusColor(booking.status)} w-full justify-start text-xs`}>
                                  <div className="truncate">
                                    {getTeamName(booking.team_id)}
                                  </div>
                                </Badge>
                                {booking.is_rescrutineering && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <div key={type.id} className="col-span-2 border-r grid grid-cols-2">
                            {[0, 1].map((resourceIndex) => {
                              const slotBookings = getBookingsForTimeSlot(time, type.id, resourceIndex);
                              return (
                                <div key={resourceIndex} className={`p-2 min-h-[60px] flex flex-col gap-1 ${resourceIndex === 0 ? 'border-r' : ''}`}>
                                  {slotBookings.map((booking) => (
                                    <div key={booking.id} className="relative">
                                      <Badge className={`${getStatusColor(booking.status)} w-full justify-start text-xs`}>
                                        <div className="truncate">
                                          {getTeamName(booking.team_id)}
                                        </div>
                                      </Badge>
                                      {booking.is_rescrutineering && (
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">Ongoing</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Passed</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">Failed</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Rescrutineering</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
