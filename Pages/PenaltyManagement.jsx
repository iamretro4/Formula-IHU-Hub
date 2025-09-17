import React, { useState, useEffect } from 'react';
import { PenaltyRule } from '@/entities/PenaltyRule';
import { TrackIncident } from '@/entities/TrackIncident';
import { ExternalTimingData } from '@/entities/ExternalTimingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Plus, AlertTriangle, Calculator, Clock } from 'lucide-react';

export default function PenaltyManagementPage({ user }) {
  const [penaltyRules, setPenaltyRules] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [timingData, setTimingData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newRule, setNewRule] = useState({
    name: '',
    event_type: 'acceleration',
    incident_type: 'DOO',
    penalty_type: 'time_penalty',
    penalty_value: 2,
    max_penalties: 3,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rules, allIncidents, allTiming] = await Promise.all([
        PenaltyRule.list('event_type'),
        TrackIncident.list('-timestamp'),
        ExternalTimingData.list('-start_time')
      ]);
      
      setPenaltyRules(rules);
      setIncidents(allIncidents);
      setTimingData(allTiming);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const createPenaltyRule = async () => {
    if (!newRule.name || !newRule.penalty_value) return;
    
    try {
      await PenaltyRule.create({
        ...newRule,
        created_by: user.id
      });
      
      setNewRule({
        name: '',
        event_type: 'acceleration',
        incident_type: 'DOO',
        penalty_type: 'time_penalty',
        penalty_value: 2,
        max_penalties: 3,
        description: ''
      });
      
      await loadData();
    } catch (error) {
      console.error('Failed to create penalty rule:', error);
    }
  };

  const toggleRuleActive = async (ruleId, isActive) => {
    try {
      await PenaltyRule.update(ruleId, { is_active: isActive });
      await loadData();
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  const calculatePenalties = async () => {
    try {
      // Apply penalty rules to unprocessed timing data
      const unprocessedRuns = timingData.filter(run => !run.processed && run.status === 'valid');
      
      for (const run of unprocessedRuns) {
        let totalPenalty = 0;
        
        // Find incidents for this run
        const runIncidents = incidents.filter(incident => 
          incident.team_id === run.team_id &&
          incident.event_type === run.event_type &&
          new Date(incident.timestamp) >= new Date(run.start_time) &&
          new Date(incident.timestamp) <= new Date(run.finish_time)
        );
        
        // Apply penalty rules
        for (const incident of runIncidents) {
          const applicableRule = penaltyRules.find(rule =>
            rule.event_type === run.event_type &&
            rule.incident_type === incident.incident_type &&
            rule.is_active
          );
          
          if (applicableRule) {
            switch (applicableRule.penalty_type) {
              case 'time_penalty':
                totalPenalty += applicableRule.penalty_value;
                break;
              case 'percentage':
                totalPenalty += run.raw_time * (applicableRule.penalty_value / 100);
                break;
              case 'disqualification':
                await ExternalTimingData.update(run.id, {
                  status: 'DSQ',
                  final_time: null,
                  processed: true
                });
                continue;
            }
          }
        }
        
        // Update the run with final time
        await ExternalTimingData.update(run.id, {
          final_time: run.raw_time + totalPenalty,
          processed: true
        });
        
        // Mark incidents as having penalty applied
        for (const incident of runIncidents) {
          await TrackIncident.update(incident.id, {
            penalty_applied: true
          });
        }
      }
      
      await loadData();
    } catch (error) {
      console.error('Failed to calculate penalties:', error);
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Penalty Management</h1>
            <p className="text-gray-600 mt-1">Configure penalty rules and apply to runs</p>
          </div>
        </div>
        
        <Button onClick={calculatePenalties}>
          <Calculator className="w-4 h-4 mr-2" />
          Apply Penalties to Runs
        </Button>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Penalty Rules</TabsTrigger>
          <TabsTrigger value="create">Create Rule</TabsTrigger>
          <TabsTrigger value="incidents">Incident Review</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Penalty Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Incident Type</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Max Count</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penaltyRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell className="capitalize">{rule.event_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.incident_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {rule.penalty_type === 'time_penalty' && `+${rule.penalty_value}s`}
                          {rule.penalty_type === 'percentage' && `+${rule.penalty_value}%`}
                          {rule.penalty_type === 'point_deduction' && `-${rule.penalty_value} pts`}
                          {rule.penalty_type === 'disqualification' && 'DSQ'}
                        </TableCell>
                        <TableCell>{rule.max_penalties || 'No limit'}</TableCell>
                        <TableCell>
                          <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {penaltyRules.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No penalty rules configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Penalty Rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({...prev, name: e.target.value}))}
                    placeholder="DOO Penalty - Acceleration"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={newRule.event_type}
                    onValueChange={(value) => setNewRule(prev => ({...prev, event_type: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acceleration">Acceleration</SelectItem>
                      <SelectItem value="skidpad">Skidpad</SelectItem>
                      <SelectItem value="autocross">Autocross</SelectItem>
                      <SelectItem value="endurance">Endurance</SelectItem>
                      <SelectItem value="efficiency">Efficiency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Incident Type</Label>
                  <Select
                    value={newRule.incident_type}
                    onValueChange={(value) => setNewRule(prev => ({...prev, incident_type: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOO">DOO (Down or Out)</SelectItem>
                      <SelectItem value="OOC">OOC (Off Course)</SelectItem>
                      <SelectItem value="cone_hit">Cone Hit</SelectItem>
                      <SelectItem value="off_course">Off Course</SelectItem>
                      <SelectItem value="mechanical_failure">Mechanical Failure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Penalty Type</Label>
                  <Select
                    value={newRule.penalty_type}
                    onValueChange={(value) => setNewRule(prev => ({...prev, penalty_type: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_penalty">Time Penalty (seconds)</SelectItem>
                      <SelectItem value="percentage">Percentage Penalty</SelectItem>
                      <SelectItem value="point_deduction">Point Deduction</SelectItem>
                      <SelectItem value="disqualification">Disqualification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Penalty Value</Label>
                  <Input
                    type="number"
                    value={newRule.penalty_value}
                    onChange={(e) => setNewRule(prev => ({...prev, penalty_value: Number(e.target.value)}))}
                    placeholder="2"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Penalties (before DQ)</Label>
                  <Input
                    type="number"
                    value={newRule.max_penalties}
                    onChange={(e) => setNewRule(prev => ({...prev, max_penalties: Number(e.target.value)}))}
                    placeholder="3"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({...prev, description: e.target.value}))}
                  placeholder="Description of when and how this penalty applies"
                  rows={3}
                />
              </div>
              
              <Button onClick={createPenaltyRule} disabled={!newRule.name || !newRule.penalty_value}>
                <Plus className="w-4 h-4 mr-2" />
                Create Penalty Rule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Penalty Applied</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.slice(0, 50).map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="text-sm">
                          {new Date(incident.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">Team {incident.team_id.substring(0, 8)}</TableCell>
                        <TableCell className="capitalize">{incident.event_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{incident.incident_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              incident.severity === 'safety' ? 'bg-red-100 text-red-800' :
                              incident.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {incident.penalty_applied ? (
                            <Badge className="bg-green-100 text-green-800">Applied</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {incident.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}