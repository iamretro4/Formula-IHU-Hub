import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Team } from '@/entities/Team';
import { DesignScore } from '@/entities/DesignScore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Award, Edit, CheckSquare, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const scoringFields = [
  { id: 'overall_vehicle_concept', label: 'Overall Vehicle Concept', max: 20 },
  { id: 'software', label: 'Software', max: 10 },
  { id: 'vehicle_performance', label: 'Vehicle Performance', max: 30 },
  { id: 'mechanical_structural', label: 'Mechanical/Structural', max: 15 },
  { id: 'tractive_system', label: 'Tractive System/Powertrain', max: 25 },
  { id: 'lv_electronics', label: 'LV-Electrics/Electronics', max: 10 },
  { id: 'autonomous_functionality', label: 'Autonomous Functionality', max: 20 },
  { id: 'driver_interface', label: 'Driver Interface', max: 10 },
  { id: 'engineering_design_report', label: 'Engineering Design Report', max: 10 },
];

const initialScoreState = {
  ...scoringFields.reduce((acc, field) => ({ ...acc, [field.id]: 0 }), {}),
  comments: '',
  total_score: 0
};

export default function DesignEventPage({ user }) {
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentScore, setCurrentScore] = useState(initialScoreState);
  const [existingScoreId, setExistingScoreId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.app_role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTeams, allScores] = await Promise.all([Team.list('name'), DesignScore.list()]);
      setTeams(allTeams);
      setScores(allScores);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const total = scoringFields.reduce((sum, field) => sum + (Number(currentScore[field.id]) || 0), 0);
    setCurrentScore(prev => ({ ...prev, total_score: total }));
  }, [currentScore]);

  const handleSelectTeam = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    setSelectedTeam(team);

    // Find if a score already exists for this judge and team
    const existing = scores.find(s => s.team_id === teamId && s.judge_id === user.id);
    if (existing) {
      setCurrentScore({
        ...initialScoreState,
        ...scoringFields.reduce((acc, field) => ({...acc, [field.id]: existing[field.id] || 0}), {}),
        comments: existing.comments || '',
        total_score: existing.total_score || 0
      });
      setExistingScoreId(existing.id);
    } else {
      setCurrentScore(initialScoreState);
      setExistingScoreId(null);
    }
  };

  const handleInputChange = (field, value) => {
    const numValue = Number(value);
    const max = scoringFields.find(f => f.id === field)?.max;
    if (numValue > max) {
        alert(`Value cannot exceed max of ${max}`);
        return;
    }
    setCurrentScore(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSaveScore = async () => {
    if (!selectedTeam) return;
    setIsSubmitting(true);
    const payload = {
      ...currentScore,
      team_id: selectedTeam.id,
      judge_id: user.id
    };

    try {
      if (existingScoreId) {
        await DesignScore.update(existingScoreId, payload);
      } else {
        await DesignScore.create(payload);
      }
      fetchData(); // Refresh scores
      handleSelectTeam(selectedTeam.id); // Reselect team to show updated data
    } catch (error) {
      console.error('Failed to save score:', error);
    }
    setIsSubmitting(false);
  };
  
  const handleApproveScore = async (scoreId) => {
    try {
      await DesignScore.update(scoreId, { approved: true });
      fetchData();
    } catch (error) {
      console.error('Failed to approve score:', error);
    }
  };

  const getJudgeName = (judgeId) => (judgeId === user.id ? `${user.full_name} (You)` : `Judge ${judgeId.substring(0, 4)}`);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3">
        <Award className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Design Event Scoring</h1>
          <p className="text-gray-600 mt-1">Submit and review Design Event scores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Enter Scores</CardTitle>
            <Select onValueChange={handleSelectTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team to score..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} (#{team.vehicle_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedTeam ? (
              <p className="text-center text-gray-500 py-10">Please select a team to begin scoring.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scoringFields.map(field => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>{field.label} (/{field.max})</Label>
                      <Input
                        id={field.id}
                        type="number"
                        min="0"
                        max={field.max}
                        value={currentScore[field.id]}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Comments</Label>
                  <Textarea
                    value={currentScore.comments}
                    onChange={(e) => setCurrentScore(prev => ({ ...prev, comments: e.target.value }))}
 