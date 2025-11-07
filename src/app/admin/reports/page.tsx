'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Download, TrendingUp, Calendar, Users, ClipboardCheck } from 'lucide-react'
import { Database } from '@/lib/types/database'

type UserProfile = {
  app_role: string
}

type InspectionResult = {
  status: string
}

export default function SystemReportsPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [reports, setReports] = useState({
    totalBookings: 0,
    completedInspections: 0,
    pendingInspections: 0,
    totalUsers: 0,
    totalTeams: 0,
    passRate: 0,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/signin')
          return
        }

        // Check user role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('app_role')
          .eq('id', user.id)
          .single() as { data: UserProfile | null }

        if (!profile || !['admin', 'scrutineer'].includes(profile.app_role || '')) {
          router.push('/dashboard')
          return
        }

        setUserRole(profile.app_role)

        // Load report data
        const [
          bookingsResult,
          completedResult,
          pendingResult,
          usersResult,
          teamsResult,
          resultsResult,
        ] = await Promise.all([
          supabase.from('bookings').select('id', { count: 'exact', head: true }),
          supabase
            .from('inspection_results')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'passed'),
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'upcoming'),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('teams').select('id', { count: 'exact', head: true }),
          supabase.from('inspection_results').select('status'),
        ])

        const inspectionResults = resultsResult.data as InspectionResult[] | null
        const totalResults = inspectionResults?.length || 0
        const passedResults = inspectionResults?.filter((r) => r.status === 'passed').length || 0
        const passRate = totalResults > 0 ? ((passedResults / totalResults) * 100).toFixed(1) : '0'

        setReports({
          totalBookings: bookingsResult.count || 0,
          completedInspections: completedResult.count || 0,
          pendingInspections: pendingResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalTeams: teamsResult.count || 0,
          passRate: parseFloat(passRate),
        })
      } catch (error) {
        console.error('Failed to load reports:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, router])

  const handleExport = () => {
    alert('Export functionality coming soon')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!['admin', 'scrutineer'].includes(userRole || '')) {
    return null
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
          <p className="text-gray-600 mt-1">View system analytics and performance metrics</p>
        </div>
        <Button onClick={handleExport} className="btn-primary">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{reports.totalBookings}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Inspections</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{reports.completedInspections}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <ClipboardCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Inspections</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{reports.pendingInspections}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{reports.totalUsers}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Teams</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{reports.totalTeams}</p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{reports.passRate}%</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Inspection Statistics</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {reports.completedInspections} completed / {reports.totalBookings} total
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">User Statistics</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {reports.totalUsers} users across {reports.totalTeams} teams
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
