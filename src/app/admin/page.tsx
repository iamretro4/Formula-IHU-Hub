'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, ClipboardCheck, Flag, TrendingUp, AlertCircle } from 'lucide-react'
import { Database } from '@/lib/types/database'

export default function AdminPanelPage() {
  const supabase = useMemo(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])
  const effectRunIdRef = useRef(0)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    totalBookings: 0,
    activeInspections: 0,
  })
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const currentRunId = ++effectRunIdRef.current
    let active = true
    
    const loadData = async () => {
      if (currentRunId !== effectRunIdRef.current) return
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (!user) {
          router.push('/auth/signin')
          return
        }

        // Check user role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('app_role')
          .eq('id', user.id)
          .single() as { data: { app_role: string } | null }
        
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (!profile || profile.app_role !== 'admin') {
          router.push('/dashboard')
          return
        }

        if (active && currentRunId === effectRunIdRef.current) {
          setUserRole(profile.app_role)
        }

        // Load stats
        const [usersResult, teamsResult, bookingsResult, inspectionsResult] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('teams').select('id', { count: 'exact', head: true }),
          supabase.from('bookings').select('id', { count: 'exact', head: true }),
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'ongoing'),
        ])
        
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (active && currentRunId === effectRunIdRef.current) {
          setStats({
            totalUsers: usersResult.count || 0,
            totalTeams: teamsResult.count || 0,
            totalBookings: bookingsResult.count || 0,
            activeInspections: inspectionsResult.count || 0,
          })
        }
      } catch (error) {
        if (active && currentRunId === effectRunIdRef.current) {
          console.error('Failed to load admin data:', error)
        }
      } finally {
        if (active && currentRunId === effectRunIdRef.current) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => { active = false }
  }, [supabase, router])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
    },
    {
      title: 'Total Teams',
      value: stats.totalTeams,
      icon: Flag,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: ClipboardCheck,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Active Inspections',
      value: stats.activeInspections,
      icon: TrendingUp,
      color: 'text-orange-600 bg-orange-100',
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">Manage the Formula IHU Hub system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push('/admin/users')}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">User Management</p>
                  <p className="text-sm text-gray-600">Manage users and permissions</p>
                </div>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">System Reports</p>
                  <p className="text-sm text-gray-600">View system analytics and reports</p>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
            </button>
            <button
              onClick={() => router.push('/admin/penalties')}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Penalty Management</p>
                  <p className="text-sm text-gray-600">Manage penalty rules and incidents</p>
                </div>
                <Flag className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">System Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Database Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Authentication Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

