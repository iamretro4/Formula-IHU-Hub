'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import getSupabaseClient, { refreshSupabaseSession } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Search,
  Save,
  X,
  Users,
  Shield,
  Filter,
  RefreshCw,
  UserCheck,
  UserX,
  Mail,
  Building2,
  Calendar,
  AlertCircle,
  Edit2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  MoreVertical,
} from 'lucide-react'
import { Database } from '@/lib/types/database'
import { logger } from '@/lib/utils/logger'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DateTime } from 'luxon'

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  teams?: { name: string; code: string } | null
}

type ProfileRole = {
  app_role: string
  team_id: string | null
}

type Team = {
  id: string
  name: string
  code: string
}

// All available roles
const ALL_ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'scrutineer', label: 'Scrutineer', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'team_leader', label: 'Team Leader', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'inspection_responsible', label: 'Inspection Responsible', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'team_member', label: 'Team Member', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'design_judge_software', label: 'Design Judge (Software)', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'design_judge_mechanical', label: 'Design Judge (Mechanical)', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'design_judge_electronics', label: 'Design Judge (Electronics)', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'design_judge_overall', label: 'Design Judge (Overall)', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'bp_judge', label: 'Business Plan Judge', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'cm_judge', label: 'Cost Manufacturing Judge', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'track_marshal', label: 'Track Marshal', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'viewer', label: 'Viewer', color: 'bg-slate-100 text-slate-700 border-slate-300' },
] as const

// Roles that team leaders can assign
const TEAM_LEADER_ASSIGNABLE_ROLES = [
  { value: 'team_leader', label: 'Team Leader', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'inspection_responsible', label: 'Inspection Responsible', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'team_member', label: 'Team Member', color: 'bg-gray-100 text-gray-700 border-gray-300' },
] as const

type SortOption = 'name' | 'email' | 'role' | 'team' | 'created_at'
type SortDirection = 'asc' | 'desc'

