import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Team } from '@/entities/Team';
import { TrackSession } from '@/entities/TrackSession';
import { TrackIncident } from '@/entities/TrackIncident';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  Flag,
  Users,
  Clock,
  MapPin,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Eye,
  Download
} from 'lucide-react';

const eventTypes = [
  { value: 'practice', label: 'Practice', color: 'bg-gray-100 text-gray-800' },
  { value: 'acceleration', label: 'Acceleration', color: 'bg-red-100 text-red-800' },
  { value: 'skidpad', label: 'Skidpad', color: 'bg-blue-100 text-blue-800' },
  { value: 'autocross', label: 'Autocross', color: 'bg-green-100 text-green-800' },
  { value: 'endurance', label: 'Endurance', color: 'bg-purple-100 text-purple-800' },
  { value: 'efficiency', label: 'Efficiency', color: 'bg-yellow-100 text-yellow-800' }
];

const trackSectors = [
  'Start/Finish',
  'Sector 1', 
  'Sector 2',
  'Sector 3',
  'Chicane',
  'Slalom',
  'Pit Entry',
  'Pit Exit'
];

export default function TrackMarshalPage({ user }) {
  const [teams, setTeams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [selectedSector, setSelectedSector] = useState(user?.assigned_sector || '');

  // Current session/incident state
  const [sessionData, setSessionData] = useState({
    team_id: '',
    event_type: 'practice',
    vehicle_number: '',
    driver_name: '',
    notes: ''
  });

  const [incidentData, setIncidentData] = useState({
    team_id: '',
    event_type: 'practice',
    incident_type: 'DOO',
    description: '',
    severity: 'minor'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTeams, allSessions, allIncidents] = await Promise.all([
        Team.list('name'),
        TrackSession.list('-timestamp'),
        TrackIncident.list('-timestamp')
      ]);
      
      setTeams(allTeams);
      
      // Filter to today's data and current marshal's sector
      const today = new Date().toISOString().split('T')[0];
      setSessions(allSessions.filter(s => 
        s.timestamp?.startsWith(today) && 
        (s.sector === selectedSector || s.marshal_id === user.id)
      ));
      setIncidents(allIncidents.filter(i => 
        i.timestamp?.startsWith(today) && 
        (i.sector === selectedSector || i.marshal_id === user.id)
      ));
      
      setIsActive(user?.marshal_active || false);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  }, [selectedSector, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSectorAssignment = async () => {
    if (!selectedSector) return;
    try {
      await User.updateMyUserData({ 
        assigned_sector: selectedSector,
        marshal_active: true 
      });
      setIsActive(true);
      loadData();
    } catch (error) {
      console.error('Failed to set sector:', error);
    }
  };

  const handleToggleActive = async () => {
    try {
      await User.updateMyUserData({ marshal_active: !isActive });
      setIsActive(!isActive);
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    }
  };

  const logEntry = async () => {
    if (!sessionData.team_id || !sessionData.event_type) {
      alert('Please select team and event type');
      return;
    }

    try {
      await TrackSession.create({
        ...sessionData,
        session_type: 'entry',
        marshal_id: user.id,
        sector: selectedSector,
        timestamp: new Date().toISOString()
      });
      
      // Reset form
      setSessionData({
        team_id: '',
        event_type: 'practice',
        vehicle_number: '',
        driver_name: '',
        notes: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Failed to log entry:', error);
      alert('Failed to log entry');
    }
  };

  const logExit = async () => {
    if (!sessionData.team_id || !sessionData.event_type) {
      alert('Please select team and event type');
      return;
    }

    try {
      await TrackSession.create({
        ...sessionData,
        session_type: 'exit',
        marshal_id: user.id,
        sector: selectedSector,
        timestamp: new Date().toISOString()
      });
      
      // Reset form
      setSessionData({
        team_id: '',
        event_type: 'practice',
        vehicle_number: '',
        driver_name: '',
        notes: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Failed to log exit:', error);
      alert('Failed to log exit');
    }
  };

  const logIncident = async () => {
    if (!incidentData.team_id || !incidentData.incident_type) {
      alert('Please select team and incident type');
      return;
    }

    try {
      await TrackIncident.create({
        ...incidentData,
        marshal_id: user.id,
        sector: selectedSector,
        timestamp: new Date().toISOString()
      });
      
      // Reset form
      setIncidentData({
        team_id: '',
        event_type: 'practice',
        incident_type: 'DOO',
        description: '',
        severity: 'minor'
      });
      
      loadData();
    } catch (error) {
      console.error('Failed to log incident:', error);
      alert('Failed to log incident');
    }
  };

  const exportCSV = () => {
    // Combine sessions and incidents for export
    const exportData = [
      ...sessions.map(s => ({
        Type: 'Session',
        Team: getTeamName(s.team_id),
        Event: s.event_type,
        Action: s.session_type,
        Time: new Date(s.timestamp).toLocaleString(),
        Sector: s.sector,
        Notes: s.notes || ''
      })),
      ...incidents.map(i => ({
        Type: 'Incident',
        Team: getTeamName(i.team_id),
        Event: i.event_type,
        Action: i.incident_type,
        Time: new Date(i.timestamp).toLocaleString(),
        Sector: i.sector,
        Notes: i.description || ''
      }))
    ];

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `track-marshal-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? `${team.name} (#${team.vehicle_number})` : 'Unknown Team';
  };

  const getEventColor = (eventType) => {
    const event = eventTypes.find(e => e.value === eventType);
    return event ? event.color : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Marshal</h1>
            <p className="text-gray-600 text-sm">Sector: {selectedSector || 'Not assigned'}</p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">
                  {isActive ? 'Active on Track' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={exportCSV}
                  variant="outline"
                  size="sm"
                  disabled={sessions.length === 0 && incidents.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={handleToggleActive}
                  variant={isActive ? 'destructive' : 'default'}
                  size="sm"
                >
                  {isActive ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isActive ? 'Go Inactive' : 'Go Active'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector Assignment */}
      {!selectedSector && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertTitle>Sector Assignment Required</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your assigned sector..." />
                </SelectTrigger>
                <SelectContent>
                  {trackSectors.map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSectorAssignment} disabled={!selectedSector}>
                Confirm Sector Assignment
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {selectedSector && (
        <Tabs defaultValue="entry-exit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entry-exit">Entry/Exit</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="log">Activity Log</TabsTrigger>
          </TabsList>

          {/* Entry/Exit Tab */}
          <TabsContent value="entry-exit" className="space-y-4">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Team Entry/Exit
                </CardTitle>
                <CardDescription>Log when teams enter or exit the track</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Team</Label>
                    <Select 
                      value={sessionData.team_id} 
                      onValueChange={(value) => setSessionData(prev => ({ ...prev, team_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} (#{team.vehicle_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select 
                      value={sessionData.event_type} 
                      onValueChange={(value) => setSessionData(prev => ({ ...prev, event_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map(event => (
                          <SelectItem key={event.value} value={event.value}>{event.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vehicle #</Label>
                      <Input 
                        value={sessionData.vehicle_number}
                        onChange={(e) => setSessionData(prev => ({ ...prev, vehicle_number: e.target.value }))}
                        placeholder="Vehicle number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Driver</Label>
                      <Input 
                        value={sessionData.driver_name}
                        onChange={(e) => setSessionData(prev => ({ ...prev, driver_name: e.target.value }))}
                        placeholder="Driver name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={sessionData.notes}
                      onChange={(e) => setSessionData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Button 
                    onClick={logEntry} 
                    className="h-12 text-lg bg-green-600 hover:bg-green-700"
                    disabled={!sessionData.team_id || !isActive}
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    LOG ENTRY
                  </Button>
                  <Button 
                    onClick={logExit} 
                    className="h-12 text-lg bg-red-600 hover:bg-red-700"
                    disabled={!sessionData.team_id || !isActive}
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    LOG EXIT
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-4">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5" />
                  Report Incident
                </CardTitle>
                <CardDescription>Log DOO (Down or Out) and OOC (Off Course) incidents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Team</Label>
                    <Select 
                      value={incidentData.team_id} 
                      onValueChange={(value) => setIncidentData(prev => ({ ...prev, team_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} (#{team.vehicle_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Event Type</Label>
                      <Select 
                        value={incidentData.event_type} 
                        onValueChange={(value) => setIncidentData(prev => ({ ...prev, event_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.map(event => (
                            <SelectItem key={event.value} value={event.value}>{event.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Incident Type</Label>
                      <Select 
                        value={incidentData.incident_type} 
                        onValueChange={(value) => setIncidentData(prev => ({ ...prev, incident_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DOO">DOO (Down or Out)</SelectItem>
                          <SelectItem value="OOC">OOC (Off Course)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select 
                      value={incidentData.severity} 
                      onValueChange={(value) => setIncidentData(prev => ({ ...prev, severity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="safety">Safety Concern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={incidentData.description}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what happened..."
                      rows={3}
                    />
                  </div>
                </div>

                <Button 
                  onClick={logIncident} 
                  className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
                  disabled={!incidentData.team_id || !isActive}
                >
                  <Flag className="w-5 h-5 mr-2" />
                  REPORT INCIDENT
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="log" className="space-y-4">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>Recent entries, exits, and incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Recent Sessions */}
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {session.session_type === 'entry' ? 
                          <LogIn className="w-4 h-4 text-green-600" /> : 
                          <LogOut className="w-4 h-4 text-red-600" />
                        }
                        <div>
                          <p className="font-medium">{getTeamName(session.team_id)}</p>
                          <p className="text-sm text-gray-600">
                            {session.session_type.toUpperCase()} - {new Date(session.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getEventColor(session.event_type)}>
                        {eventTypes.find(e => e.value === session.event_type)?.label}
                      </Badge>
                    </div>
                  ))}
                  
                  {/* Recent Incidents */}
                  {incidents.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg border-orange-200">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <div>
                          <p className="font-medium">{getTeamName(incident.team_id)}</p>
                          <p className="text-sm text-gray-600">
                            {incident.incident_type} - {new Date(incident.timestamp).toLocaleTimeString()}
                          </p>
                          {incident.description && (
                            <p className="text-xs text-gray-500 mt-1">{incident.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge className={getEventColor(incident.event_type)}>
                          {eventTypes.find(e => e.value === incident.event_type)?.label}
                        </Badge>
                        <Badge variant={incident.severity === 'safety' ? 'destructive' : 'outline'}>
                          {incident.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {sessions.length === 0 && incidents.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No activity recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}