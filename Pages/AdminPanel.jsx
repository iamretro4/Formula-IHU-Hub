import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, ClipboardList, Settings, Shield, CheckCircle, XCircle, FileText, Calendar } from 'lucide-react';
import { DesignScore } from '@/entities/DesignScore';
import { BusinessPlanScore } from '@/entities/BusinessPlanScore';
import { CostScore } from '@/entities/CostScore';
import { Document } from '@/entities/Document';
import { Team } from '@/entities/Team';
import { FeedbackAppointment } from '@/entities/FeedbackAppointment';

export default function AdminPanel() {
  const [designScores, setDesignScores] = useState([]);
  const [businessPlanScores, setBusinessPlanScores] = useState([]);
  const [costScores, setCostScores] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        allDesignScores,
        allBPScores,
        allCostScores,
        allDocuments,
        allTeams,
        allAppointments
      ] = await Promise.all([
        DesignScore.list('-created_date'),
        BusinessPlanScore.list('-created_date'),
        CostScore.list('-created_date'),
        Document.filter({ status: 'pending_review' }, '-upload_date'),
        Team.list('name'),
        FeedbackAppointment.list('-created_date')
      ]);

      setDesignScores(allDesignScores);
      setBusinessPlanScores(allBPScores);
      setCostScores(allCostScores);
      setDocuments(allDocuments);
      setTeams(allTeams);
      setAppointments(allAppointments);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
    setLoading(false);
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const approveScore = async (scoreType, scoreId) => {
    try {
      const entity = scoreType === 'design' ? DesignScore : 
                   scoreType === 'business_plan' ? BusinessPlanScore : CostScore;
      await entity.update(scoreId, { approved: true });
      loadData();
    } catch (error) {
      console.error('Failed to approve score:', error);
    }
  };

  const approveDocument = async (docId) => {
    try {
      await Document.update(docId, { 
        status: 'approved',
        review_notes: 'Approved by admin'
      });
      loadData();
    } catch (error) {
      console.error('Failed to approve document:', error);
    }
 