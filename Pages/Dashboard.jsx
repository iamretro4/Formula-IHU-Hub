import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User"; 
import { Team } from "@/entities/Team";
import { Booking } from "@/entities/Booking";
import { InspectionType } from "@/entities/InspectionType";
import { InspectionResult } from "@/entities/InspectionResult"; 
import {
  Calendar,
  Plus,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Shield,
  RefreshCw 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard({ user }) { 
  const [stats, setStats] = useState({
    totalBookings: 0,
    passedInspections: 0,
    failedInspections: 0,
    ongoingInspections: 0,
    upcomingToday: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [teams, setTeams] = useState([]);
  const [inspectionTypes, setInspectionTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [allBookings, allTeams, allInspectionTypes] = await Promise.all([
        Booking.list("-created_date"),
        Team.list(),
        InspectionType.list("sort_order")
      ]);

      setTeams(allTeams);
      setInspectionTypes(allInspectionTypes);

      // Filter bookings based on user role
      let relevantBookings = allBookings;
      if (user.app_role === 'team_member' ||
          user.app_role === 'team_leader' ||
          user.app_role === 'inspection_responsible') {
        relevantBookings = allBookings.filter(booking =>
          booking.team_id === user.team_id
        );
      }

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todaysBookings = relevantBookings.filter(booking => booking.date === today);

      setStats({
        totalBookings: relevantBookings.length,
        passedInspections: relevantBookings.filter(b => b.status === 'passed').length,
        failedInspections: relevantBookings.filter(b => b.status === 'failed').length,
        ongoingInspections: relevantBookings.filter(b => b.status === 'ongoing').length,
        upcomingToday: todaysBookings.filter(b => b.status === 'upcoming').length
      });

      setRecentBookings(relevantBookings.slice(0, 10));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setLoading(false);
  }, [user]); 

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); 

  const handleReinspection = async (booking) => {
    if (!window.confirm("Are you sure you want to require a re-inspection for this item? This will create a new 'failed' booking that the team must address.")) {
      return;
    }
    try {
      // Instead of changing the existing booking, create a new failed booking to indicate re-inspection needed
      const newFailedBooking = {
        team_id: booking.team_id,
        inspection_type_id: booking.inspection_type_id,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        resource_index: booking.resource_index,
        status: 'failed',
        is_rescrutineering: true,
        created_by: user.email
      };
      await Booking.create(newFailedBooking);
      await loadDashboardData(); 
    } catch (error) {
      console.error("Failed to request re-inspection:", error);
    }
  };

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
      'ongoing': 'bg-yellow-100 text-yellow-800',
      'passed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors['upcoming'];
  };

  const getStatusIcon = (status) => {
    const icons = {
      'upcoming': Clock,
      'ongoing': AlertTriangle,
      'passed': CheckCircle,
      'failed': XCircle,
      'cancelled': XCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.first_name} {user?.last_name}
          </p>
        </div>

        <div className="flex gap-3">
          {(user?.app_role === 'team_leader' || user?.app_role === 'inspection_responsible') && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to={createPageUrl("BookInspection")}>
                <Plus className="w-4 h-4 mr-2" />
                Book Inspection
              </Link>
            </Button>
          )}

          {(user?.app_role === 'admin' || user?.app_role === 'scrutineer') && (
            <Button asChild variant="outline">
              <Link to={createPageUrl("LiveInspections")}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Live Inspections
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{stats.passedInspections}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div className="text-2xl font-bold text-red-600">{stats.failedInspections}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ongoing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="text-2xl font-bold text-yellow-600">{stats.ongoingInspections}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{stats.upcomingToday}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Button
          asChild
          variant="outline"
          className="h-20 flex-col gap-2 bg-white hover:bg-gray-50"
        >
          <Link to={createPageUrl("Calendar")}>
            <Calendar className="w-6 h-6" />
            <span>View Calendar</span>
          </Link>
        </Button>

        {(user?.app_role === 'admin' || user?.app_role === 'scrutineer') && (
          <Button
            asChild
            variant="outline"
            className="h-20 flex-col gap-2 bg-white hover:bg-gray-50"
          >
            <Link to={createPageUrl("LiveInspections")}>
              <ClipboardList className="w-6 h-6" />
              <span>Start Inspection</span>
            </Link>
          </Button>
        )}

        {user?.app_role === 'admin' && (
          <Button
            asChild
            variant="outline"
            className="h-20 flex-col gap-2 bg-white hover:bg-gray-50"
          >
            <Link to={createPageUrl("AdminPanel")}>
              <Shield className="w-6 h-6" />
              <span>Admin Panel</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Recent Bookings */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No bookings found</p>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(booking.status)}
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium">{getInspectionTypeName(booking.inspection_type_id)}</p>
                      <p className="text-sm text-gray-600">
                        {getTeamName(booking.team_id)} • {booking.date} at {booking.start_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {booking.is_rescrutineering && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        Rescrutineering
                      </Badge>
                    )}
                    {(user?.app_role === 'admin' || user?.app_role === 'scrutineer') && booking.status === 'passed' && (
                      <Button variant="outline" size="sm" onClick={() => handleReinspection(booking)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-inspect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}