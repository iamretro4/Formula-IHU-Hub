'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Download,
  TrendingUp,
  Calendar,
  Users,
  ClipboardCheck,
  Flag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Activity,
  RefreshCw,
  FileText,
  Shield,
  MessageSquare,
  Scale,
  Zap,
  Target,
  Award,
  AlertCircle,
  UserCheck,
} from 'lucide-react'
import { Database } from '@/lib/types/database'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'
import { DateTime } from 'luxon'

type UserProfile = {
  app_role: string
}

type ReportsData = {
  // Bookings & Inspections
  totalBookings: number
  completedInspections: number
  pendingInspections: number
  ongoingInspections: number
  passedInspections: number
  failedInspections: number
  passRate: number
  
  // Users & Teams
  totalUsers: number
  totalTeams: number
  activeUsers: number
  incompleteProfiles: number
  
  // Track Data
  totalRuns: number
  completedRuns: number
  totalPenalties: number
  totalIncidents: number
  safetyIncidents: number
  
  // Feedback
  totalFeedbackBookings: number
  pendingFeedbackBookings: number
  approvedFeedbackBookings: number
  
  // Judged Events
  totalDesignScores: number
  totalBusinessPlanScores: number
  totalCostScores: number
}

export default function SystemReportsPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const effectRunIdRef = useRef(0)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [reports, setReports] = useState<ReportsData>({
    totalBookings: 0,
    completedInspections: 0,
    pendingInspections: 0,
    ongoingInspections: 0,
    passedInspections: 0,
    failedInspections: 0,
    passRate: 0,
    totalUsers: 0,
    totalTeams: 0,
    activeUsers: 0,
    incompleteProfiles: 0,
    totalRuns: 0,
    completedRuns: 0,
    totalPenalties: 0,
    totalIncidents: 0,
    safetyIncidents: 0,
    totalFeedbackBookings: 0,
    pendingFeedbackBookings: 0,
    approvedFeedbackBookings: 0,
    totalDesignScores: 0,
    totalBusinessPlanScores: 0,
    totalCostScores: 0,
  })

  const loadData = useCallback(async (isRefresh = false) => {
    const currentRunId = ++effectRunIdRef.current
    let active = true
    
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!active || currentRunId !== effectRunIdRef.current) return
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Check user role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('app_role')
        .eq('id', user.id)
        .single() as { data: UserProfile | null; error: any }
      
      if (!active || currentRunId !== effectRunIdRef.current) return
      
      if (profileError) {
        logger.error('Failed to load user profile', profileError, { context: 'system_reports' })
        toast.error('Failed to load your profile')
        router.push('/dashboard')
        return
      }
      
      if (!profile || !['admin', 'scrutineer'].includes(profile.app_role || '')) {
        router.push('/dashboard')
        return
      }

      if (active && currentRunId === effectRunIdRef.current) {
        setUserRole(profile.app_role)
      }

      // Load comprehensive report data
      const [
        bookingsResult,
        completedBookingsResult,
        pendingBookingsResult,
        ongoingBookingsResult,
        passedResultsResult,
        failedResultsResult,
        allResultsResult,
        usersResult,
        activeUsersResult,
        teamsResult,
        runsResult,
        completedRunsResult,
        penaltiesResult,
        incidentsResult,
        safetyIncidentsResult,
        feedbackBookingsResult,
        pendingFeedbackResult,
        approvedFeedbackResult,
        designScoresResult,
        businessPlanScoresResult,
        costScoresResult,
      ] = await Promise.all([
        // Bookings & Inspections
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'upcoming'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'ongoing'),
        supabase.from('inspection_results').select('id', { count: 'exact', head: true }).eq('status', 'passed'),
        supabase.from('inspection_results').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        supabase.from('inspection_results').select('status'),
        
        // Users & Teams
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('profile_completed', true),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        
        // Track Data
        supabase.from('dynamic_event_runs' as any).select('id', { count: 'exact', head: true }),
        supabase.from('dynamic_event_runs' as any).select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('track_penalties' as any).select('id', { count: 'exact', head: true }),
        supabase.from('track_incidents' as any).select('id', { count: 'exact', head: true }),
        supabase.from('track_incidents' as any).select('id', { count: 'exact', head: true }).eq('incident_type', 'safety_concern'),
        
        // Feedback
        supabase.from('feedback_bookings' as any).select('id', { count: 'exact', head: true }),
        supabase.from('feedback_bookings' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('feedback_bookings' as any).select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        
        // Judged Events
        supabase.from('judged_event_scores' as any).select('id', { count: 'exact', head: true }).eq('event_type', 'engineering_design'),
        supabase.from('judged_event_scores' as any).select('id', { count: 'exact', head: true }).eq('event_type', 'business_plan'),
        supabase.from('judged_event_scores' as any).select('id', { count: 'exact', head: true }).eq('event_type', 'cost_manufacturing'),
      ])
      
      if (!active || currentRunId !== effectRunIdRef.current) return
      
      // Calculate pass rate
      const allResults = allResultsResult.data as any[] | null
      const totalResults = allResults?.length || 0
      const passedResults = allResults?.filter((r: any) => r.status === 'passed').length || 0
      const passRate = totalResults > 0 ? ((passedResults / totalResults) * 100) : 0

      // Calculate incomplete profiles
      const totalUsers = usersResult.count || 0
      const activeUsers = activeUsersResult.count || 0
      const incompleteProfiles = totalUsers - activeUsers

      if (active && currentRunId === effectRunIdRef.current) {
        setReports({
          totalBookings: bookingsResult.count || 0,
          completedInspections: completedBookingsResult.count || 0,
          pendingInspections: pendingBookingsResult.count || 0,
          ongoingInspections: ongoingBookingsResult.count || 0,
          passedInspections: passedResultsResult.count || 0,
          failedInspections: failedResultsResult.count || 0,
          passRate: parseFloat(passRate.toFixed(1)),
          totalUsers: totalUsers,
          totalTeams: teamsResult.count || 0,
          activeUsers: activeUsers,
          incompleteProfiles: incompleteProfiles,
          totalRuns: runsResult.count || 0,
          completedRuns: completedRunsResult.count || 0,
          totalPenalties: penaltiesResult.count || 0,
          totalIncidents: incidentsResult.count || 0,
          safetyIncidents: safetyIncidentsResult.count || 0,
          totalFeedbackBookings: feedbackBookingsResult.count || 0,
          pendingFeedbackBookings: pendingFeedbackResult.count || 0,
          approvedFeedbackBookings: approvedFeedbackResult.count || 0,
          totalDesignScores: designScoresResult.count || 0,
          totalBusinessPlanScores: businessPlanScoresResult.count || 0,
          totalCostScores: costScoresResult.count || 0,
        })
        
        if (isRefresh) {
          toast.success('Reports refreshed successfully')
        }
      }
    } catch (error) {
      if (active && currentRunId === effectRunIdRef.current) {
        logger.error('Failed to load reports', error, { context: 'system_reports' })
        toast.error('Failed to load reports')
      }
    } finally {
      if (active && currentRunId === effectRunIdRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [supabase, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = () => {
    // Create a simple CSV export
    const csvData = [
      ['Metric', 'Value'],
      ['Total Bookings', reports.totalBookings],
      ['Completed Inspections', reports.completedInspections],
      ['Pending Inspections', reports.pendingInspections],
      ['Ongoing Inspections', reports.ongoingInspections],
      ['Passed Inspections', reports.passedInspections],
      ['Failed Inspections', reports.failedInspections],
      ['Pass Rate (%)', reports.passRate],
      ['Total Users', reports.totalUsers],
      ['Active Users', reports.activeUsers],
      ['Incomplete Profiles', reports.incompleteProfiles],
      ['Total Teams', reports.totalTeams],
      ['Total Runs', reports.totalRuns],
      ['Completed Runs', reports.completedRuns],
      ['Total Penalties', reports.totalPenalties],
      ['Total Incidents', reports.totalIncidents],
      ['Safety Incidents', reports.safetyIncidents],
      ['Total Feedback Bookings', reports.totalFeedbackBookings],
      ['Pending Feedback', reports.pendingFeedbackBookings],
      ['Approved Feedback', reports.approvedFeedbackBookings],
      ['Design Scores', reports.totalDesignScores],
      ['Business Plan Scores', reports.totalBusinessPlanScores],
      ['Cost Scores', reports.totalCostScores],
    ]

    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `system-report-${DateTime.now().toFormat('yyyy-MM-dd-HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Report exported successfully')
  }

  const statCards = [
    {
      title: 'Total Bookings',
      value: reports.totalBookings,
      icon: Calendar,
      gradient: 'from-blue-500 to-blue-600',
      description: 'All inspection bookings',
    },
    {
      title: 'Completed Inspections',
      value: reports.completedInspections,
      icon: CheckCircle2,
      gradient: 'from-green-500 to-green-600',
      description: 'Finished inspections',
    },
    {
      title: 'Pending Inspections',
      value: reports.pendingInspections,
      icon: Clock,
      gradient: 'from-orange-500 to-orange-600',
      description: 'Scheduled inspections',
    },
    {
      title: 'Ongoing Inspections',
      value: reports.ongoingInspections,
      icon: Activity,
      gradient: 'from-purple-500 to-purple-600',
      description: 'Currently in progress',
    },
    {
      title: 'Pass Rate',
      value: `${reports.passRate}%`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-emerald-600',
      description: 'Inspection success rate',
    },
    {
      title: 'Total Users',
      value: reports.totalUsers,
      icon: Users,
      gradient: 'from-indigo-500 to-indigo-600',
      description: 'Registered users',
    },
    {
      title: 'Total Teams',
      value: reports.totalTeams,
      icon: Flag,
      gradient: 'from-pink-500 to-pink-600',
      description: 'Active teams',
    },
    {
      title: 'Total Runs',
      value: reports.totalRuns,
      icon: Zap,
      gradient: 'from-yellow-500 to-yellow-600',
      description: 'Track runs recorded',
    },
    {
      title: 'Total Penalties',
      value: reports.totalPenalties,
      icon: Scale,
      gradient: 'from-red-500 to-red-600',
      description: 'Track penalties',
    },
    {
      title: 'Total Incidents',
      value: reports.totalIncidents,
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-amber-600',
      description: 'Track incidents',
    },
    {
      title: 'Feedback Bookings',
      value: reports.totalFeedbackBookings,
      icon: MessageSquare,
      gradient: 'from-cyan-500 to-cyan-600',
      description: 'Total feedback sessions',
    },
    {
      title: 'Judged Event Scores',
      value: reports.totalDesignScores + reports.totalBusinessPlanScores + reports.totalCostScores,
      icon: Award,
      gradient: 'from-violet-500 to-violet-600',
      description: 'All judged events',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading system reports...</p>
        </div>
      </div>
    )
  }

  if (!['admin', 'scrutineer'].includes(userRole || '')) {
    return null
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            System Reports
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Comprehensive analytics and performance metrics for the Formula IHU Hub system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="inspections" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="inspections" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Inspections
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users & Teams
          </TabsTrigger>
          <TabsTrigger value="track" className="gap-2">
            <Zap className="w-4 h-4" />
            Track Events
          </TabsTrigger>
          <TabsTrigger value="judged" className="gap-2">
            <Award className="w-4 h-4" />
            Judged Events
          </TabsTrigger>
        </TabsList>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Inspection Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Total Bookings</span>
                    <Badge variant="outline" className="text-base font-semibold">
                      {reports.totalBookings}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      {reports.completedInspections}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Pending</span>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                      {reports.pendingInspections}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Ongoing</span>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                      {reports.ongoingInspections}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Inspection Results
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Passed</span>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                      {reports.passedInspections}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Failed</span>
                    <Badge className="bg-red-100 text-red-700 border-red-300">
                      <XCircle className="w-3 h-3 mr-1 inline" />
                      {reports.failedInspections}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Pass Rate</span>
                      <span className="text-2xl font-bold text-emerald-700">
                        {reports.passRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(reports.passRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users & Teams Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Total Users</span>
                    <Badge variant="outline" className="text-base font-semibold">
                      {reports.totalUsers}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Active Users</span>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <UserCheck className="w-3 h-3 mr-1 inline" />
                      {reports.activeUsers}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Incomplete Profiles</span>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                      {reports.incompleteProfiles}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                      <span className="text-2xl font-bold text-indigo-700">
                        {reports.totalUsers > 0 
                          ? `${((reports.activeUsers / reports.totalUsers) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${reports.totalUsers > 0 
                            ? Math.min((reports.activeUsers / reports.totalUsers) * 100, 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  Team Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Total Teams</span>
                    <Badge variant="outline" className="text-base font-semibold">
                      {reports.totalTeams}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-2">Average Users per Team</p>
                      <p className="text-3xl font-bold text-pink-700">
                        {reports.totalTeams > 0 
                          ? (reports.totalUsers / reports.totalTeams).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Track Events Tab */}
        <TabsContent value="track" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Track Runs
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Total Runs</span>
                    <Badge variant="outline" className="text-base font-semibold">
                      {reports.totalRuns}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Completed Runs</span>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      {reports.completedRuns}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                      <span className="text-2xl font-bold text-yellow-700">
                        {reports.totalRuns > 0 
                          ? `${((reports.completedRuns / reports.totalRuns) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${reports.totalRuns > 0 
                            ? Math.min((reports.completedRuns / reports.totalRuns) * 100, 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Penalties & Incidents
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Total Penalties</span>
                    <Badge className="bg-red-100 text-red-700 border-red-300">
                      <Scale className="w-3 h-3 mr-1 inline" />
                      {reports.totalPenalties}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Total Incidents</span>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                      <AlertCircle className="w-3 h-3 mr-1 inline" />
                      {reports.totalIncidents}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Safety Incidents</span>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                      <Shield className="w-3 h-3 mr-1 inline" />
                      {reports.safetyIncidents}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Judged Events Tab */}
        <TabsContent value="judged" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Engineering Design
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-indigo-700 mb-2">
                    {reports.totalDesignScores}
                  </p>
                  <p className="text-sm text-gray-600">Scores Recorded</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Business Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-pink-700 mb-2">
                    {reports.totalBusinessPlanScores}
                  </p>
                  <p className="text-sm text-gray-600">Scores Recorded</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Cost & Manufacturing
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-700 mb-2">
                    {reports.totalCostScores}
                  </p>
                  <p className="text-sm text-gray-600">Scores Recorded</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Total Judged Event Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-violet-700 mb-2">
                  {reports.totalDesignScores + reports.totalBusinessPlanScores + reports.totalCostScores}
                </p>
                <p className="text-sm text-gray-600">Combined scores across all judged events</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
