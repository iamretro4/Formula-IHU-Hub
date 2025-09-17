import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Team } from '@/entities/Team';
import { TrackSession } from '@/entities/TrackSession';
import { TrackIncident } from '@/entities/TrackIncident';
import { ExternalTimingData } from '@/entities/ExternalTimingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  Clock,
  MapPin,
  Activity,
  Eye,
  TrendingUp
} from 'lucide-react';

export default function LiveTrackDataPage({ user }) {
  const [teams, setTeams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [timingData, setTimingData] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTeams, allSessions, allIncidents, allTimingData] = await Promise.all([
        Team.list('name'),
        TrackSession.list('-timestamp'),
        TrackIncident.list('-timestamp'),
        ExternalTimingData.list('-start_time')
      ]);
      
      setTeams(allTeams);
      
      // Filter to today's data
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = allSessions.filter(s => s.timestamp?.startsWith(today));
      const todayIncidents = allIncidents.filter(i => i.timestamp?.startsWith(today));
      const todayTiming = allTimingData.filter(t => t.start_time?.startsWith(today));
      
      setSessions(todaySessions);
      setIncidents(todayIncidents);
      setTimingData(todayTiming);
      
      // Calculate currently active sessions (entries without matching exits)
      const teamSessions = {};
      todaySessions.forEach(session => {
        if (!teamSessions[session.team_id]) {
          teamSessions[session.team_id] = [];
        }
        teamSessions[session.team_id].push(session);
      });
      
      const active = Object.entries(teamSessions)
        .filter(([teamId, teamSessions]) => {
          const lastSession = teamSessions[teamSessions.length - 1];
          return lastSession.session_type === 'entry';
        })
        .map(([teamId, teamSessions]) => ({
          team_id: teamId,
          entry_time: teamSessions[teamSessions.length - 1].timestamp,
          event_type: teamSessions[teamSessions.length - 1].event_type
        }));
      
      setActiveSessions(active);
      
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds for live data
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? `${team.name} (#${team.vehicle_number})` : 'Unknown Team';
  };

  const getEventColor = (eventType) => {
    const colors = {
      'practice': 'bg-gray-100 text-gray-800',
      'acceleration': 'bg-red-100 text-red-800',
      'skidpad': 'bg-blue-100 text-blue-800',
      'autocross': 'bg-green-100 text-green-800',
      'endurance': 'bg-purple-100 text-purple-800',
      'efficiency': 'bg-yellow-100 text-yellow-800'
    };
    return colors[eventType] || 'bg-gray-100 text-gray-800';
  };

  const getSessionStats = () => {
    const entryCount = sessions.filter(s => s.session_type === 'entry').length;
    const exitCount = sessions.filter(s => s.session_type === 'exit').length;
    
    return {
      total_entries: entryCount,
      total_exits: exitCount,
      currently_on_track: entryCount - exitCount,
      total_incidents: incidents.length,
      total_runs: timingData.length
    };
  };

  const getBestTimes = () => {
    const eventBests = {};
    
    timingData.forEach(data => {
      if (data.status === 'valid') {
        if (!eventBests[data.event_type] || data.final_time < eventBests[data.event_type].time) {
          eventBests[data.event_type] = {
            time: data.final_time,
            team_id: data.team_id
          };
        }
      }
    });
    
    return eventBests;
  };

  const stats = getSessionStats();
  const bestTimes = getBestTimes();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Track Data</h1>
          <p className="text-gray-600 mt-1">Real-time track activity and incident monitoring</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Teams On Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{stats.currently_on_track}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{stats.total_runs}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Track Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-600" />
              <div className="text-2xl font-bold text-gray-600">{stats.total_entries}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Track Exits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">{stats.total_exits}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">{stats.total_incidents}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active">Currently Active</TabsTrigger>
          <TabsTrigger value="times">Best Times</TabsTrigger>
          <TabsTrigger value="sessions">Session Log</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Currently Active Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teams Currently On Track
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No teams currently on track</p>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{getTeamName(session.team_id)}</p>
                        <p className="text-sm text-gray-600">
                          On track since: {new Date(session.entry_time).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge className={getEventColor(session.event_type)}>
                        {session.event_type.charAt(0).toUpperCase() + session.event_type.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best Times Tab */}
        <TabsContent value="times" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(bestTimes).map(([eventType, data]) => (
              <Card key={eventType} className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="capitalize">
                    {eventType} - Best Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {data.time.toFixed(3)}s
                    </div>
                    <p className="text-sm text-gray-600">{getTeamName(data.team_id)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {Object.keys(bestTimes).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No timing data available yet</p>
              </CardContent>
            </Card>
 