export default function UserManagementPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const { profile: authProfile, user: currentUser } = useAuth()
  const effectRunIdRef = useRef(0)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [approvalFilter, setApprovalFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userTeamId, setUserTeamId] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<string>('')
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)

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

      // Check user role and team
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('app_role, team_id')
        .eq('id', user.id)
        .single() as { data: ProfileRole | null; error: any }
      
      if (!active || currentRunId !== effectRunIdRef.current) return
      
      if (profileError) {
        logger.error('Failed to load user profile', profileError, { context: 'user_management' })
        toast.error('Failed to load your profile')
        router.push('/dashboard')
        return
      }
      
      if (!profile) {
        router.push('/dashboard')
        return
      }

      // Only allow admin or team_leader
      if (profile.app_role !== 'admin' && profile.app_role !== 'team_leader') {
        router.push('/dashboard')
        return
      }

      if (active && currentRunId === effectRunIdRef.current) {
        setUserRole(profile.app_role)
        setUserTeamId(profile.team_id)
      }

      // Load teams (for admins)
      if (profile.app_role === 'admin') {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, code')
          .order('code')
        
        if (!teamsError && teamsData) {
          setTeams(teamsData as Team[])
        }
      }

      // Load users based on role (include login_approved for admin approval UI)
      let usersQuery = supabase
        .from('user_profiles')
        .select(`
          *,
          teams:team_id(name, code)
        `)

      // Team leaders can only see their team members
      if (profile.app_role === 'team_leader' && profile.team_id) {
        usersQuery = usersQuery.eq('team_id', profile.team_id)
      }

      const { data: usersData, error } = await usersQuery
        .order('created_at', { ascending: false })
      
      if (!active || currentRunId !== effectRunIdRef.current) return
      if (error) {
        logger.error('Failed to load users', error, { context: 'user_management' })
        throw error
      }
      
      // Transform teams from array to single object if needed
      const transformedUsers = (usersData as any[])?.map((user: any) => ({
        ...user,
        teams: Array.isArray(user.teams) ? user.teams[0] : user.teams
      })) as UserProfile[] || []
      
      if (active && currentRunId === effectRunIdRef.current) {
        setUsers(transformedUsers)
        if (isRefresh) {
          toast.success('Users refreshed successfully')
        }
      }
    } catch (error) {
      if (active && currentRunId === effectRunIdRef.current) {
        logger.error('Failed to load users', error, { context: 'user_management' })
        toast.error('Failed to load users')
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

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.app_role?.toLowerCase().includes(query) ||
        user.teams?.name?.toLowerCase().includes(query) ||
        user.teams?.code?.toLowerCase().includes(query)
      
      const matchesRole = roleFilter === 'all' || user.app_role === roleFilter
      const matchesTeam = teamFilter === 'all' || user.team_id === teamFilter
      const matchesApproval =
        approvalFilter === 'all' ||
        (approvalFilter === 'pending' && (user as UserProfile).login_approved === false) ||
        (approvalFilter === 'approved' && (user as UserProfile).login_approved !== false)

      return matchesSearch && matchesRole && matchesTeam && matchesApproval
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
          bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
          break
        case 'email':
          aValue = a.email?.toLowerCase() || ''
          bValue = b.email?.toLowerCase() || ''
          break
        case 'role':
          aValue = a.app_role || ''
          bValue = b.app_role || ''
          break
        case 'team':
          aValue = a.teams?.name || ''
          bValue = b.teams?.name || ''
          break
        case 'created_at':
          aValue = a.created_at || ''
          bValue = b.created_at || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [users, searchQuery, roleFilter, teamFilter, approvalFilter, sortBy, sortDirection])

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.profile_completed).length
    const incomplete = total - active
    const pendingApproval = users.filter(u => !(u as UserProfile).login_approved).length
    const byRole = users.reduce((acc, u) => {
      const role = u.app_role || 'unknown'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, active, incomplete, pendingApproval, byRole }
  }, [users])

  const getRoleInfo = (role: string) => {
    return ALL_ROLES.find(r => r.value === role) || { label: role, color: 'bg-gray-100 text-gray-700 border-gray-300' }
  }

  const getInitials = (user: UserProfile) => {
    const first = user.first_name?.charAt(0) || ''
    const last = user.last_name?.charAt(0) || ''
    return `${first}${last}`.toUpperCase() || 'U'
  }

  const formatRoleName = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleEditRole = (user: UserProfile) => {
    setEditingUserId(user.id)
    setEditingRole(user.app_role || '')
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setEditingRole('')
  }

  const handleSaveRole = async (userId: string) => {
    if (!editingRole || editingRole === '') {
      toast.error('Please select a role')
      return
    }

    // Validate: team leaders cannot assign admin role
    if (userRole === 'team_leader' && editingRole === 'admin') {
      toast.error('Team leaders cannot assign admin role')
      return
    }

    // Validate: team leaders can only assign specific roles
    if (userRole === 'team_leader') {
      const allowedRoles = TEAM_LEADER_ASSIGNABLE_ROLES.map(r => r.value)
      if (!allowedRoles.includes(editingRole as any)) {
        toast.error('Team leaders can only assign: Team Leader, Inspection Responsible, or Team Member')
        return
      }
    }

    setSaving(userId)
    try {
      const sessionValid = await refreshSupabaseSession()
      if (!sessionValid) {
        logger.error('Session refresh failed', { context: 'user_management' })
        toast.error('Session expired. Please refresh the page and try again.')
        setSaving(null)
        return
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        logger.error('Failed to get user', userError, { context: 'user_management' })
        toast.error('Authentication error. Please refresh the page and try again.')
        setSaving(null)
        return
      }

      logger.debug('Updating user role', { 
        userId,
        newRole: editingRole,
        currentUser: user.id,
        context: 'user_management'
      })

      const updatePromise = supabase
        .from('user_profiles')
        .update({ app_role: editingRole as any })
        .eq('id', userId)
        .select()
        .single()

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 10000)
      )

      const { data: updatedData, error } = await Promise.race([
        updatePromise,
        timeoutPromise
      ]) as { data: any; error: any }

      if (error) {
        logger.error('Failed to update user role', error, { 
          context: 'user_management',
          userId,
          newRole: editingRole,
          errorCode: error.code,
          errorMessage: error.message
        })
        
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token')) {
          toast.error('Session expired. Please refresh the page and sign in again.')
        } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('RLS')) {
          toast.error('Permission denied. You may not have permission to update this user\'s role.')
        } else {
          toast.error(`Failed to update role: ${error.message || 'Unknown error'}`)
        }
        throw error
      }

      if (!updatedData) {
        logger.error('Update returned no data', { userId, newRole: editingRole, context: 'user_management' })
        toast.error('Update failed: No data returned')
        throw new Error('Update returned no data')
      }

      logger.debug('User role updated successfully', { 
        userId,
        newRole: editingRole,
        updatedData,
        context: 'user_management'
      })

      setUsers(users.map(u => 
        u.id === userId ? { ...u, app_role: editingRole as any } : u
      ))

      toast.success('Role updated successfully')
      setEditingUserId(null)
      setEditingRole('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role'
      logger.error('Role update failed', error, { context: 'user_management' })
      
      if (!errorMessage.includes('timeout') && !errorMessage.includes('expired') && !errorMessage.includes('Permission')) {
        if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
          toast.error('Permission denied. You may not have permission to update this user\'s role.')
        } else {
          toast.error(`Failed to update role: ${errorMessage}`)
        }
      }
    } finally {
      setSaving(null)
    }
  }

  const getAvailableRoles = () => {
    if (userRole === 'admin') {
      return ALL_ROLES
    } else if (userRole === 'team_leader') {
      return TEAM_LEADER_ASSIGNABLE_ROLES
    }
    return []
  }

  const handleApproveUser = async (userId: string, approveAsTeamLeader: boolean) => {
    if (userRole !== 'admin') return
    setApprovingUserId(userId)
    try {
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          loginApproved: true,
          approveAsTeamLeader,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.message || 'Failed to approve user')
        return
      }
      toast.success(approveAsTeamLeader ? 'User approved as team leader' : 'User approved')
      if (data.email_sent === false && data.email_error) {
        toast.error(`Approval email could not be sent: ${data.email_error}. Set RESEND_API_KEY in Vercel for notification emails.`, { duration: 6000 })
      } else if (data.email_sent === false) {
        toast.error('Approval email could not be sent. Set RESEND_API_KEY in Vercel (Settings → Environment Variables) for notification emails.', { duration: 5000 })
      }
      await loadData(true)
    } catch (e) {
      toast.error('Failed to approve user')
    } finally {
      setApprovingUserId(null)
    }
  }

  const handleRejectUser = async (userId: string) => {
    if (userRole !== 'admin') return
    setApprovingUserId(userId)
    try {
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, loginApproved: false }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.message || 'Failed to update user')
        return
      }
      toast.success('Login request rejected')
      await loadData(true)
    } catch (e) {
      toast.error('Failed to update user')
    } finally {
      setApprovingUserId(null)
    }
  }

  const handleSort = (column: SortOption) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortOption }) => {
    if (sortBy !== column) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    )
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_MED)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    )
  }

  if (userRole !== 'admin' && userRole !== 'team_leader') {
    return null
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            User Management
          </h1>
          <p className="text-gray-600 max-w-2xl">
            {userRole === 'admin' 
              ? 'Manage all users and their permissions across the system' 
              : 'Manage your team members and their roles'}
          </p>
        </div>
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Incomplete Profiles</p>
                <p className="text-3xl font-bold text-orange-600">{stats.incomplete}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
                <UserX className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        {userRole === 'admin' && (
          <Card className="shadow-md border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Approval</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.pendingApproval}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Filtered Results</p>
                <p className="text-3xl font-bold text-purple-600">{filteredAndSortedUsers.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm">
                <Filter className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {userRole === 'admin' && (
              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Login status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            )}
            {userRole === 'admin' && (
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={`${sortBy}-${sortDirection}`} onValueChange={(value) => {
              const [col, dir] = value.split('-')
              setSortBy(col as SortOption)
              setSortDirection(dir as SortDirection)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                <SelectItem value="email-desc">Email (Z-A)</SelectItem>
                <SelectItem value="role-asc">Role (A-Z)</SelectItem>
                <SelectItem value="role-desc">Role (Z-A)</SelectItem>
                {userRole === 'admin' && (
                  <>
                    <SelectItem value="team-asc">Team (A-Z)</SelectItem>
                    <SelectItem value="team-desc">Team (Z-A)</SelectItem>
                  </>
                )}
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {userRole === 'admin' ? 'All Users' : 'Team Members'} ({filteredAndSortedUsers.length})
              </CardTitle>
              <CardDescription className="mt-1">
                {filteredAndSortedUsers.length === 0 
                  ? 'No users match your filters'
                  : `Showing ${filteredAndSortedUsers.length} of ${users.length} users`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredAndSortedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium text-lg mb-2">No users found</p>
              <p className="text-sm text-gray-400">
                {searchQuery || roleFilter !== 'all' || teamFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'No users available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        User
                        <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <button
                        onClick={() => handleSort('email')}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Email
                        <SortIcon column="email" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      <button
                        onClick={() => handleSort('role')}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Role
                        <SortIcon column="role" />
                      </button>
                    </th>
                    {userRole === 'admin' && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        <button
                          onClick={() => handleSort('team')}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          Team
                          <SortIcon column="team" />
                        </button>
                      </th>
                    )}
                    {userRole === 'admin' && (
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Login</th>
                    )}
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedUsers.map((user) => {
                    const roleInfo = getRoleInfo(user.app_role || '')
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                              {getInitials(user)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Joined {formatDate(user.created_at)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {editingUserId === user.id ? (
                            <div className="flex items-center space-x-2">
                              <Select
                                value={editingRole}
                                onValueChange={setEditingRole}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableRoles().map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <Badge className={`${roleInfo.color} border font-medium`}>
                              {roleInfo.label}
                            </Badge>
                          )}
                        </td>
                        {userRole === 'admin' && (
                          <td className="py-4 px-4">
                            {user.teams ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {user.teams.name}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {user.teams.code}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No team</span>
                            )}
                          </td>
                        )}
                        {userRole === 'admin' && (
                          <td className="py-4 px-4">
                            {user.login_approved !== false ? (
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                                Pending
                              </Badge>
                            )}
                          </td>
                        )}
                        <td className="py-4 px-4">
                          {user.profile_completed ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                              <XCircle className="w-3 h-3 mr-1 inline" />
                              Incomplete
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {userRole === 'admin' && user.login_approved === false && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveUser(user.id, !!(user as UserProfile).team_lead)}
                                  disabled={approvingUserId === user.id}
                                  className="gap-1 bg-green-600 hover:bg-green-700"
                                >
                                  {approvingUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4" />
                                      {(user as UserProfile).team_lead ? 'Approve as leader' : 'Approve'}
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectUser(user.id)}
                                  disabled={approvingUserId === user.id}
                                  className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                                >
                                  {approvingUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                            {userRole === 'admin' && user.login_approved !== false && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectUser(user.id)}
                                disabled={approvingUserId === user.id}
                                className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                              >
                                {approvingUserId === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserX className="w-4 h-4" />
                                    Revoke
                                  </>
                                )}
                              </Button>
                            )}
                            {editingUserId === user.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveRole(user.id)}
                                  disabled={saving === user.id}
                                  className="gap-1"
                                >
                                  {saving === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Save className="w-4 h-4" />
                                      Save
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  disabled={saving === user.id}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRole(user)}
                                  disabled={user.id === currentUser?.id && userRole === 'team_leader'}
                                  className="gap-1"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </Button>
                                <Dialog open={userDetailsOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                                  if (!open) {
                                    setUserDetailsOpen(false)
                                    setSelectedUser(null)
                                  } else {
                                    setSelectedUser(user)
                                    setUserDetailsOpen(true)
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedUser(user)
                                        setUserDetailsOpen(true)
                                      }}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                                          {getInitials(user)}
                                        </div>
                                        User Details
                                      </DialogTitle>
                                      <DialogDescription>
                                        Complete information for {user.first_name} {user.last_name}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm font-medium text-gray-500">First Name</p>
                                          <p className="text-base text-gray-900">{user.first_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-500">Last Name</p>
                                          <p className="text-base text-gray-900">{user.last_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-500">Email</p>
                                          <p className="text-base text-gray-900">{user.email || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-500">Phone</p>
                                          <p className="text-base text-gray-900">{user.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-500">Role</p>
                                          <Badge className={`${getRoleInfo(user.app_role || '').color} border`}>
                                            {getRoleInfo(user.app_role || '').label}
                                          </Badge>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-500">Status</p>
                                          {user.profile_completed ? (
                                            <Badge className="bg-green-100 text-green-700 border-green-300">
                                              <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                              Active
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                                              <XCircle className="w-3 h-3 mr-1 inline" />
                                              Incomplete
                                            </Badge>
                                          )}
                                        </div>
                                        {userRole === 'admin' && (
                                          <div>
                                            <p className="text-sm font-medium text-gray-500">Team</p>
                                            <p className="text-base text-gray-900">
                                              {user.teams ? `${user.teams.name} (${user.teams.code})` : 'No team'}
                                            </p>
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-sm font-medium text-gray-500">Created At</p>
                                          <p className="text-base text-gray-900">{formatDate(user.created_at)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
