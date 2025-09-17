import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Team } from '@/entities/Team';
import { CostScore } from '@/entities/CostScore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Calculator } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const scoringFields = [
  { id: 'bom_discussion', label: 'BOM Discussion', max: 50 },
  { id: 'cost_understanding', label: 'Cost Understanding', max: 25 },
  { id: 'real_case', label: 'Real Case Scenario', max: 25 },
];

const initialScoreState = {
  ...scoringFields.reduce((acc, field) => ({ ...acc, [field.id]: 0 }), {}),
  comments: '',
  total_score: 0
};

export default function CostManufacturingPage({ user }) {
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentScore, setCurrentScore] = useState(initialScoreState);
  const [existingScoreId, setExistingScoreId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTeams, allScores] = await Promise.all([Team.list('name'), CostScore.list()]);
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
    const payload = { ...currentScore, team_id: selectedTeam.id, judge_id: user.id };

    try {
      if (existingScoreId) {
        await CostScore.update(existingScoreId, payload);
      } else {
        await CostScore.create(payload);
      }
      fetchData();
      handleSelectTeam(selectedTeam.id);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
    setIsSubmitting(false);
  };
  
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3">
        <Calculator className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cost & Manufacturing Scoring</h1>
          <p className="text-gray-600 mt-1">Submit scores for the Cost & Manufacturing event.</p>
        </div>
      </div>
      
      <Alert>
        <AlertTitle>Work in Progress</AlertTitle>
        <AlertDescription>
          This hub is for scoring only. Document management and finals qualification systems are not yet implemented.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Enter Cost Scores</CardTitle>
          <Select onValueChange={handleSelectTeam}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team to score..." />
            </SelectTrigger>
            <SelectContent>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name} (#{team.vehicle_number})</SelectItem>
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
                  rows={4}
                  placeholder="Provide detailed feedback..."
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-blue-800">Total Score</h3>
                <p className="text-4xl font-bold text-blue-900">{currentScore.total_score} / 100</p>
              </div>
            </>
          )}
        </CardContent>
        {selectedTeam && (
          <CardFooter>
            <Button onClick={handleSaveScore} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {existingScoreId ? 'Update Score' : 'Save Score'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}