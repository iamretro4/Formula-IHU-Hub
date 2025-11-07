'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Edit, Trash2, Plus } from 'lucide-react'
import { Database } from '@/lib/types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  teams?: { name: string; code: string } | null
}

type ProfileRole = {
  app_role: string
}

export default function UserManagementPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

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
          .single() as { data: ProfileRole | null }

        if (!profile || profile.app_role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setUserRole(profile.app_role)

        // Load users
        const { data: usersData, error } = await supabase
          .from('user_profiles')
          .select(`
            *,
            teams:team_id(name, code)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        // Transform teams from array to single object if needed
        const transformedUsers = (usersData as any[])?.map((user: any) => ({
          ...user,
          teams: Array.isArray(user.teams) ? user.teams[0] : user.teams
        })) as UserProfile[] || []
        
        setUsers(transformedUsers)
      } catch (error) {
        console.error('Failed to load users:', error)
        alert('Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, router])

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase()
    return (
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.app_role?.toLowerCase().includes(query)
    )
  })

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'admin') return 'default'
    if (role?.includes('judge')) return 'secondary'
    if (role === 'scrutineer') return 'outline'
    return 'secondary'
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

  if (userRole !== 'admin') {
    return null
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users and their permissions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Team</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getRoleBadgeVariant(user.app_role || '')}>
                        {user.app_role?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {user.teams ? `${user.teams.name} (${user.teams.code})` : 'No team'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.profile_completed ? 'default' : 'secondary'}>
                        {user.profile_completed ? 'Active' : 'Incomplete'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => alert('Edit functionality coming soon')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
