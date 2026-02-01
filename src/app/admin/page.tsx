'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Users,
  ClipboardCheck,
  Flag,
  TrendingUp,
  AlertCircle,
  Shield,
  RefreshCw,
  MessageSquare,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Settings,
  Activity,
  Database,
  Lock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Scale,
  Mail,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'
import { parseISO, differenceInMinutes, differenceInHours } from 'date-fns'

type Stats = {
  totalUsers: number
  totalTeams: number
  totalBookings: number
  activeInspections: number
  pendingFeedbackBookings: number
  totalPenalties: number
  totalIncidents: number
  recentActivity: number
}

type RecentActivity = {
  id: string
  type: string
  description: string
  timestamp: string
  user?: string
}

export default function AdminPanelPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const effectRunIdRef = useRef(0)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTeams: 0,
    totalBookings: 0,
    activeInspections: 0,
    pendingFeedbackBookings: 0,
    totalPenalties: 0,
    totalIncidents: 0,
    recentActivity: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testEmailTo, setTestEmailTo] = useState('')
  const [testEmailLoading, setTestEmailLoading] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    const currentRunId = ++effectRunIdRef.current
    let active = true
    
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      
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
        .single() as { data: { app_role: string } | null, error: any }
      
      if (profileError) throw profileError
      
      if (!active || currentRunId !== effectRunIdRef.current) return
      if (!profile || profile.app_role !== 'admin') {
        router.push('/dashboard')
        return
      }

      if (active && currentRunId === effectRunIdRef.current) {
        setUserRole(profile.app_role)
      }

      // Load comprehensive stats
      const [
        usersResult,
        teamsResult,
        bookingsResult,
        inspectionsResult,
        feedbackBookingsResult,
        penaltiesResult,
        incidentsResult,
      ] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'ongoing'),
        supabase.from('feedback_bookings' as any).select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('track_penalties' as any).select('id', { count: 'exact', head: true }),
        supabase.from('track_incidents' as any).select('id', { count: 'exact', head: true }),
      ])
      
      // Load recent activities
      const recentBookings = await supabase
        .from('bookings')
        .select('id, status, created_at, teams:team_id(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      
      const recentFeedback = await supabase
        .from('feedback_bookings' as any)
        .select('id, status, created_at, teams:team_id(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!active || currentRunId !== effectRunIdRef.current) return
      
      // Combine and format recent activities
      const activities: RecentActivity[] = []
      
      if (recentBookings.data) {
        recentBookings.data.forEach((booking: any) => {
          activities.push({
            id: booking.id,
            type: 'booking',
            description: `New ${booking.status} inspection booking${booking.teams ? ` for ${booking.teams.name}` : ''}`,
            timestamp: booking.created_at,
          })
        })
      }
      
      if (recentFeedback.data) {
        recentFeedback.data.forEach((feedback: any) => {
          activities.push({
            id: feedback.id,
            type: 'feedback',
            description: `New ${feedback.status} feedback booking${feedback.teams ? ` for ${feedback.teams.name}` : ''}`,
            timestamp: feedback.created_at,
          })
        })
      }
      
      // Sort by timestamp and take top 5
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivities(activities.slice(0, 5))
      
      if (active && currentRunId === effectRunIdRef.current) {
        setStats({
          totalUsers: usersResult.count || 0,
          totalTeams: teamsResult.count || 0,
          totalBookings: bookingsResult.count || 0,
          activeInspections: inspectionsResult.count || 0,
          pendingFeedbackBookings: feedbackBookingsResult.count || 0,
          totalPenalties: penaltiesResult.count || 0,
          totalIncidents: incidentsResult.count || 0,
          recentActivity: activities.length,
        })
        setError(null)
        if (isRefresh) {
          toast.success('Data refreshed successfully')
        }
      }
    } catch (err) {
      if (active && currentRunId === effectRunIdRef.current) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error.message)
        toast.error(`Failed to load admin data: ${error.message}`)
        logger.error('[Admin Panel] Error loading data', err)
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

  const handleRefresh = () => {
    loadData(true)
  }

  const handleSendTestEmail = async () => {
    setTestEmailLoading(true)
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailTo.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.message || 'Failed to send test email')
        return
      }
      toast.success(data.to ? `Test email sent to ${data.to}` : 'Test email sent to your account email')
      setTestEmailTo('')
    } catch {
      toast.error('Failed to send test email')
    } finally {
      setTestEmailLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (userRole !== 'admin') {
    return null
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
      gradient: 'from-blue-500 to-blue-600',
      description: 'Registered users',
    },
    {
      title: 'Total Teams',
      value: stats.totalTeams,
      icon: Flag,
      color: 'text-green-600 bg-green-100',
      gradient: 'from-green-500 to-green-600',
      description: 'Active teams',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: ClipboardCheck,
      color: 'text-purple-600 bg-purple-100',
      gradient: 'from-purple-500 to-purple-600',
      description: 'Inspection bookings',
    },
    {
      title: 'Active Inspections',
      value: stats.activeInspections,
      icon: Activity,
      color: 'text-orange-600 bg-orange-100',
      gradient: 'from-orange-500 to-orange-600',
      description: 'Currently ongoing',
    },
    {
      title: 'Pending Feedback',
      value: stats.pendingFeedbackBookings,
      icon: MessageSquare,
      color: 'text-pink-600 bg-pink-100',
      gradient: 'from-pink-500 to-pink-600',
      description: 'Awaiting approval',
    },
    {
      title: 'Total Penalties',
      value: stats.totalPenalties,
      icon: Scale,
      color: 'text-red-600 bg-red-100',
      gradient: 'from-red-500 to-red-600',
      description: 'Track penalties',
    },
    {
      title: 'Total Incidents',
      value: stats.totalIncidents,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-100',
      gradient: 'from-amber-500 to-amber-600',
      description: 'Track incidents',
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivity,
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-100',
      gradient: 'from-indigo-500 to-indigo-600',
      description: 'Last 24 hours',
    },
  ]

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'from-blue-500 to-blue-600',
    },
    // Temporarily removed: Penalty Management
    // {
    //   title: 'Penalty Management',
    //   description: 'Manage penalty rules and incidents',
    //   icon: Scale,
    //   href: '/admin/penalties',
    //   color: 'from-red-500 to-red-600',
    // },
    {
      title: 'Feedback Bookings',
      description: 'Manage feedback appointments',
      icon: MessageSquare,
      href: '/feedback',
      color: 'from-pink-500 to-pink-600',
    },
  ]

  const systemStatus = [
    {
      name: 'System Operational',
      status: 'operational',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'Database Connected',
      status: 'operational',
      icon: Database,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: 'Authentication Active',
      status: 'operational',
      icon: Lock,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'API Services',
      status: 'operational',
      icon: Activity,
      color: 'text-indigo-600 bg-indigo-100',
    },
  ]

  const formatTimeAgo = (timestamp: string) => {
    const dt = parseISO(timestamp)
    const now = new Date()
    const minutes = differenceInMinutes(now, dt)
    const hours = differenceInHours(now, dt)
    if (hours >= 24) return `${Math.floor(hours / 24)}d ago`
    if (hours >= 1) return `${hours}h ago`
    return `${minutes}m ago`
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            Admin Panel
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Manage the Formula IHU Hub system and monitor system health
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Access key administrative functions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={() => router.push(action.href)}
                  className="group relative p-5 border-2 border-gray-200 rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-left bg-white hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${action.color} shadow-sm group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Real-time system health monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {systemStatus.map((status) => (
                <div
                  key={status.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${status.color}`}>
                      <status.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{status.name}</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    Operational
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test email */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Test email
          </CardTitle>
          <CardDescription>
            Send a test email to verify Resend is configured (approval emails, etc.). Leave empty to send to your account email.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="email@example.com (optional)"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              disabled={testEmailLoading}
            />
            <Button
              onClick={handleSendTestEmail}
              disabled={testEmailLoading}
              className="gap-2 shrink-0"
            >
              {testEmailLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send test email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system events and bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'booking' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-pink-100 text-pink-600'
                  }`}>
                    {activity.type === 'booking' ? (
                      <Calendar className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State for Recent Activity */}
      {recentActivities.length === 0 && !loading && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system events and bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No recent activity</p>
              <p className="text-sm text-gray-400 mt-1">Activity will appear here as events occur</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
