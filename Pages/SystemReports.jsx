import React, { useState, useEffect } from 'react';
import { ReportSchedule } from '@/entities/ReportSchedule';
import { AuditLog } from '@/entities/AuditLog';
import { SystemNotification } from '@/entities/SystemNotification';
import { SendEmail } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Send, Calendar, Users, Download, Settings, Clock } from 'lucide-react';

export default function SystemReportsPage({ user }) {
  const [reportSchedules, setReportSchedules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    report_type: 'daily_summary',
    schedule: 'daily',
    recipients: '',
    recipient_roles: [],
    format: 'pdf'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedules, logs] = await Promise.all([
        ReportSchedule.list('-created_date'),
        AuditLog.list('-created_date', 100)
      ]);
      
      setReportSchedules(schedules);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const createSchedule = async () => {
    if (!newSchedule.name || !newSchedule.recipients) return;
    
    try {
      await ReportSchedule.create({
        ...newSchedule,
        recipients: newSchedule.recipients.split(',').map(email => email.trim()),
        created_by: user.id,
        next_generation: calculateNextGeneration(newSchedule.schedule)
      });
      
      setNewSchedule({
        name: '',
        report_type: 'daily_summary',
        schedule: 'daily',
        recipients: '',
        recipient_roles: [],
        format: 'pdf'
      });
      
      await loadData();
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const calculateNextGeneration = (schedule) => {
    const now = new Date();
    switch (schedule) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);
        return tomorrow.toISOString();
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(8, 0, 0, 0);
        return nextWeek.toISOString();
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const generateReportNow = async (schedule) => {
    try {
      // This would integrate with actual report generation
      const reportData = await generateReport(schedule.report_type);
      
      // Send email with report
      await SendEmail({
        to: schedule.recipients.join(','),
        subject: `${schedule.name} - ${new Date().toLocaleDateString()}`,
        body: `Please find attached the ${schedule.report_type} report.\n\nGenerated automatically by Formula IHU Competition System.`
      });
      
      // Update last generated time
      await ReportSchedule.update(schedule.id, {
        last_generated: new Date().toISOString(),
        next_generation: calculateNextGeneration(schedule.schedule)
      });
      
      await loadData();
      
      // Create notification
      await SystemNotification.create({
        recipient_role: 'admin',
        title: 'Report Generated',
        message: `${schedule.name} has been generated and sent to recipients`,
        type: 'success',
        event_type: 'system_alert'
      });
      
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const generateReport = async (reportType) => {
    // This would contain the actual report generation logic
    // For now, return a placeholder
    return {
      reportType,
      generatedAt: new Date().toISOString(),
      data: {}
    };
  };

  const exportAuditLog = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID'].join(','),
      ...auditLogs.map(log => [
        new Date(log.created_date).toISOString(),
        log.user_email || log.user_id,
        log.user_role,
        log.action,
        log.entity_type,
        log.entity_id
      ].map(field => `"${field || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Reports & Audit</h1>
          <p className="text-gray-600 mt-1">Automated reporting and system monitoring</p>
        </div>
      </div>

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedules">Report Schedules</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="create">Create Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportSchedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{schedule.name}</h3>
                      <p className="text-sm text-gray-600">
                        {schedule.report_type.replace('_', ' ').toUpperCase()} • {schedule.schedule}
                      </p>
                      <p className="text-xs text-gray-500">
                        Next: {schedule.next_generation ? new Date(schedule.next_generation).toLocaleString() : 'Not scheduled'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {schedule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => generateReportNow(schedule)}>
                        <Send className="w-4 h-4 mr-1" />
                        Generate Now
                      </Button>
                    </div>
                  </div>
                ))}
                {reportSchedules.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No scheduled reports configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>System Audit Log</CardTitle>
                <Button onClick={exportAuditLog} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.created_date).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{log.user_email || log.user_id}</div>
                            <div className="text-xs text-gray-500">{log.user_role}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.entity_type}
                          {log.entity_id && (
                            <div className="text-xs text-gray-500">ID: {log.entity_id.substring(0, 8)}...</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.additional_data && (
                            <div className="text-xs text-gray-600">
                              {JSON.stringify(log.additional_data).substring(0, 50)}...
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Report Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule(prev => ({...prev, name: e.target.value}))}
                    placeholder="Daily Competition Summary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={newSchedule.report_type}
                    onValueChange={(value) => setNewSchedule(prev => ({...prev, report_type: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_summary">Daily Summary</SelectItem>
                      <SelectItem value="competition_results">Competition Results</SelectItem>
                      <SelectItem value="safety_incidents">Safety Incidents</SelectItem>
                      <SelectItem value="team_progress">Team Progress</SelectItem>
                      <SelectItem value="judge_activity">Judge Activity</SelectItem>
                      <SelectItem value="marshal_logs">Marshal Logs</SelectItem>
                      <SelectItem value="document_status">Document Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select
                    value={newSchedule.schedule}
                    onValueChange={(value) => setNewSchedule(prev => ({...prev, schedule: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="event_end">At Event End</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={newSchedule.format}
                    onValueChange={(value) => setNewSchedule(prev => ({...prev, format: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Recipients (comma-separated emails)</Label>
                <Textarea
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule(prev => ({...prev, recipients: e.target.value}))}
                  placeholder="admin@formulaihu.gr, chief.judge@formulaihu.gr"
                  rows={2}
                />
              </div>
              
              <Button onClick={createSchedule} disabled={!newSchedule.name || !newSchedule.recipients}>
                <Calendar className="w-4 h-4 mr-2" />
                Create Schedule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}