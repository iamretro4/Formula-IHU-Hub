
import React, { useState, useEffect, useCallback } from 'react';
import { CompetitionResult } from '@/entities/CompetitionResult';
import { Team } from '@/entities/Team';
import { DesignScore } from '@/entities/DesignScore';
import { BusinessPlanScore } from '@/entities/BusinessPlanScore';
import { CostScore } from '@/entities/CostScore';
import { TrackIncident } from '@/entities/TrackIncident';
import { ExternalTimingData } from '@/entities/ExternalTimingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Award, Timer, TrendingUp, RefreshCw, Download, Clock } from 'lucide-react';

export default function ResultsPage({ user }) {
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allResults, allTeams] = await Promise.all([
        CompetitionResult.list('-overall_total'),
        Team.list('name')
      ]);
      
      setResults(allResults);
      setTeams(allTeams);
    } catch (error) {
      console.error('Failed to load results:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateResults = async () => {
    setCalculating(true);
    try {
      // Get all approved scores and timing data
      const [designScores, bpScores, costScores, timingData, incidents] = await Promise.all([
        DesignScore.filter({ approved: true }),
        BusinessPlanScore.filter({ approved: true }),
        CostScore.filter({ approved: true }),
        ExternalTimingData.filter({ status: 'valid' }),
        TrackIncident.list()
      ]);

      // Group data by team
      const teamResults = {};
      
      teams.forEach(team => {
        teamResults[team.id] = {
          team_id: team.id,
          design_score: 0,
          business_plan_score: 0,
          cost_manufacturing_score: 0,
          acceleration_time: null,
          skidpad_time: null,
          autocross_time: null,
          endurance_time: null,
          efficiency_score: 0,
          penalties: 0,
          total_static_points: 0,
          total_dynamic_points: 0,
          overall_total: 0,
          overall_rank: 0,
          last_updated: new Date().toISOString()
        };
      });

      // Calculate static event scores
      designScores.forEach(score => {
        if (teamResults[score.team_id]) {
          teamResults[score.team_id].design_score = score.total_score;
        }
      });

      bpScores.forEach(score => {
        if (teamResults[score.team_id]) {
          teamResults[score.team_id].business_plan_score = score.total_score;
        }
      });

      costScores.forEach(score => {
        if (teamResults[score.team_id]) {
          teamResults[score.team_id].cost_manufacturing_score = score.total_score;
        }
      });

      // Calculate dynamic event times (best times)
      timingData.forEach(data => {
        if (!teamResults[data.team_id]) return;
        
        const currentTime = teamResults[data.team_id][`${data.event_type}_time`];
        if (currentTime === null || data.final_time < currentTime) {
          teamResults[data.team_id][`${data.event_type}_time`] = data.final_time;
        }
      });

      // Calculate penalties from incidents
      const teamPenalties = {};
      incidents.forEach(incident => {
        if (incident.penalty_applied && !teamPenalties[incident.team_id]) {
          teamPenalties[incident.team_id] = 0;
        }
        if (incident.penalty_applied) {
          // Basic penalty calculation (can be enhanced)
          const penalty = incident.incident_type === 'DOO' ? 2 : 0.2;
          teamPenalties[incident.team_id] += penalty;
        }
      });

      // Apply penalties and calculate totals
      Object.keys(teamResults).forEach(teamId => {
        const result = teamResults[teamId];
        
        // Apply penalties
        result.penalties = teamPenalties[teamId] || 0;
        
        // Calculate static points total
        result.total_static_points = result.design_score + result.business_plan_score + result.cost_manufacturing_score;
        
        // Calculate dynamic points (simplified - would need proper Formula Student scoring)
        let dynamicPoints = 0;
        if (result.acceleration_time) dynamicPoints += Math.max(0, 100 - (result.acceleration_time * 10));
        if (result.skidpad_time) dynamicPoints += Math.max(0, 100 - (result.skidpad_time * 5));
        if (result.autocross_time) dynamicPoints += Math.max(0, 150 - (result.autocross_time * 2));
        if (result.endurance_time) dynamicPoints += Math.max(0, 250 - (result.endurance_time * 0.1));
        
        result.total_dynamic_points = Math.max(0, dynamicPoints - result.penalties);
        result.overall_total = result.total_static_points + result.total_dynamic_points;
      });

      // Calculate rankings
      const sortedResults = Object.values(teamResults).sort((a, b) => b.overall_total - a.overall_total);
      sortedResults.forEach((result, index) => {
        result.overall_rank = index + 1;
      });

      // Save or update results
      for (const result of sortedResults) {
        const existing = await CompetitionResult.filter({ team_id: result.team_id });
        if (existing.length > 0) {
          await CompetitionResult.update(existing[0].id, result);
        } else {
          await CompetitionResult.create(result);
        }
      }

      // Reload data
      await loadData();
      
    } catch (error) {
      console.error('Failed to calculate results:', error);
      alert('Failed to calculate results. Please try again.');
    }
    setCalculating(false);
  };

  const exportResults = () => {
    const csvData = results.map((result, index) => {
      const team = teams.find(t => t.id === result.team_id);
      return {
        Rank: result.overall_rank,
        Team: team?.name || 'Unknown',
        'Vehicle Number': team?.vehicle_number || '',
        'Design Score': result.design_score,
        'Business Plan Score': result.business_plan_score,
        'Cost Score': result.cost_manufacturing_score,
        'Static Total': result.total_static_points,
        'Dynamic Total': result.total_dynamic_points,
        'Overall Total': result.overall_total,
        Penalties: result.penalties
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h] || 0}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formula-ihu-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getTeamNumber = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.vehicle_number : 'N/A';
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
          <Trophy className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Competition Results</h1>
            <p className="text-gray-600 mt-1">Live leaderboard and comprehensive results</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={exportResults} variant="outline" disabled={results.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {(user?.app_role === 'admin') && (
            <Button onClick={calculateResults} disabled={calculating}>
              {calculating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overall">Overall Results</TabsTrigger>
          <TabsTrigger value="static">Static Events</TabsTrigger>
          <TabsTrigger value="dynamic">Dynamic Events</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Overall Competition Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Vehicle #</TableHead>
                      <TableHead className="text-right">Static Points</TableHead>
                      <TableHead className="text-right">Dynamic Points</TableHead>
                      <TableHead className="text-right">Penalties</TableHead>
                      <TableHead className="text-right">Total Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id} className={result.overall_rank <= 3 ? 'bg-yellow-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {result.overall_rank === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                            {result.overall_rank === 2 && <Award className="w-4 h-4 text-gray-400" />}
                            {result.overall_rank === 3 && <Award className="w-4 h-4 text-amber-600" />}
                            <span className="font-bold">{result.overall_rank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{getTeamName(result.team_id)}</TableCell>
                        <TableCell>#{getTeamNumber(result.team_id)}</TableCell>
                        <TableCell className="text-right">{result.total_static_points.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{result.total_dynamic_points.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {result.penalties > 0 && (
                            <Badge variant="destructive">-{result.penalties.toFixed(1)}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {result.overall_total.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {results.length === 0 && (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No results calculated yet</p>
                    {user?.app_role === 'admin' && (
                      <p className="text-sm text-gray-400 mt-2">
                        Click "Recalculate" to generate results from current data
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="static" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Design Event Results */}
            <Card>
              <CardHeader>
                <CardTitle>Design Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results
                    .filter(r => r.design_score > 0)
                    .sort((a, b) => b.design_score - a.design_score)
                    .slice(0, 10)
                    .map((result, index) => (
                      <div key={result.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{index + 1}.</span>
                          <span className="text-sm">{getTeamName(result.team_id)}</span>
                        </div>
                        <Badge variant="outline">{result.design_score}/150</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Business Plan Results */}
            <Card>
              <CardHeader>
                <CardTitle>Business Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results
                    .filter(r => r.business_plan_score > 0)
                    .sort((a, b) => b.business_plan_score - a.business_plan_score)
                    .slice(0, 10)
                    .map((result, index) => (
                      <div key={result.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{index + 1}.</span>
                          <span className="text-sm">{getTeamName(result.team_id)}</span>
                        </div>
                        <Badge variant="outline">{result.business_plan_score}/75</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Cost & Manufacturing Results */}
            <Card>
              <CardHeader>
                <CardTitle>Cost & Manufacturing</CardTitle>
              </CardHeader>
 