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
  RefreshCw,
  UserCheck,
  UserX,
  Edit2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Mail,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format, parseISO } from 'date-fns'

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
  const [editingTeamId, setEditingTeamId] = useState<string>('')
  const [editingEmail, setEditingEmail] = useState<string>('')
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [userDetailsOpen, setUserDetailsOpen] = useState(false)
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [resendingUserId, setResendingUserId] = useState<string | null>(null)

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
    setEditingTeamId(user.team_id ?? '')
    setEditingEmail(user.email ?? '')
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setEditingRole('')
    setEditingTeamId('')
    setEditingEmail('')
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

    // Validate email if admin changed it
    const targetUser = users.find(u => u.id === userId)
    const emailChanged = userRole === 'admin' && targetUser && (editingEmail.trim().toLowerCase() !== (targetUser.email ?? '').trim().toLowerCase())
    if (emailChanged) {
      const trimmed = editingEmail.trim().toLowerCase()
      if (!trimmed) {
        toast.error('Email cannot be empty')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast.error('Invalid email format')
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

      // Update email via API (auth + user_profiles) when admin changed it
      if (emailChanged) {
        const res = await fetch('/api/admin/update-user-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, email: editingEmail.trim().toLowerCase() }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data.message || 'Failed to update email')
          setSaving(null)
          return
        }
      }

      logger.debug('Updating user role', {
        userId,
        newRole: editingRole,
        currentUser: user.id,
        context: 'user_management'
      })

      const updatePayload: { app_role: string; team_id?: string | null } = { app_role: editingRole as any }
      if (userRole === 'admin') {
        updatePayload.team_id = (editingTeamId && editingTeamId !== 'none') ? editingTeamId : null
      }

      const updatePromise = supabase
        .from('user_profiles')
        .update(updatePayload as any)
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

      const newTeamId = (userRole === 'admin' && editingTeamId && editingTeamId !== 'none') ? editingTeamId : null
      const newTeam = newTeamId ? teams.find(t => t.id === newTeamId) : null
      const newEmail = emailChanged ? editingEmail.trim().toLowerCase() : undefined
      setUsers(users.map(u =>
        u.id === userId
          ? {
              ...u,
              app_role: editingRole as any,
              team_id: newTeamId ?? u.team_id,
              teams: newTeam ? { name: newTeam.name, code: newTeam.code } : null,
              ...(newEmail !== undefined ? { email: newEmail } : {}),
            }
          : u
      ))

      toast.success(emailChanged ? 'User updated successfully' : 'Role updated successfully')
      setEditingUserId(null)
      setEditingRole('')
      setEditingTeamId('')
      setEditingEmail('')
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
        const err = data.email_error as string
        const isResendRestriction =
          /only send testing emails to your own email|verify a domain at resend/i.test(err)
        if (isResendRestriction) {
          toast.error(
            'User was approved but they did not receive an email. To send approval emails to anyone: verify your domain at resend.com/domains and set RESEND_FROM_EMAIL in Vercel (e.g. Formula IHU Hub <noreply@fihu.gr>), then redeploy.',
            { duration: 10000 }
          )
        } else {
          toast.error(`Approval email could not be sent: ${err}. Set RESEND_API_KEY in Vercel for notification emails.`, { duration: 6000 })
        }
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

  const handleResendApprovalEmail = async (userId: string) => {
    if (userRole !== 'admin') return
    setResendingUserId(userId)
    try {
      const res = await fetch('/api/admin/resend-approval-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.message || 'Failed to resend approval email')
        return
      }
      if (data.email_sent) {
        toast.success('Approval email sent.')
      } else if (data.email_error) {
        const err = data.email_error as string
        const isResendRestriction = /only send testing emails to your own email|verify a domain at resend/i.test(err)
        if (isResendRestriction) {
          toast.error(
            'To send approval emails: verify your domain at resend.com/domains and set RESEND_FROM_EMAIL in Vercel (e.g. Formula IHU Hub <noreply@fihu.gr>), then redeploy.',
            { duration: 10000 }
          )
        } else {
          toast.error(`Email could not be sent: ${err}`, { duration: 6000 })
        }
      }
    } catch {
      toast.error('Failed to resend approval email')
    } finally {
      setResendingUserId(null)
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
    return format(parseISO(date), 'MMM d, yyyy, h:mm a')
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
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 animate-fade-in min-h-screen">
      {/* Header + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {userRole === 'admin' ? 'All users' : 'Your team and pending approvals'}
          </p>
        </div>
        {userRole === 'admin' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px] sm:max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Login" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortDirection}`} onValueChange={(value) => {
              const [col, dir] = value.split('-')
              setSortBy(col as SortOption)
              setSortDirection(dir as SortDirection)
            }}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
                <SelectItem value="email-asc">Email A–Z</SelectItem>
                <SelectItem value="email-desc">Email Z–A</SelectItem>
                <SelectItem value="created_at-desc">Newest</SelectItem>
                <SelectItem value="created_at-asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Users Table */}
      <Card className="border border-gray-200">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold">
            {userRole === 'admin' ? (
              <>All Users · {filteredAndSortedUsers.length}{users.length !== filteredAndSortedUsers.length && ` of ${users.length}`}</>
            ) : (
              <>Team members · {filteredAndSortedUsers.length}</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-6">
          {filteredAndSortedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium text-lg mb-2">No users found</p>
              <p className="text-sm text-gray-400">
                {userRole === 'admin' && (searchQuery || roleFilter !== 'all' || teamFilter !== 'all')
                  ? 'Try adjusting your filters or search query'
                  : userRole === 'admin'
                    ? 'No users available'
                    : 'No team members or pending approvals yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-600 text-sm">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        User
                        <SortIcon column="name" />
                      </button>
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-600 text-sm">Email</th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-600 text-sm">
                      <button
                        onClick={() => handleSort('role')}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        Role
                        <SortIcon column="role" />
                      </button>
                    </th>
                    {userRole === 'admin' && (
                      <th className="text-left py-2.5 px-3 font-medium text-gray-600 text-sm">
                        <button
                          onClick={() => handleSort('team')}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          Team
                          <SortIcon column="team" />
                        </button>
                      </th>
                    )}
                    <th className="text-left py-2.5 px-3 font-medium text-gray-600 text-sm">Status</th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-600 text-sm w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedUsers.map((user) => {
                    const roleInfo = getRoleInfo(user.app_role || '')
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                              {getInitials(user)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(user.created_at)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-600">
                          {userRole === 'admin' && editingUserId === user.id ? (
                            <Input
                              type="email"
                              value={editingEmail}
                              onChange={(e) => setEditingEmail(e.target.value)}
                              placeholder="email@example.com"
                              className="w-48 text-sm"
                            />
                          ) : (
                            user.email
                          )}
                        </td>
                        <td className="py-3 px-3">
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
                            <Badge className={`${roleInfo.color} border text-xs`}>
                              {roleInfo.label}
                            </Badge>
                          )}
                        </td>
                        {userRole === 'admin' && (
                          <td className="py-3 px-3 text-sm text-gray-600">
                            {editingUserId === user.id ? (
                              <Select
                                value={editingTeamId || 'none'}
                                onValueChange={setEditingTeamId}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No team</SelectItem>
                                  {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name} ({team.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : user.teams ? (
                              <span>{user.teams.code}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5 items-center text-sm">
                            {userRole === 'admin' && (
                              <>
                                {user.login_approved !== false ? (
                                  <span className="text-green-600">Approved</span>
                                ) : (
                                  <span className="text-amber-600">Pending</span>
                                )}
                                <span className="text-gray-300" aria-hidden>·</span>
                              </>
                            )}
                            {user.email_confirmed_at ? (
                              <span className="text-green-600">Confirmed</span>
                            ) : (
                              <span className="text-orange-600">Unconfirmed</span>
                            )}
                            {userRole === 'admin' && (
                              <>
                                <span className="text-gray-300" aria-hidden>·</span>
                                {user.profile_completed ? (
                                  <span className="text-green-600">Active</span>
                                ) : (
                                  <span className="text-orange-600">Incomplete</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {editingUserId === user.id ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleSaveRole(user.id)}
                                disabled={saving === user.id}
                                className="h-8 gap-1"
                              >
                                {saving === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={saving === user.id}
                                className="h-8 px-2"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedUser(user); setUserDetailsOpen(true) }}>
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditRole(user)}
                                  disabled={user.id === currentUser?.id && userRole === 'team_leader'}
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Edit role & team
                                </DropdownMenuItem>
                                {userRole === 'admin' && user.login_approved === false && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleApproveUser(user.id, !!(user as UserProfile).team_lead)}
                                      disabled={approvingUserId === user.id}
                                    >
                                      {approvingUserId === user.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <UserCheck className="w-4 h-4 mr-2" />
                                      )}
                                      {(user as UserProfile).team_lead ? 'Approve as leader' : 'Approve'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRejectUser(user.id)}
                                      disabled={approvingUserId === user.id}
                                      variant="destructive"
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {userRole === 'admin' && user.login_approved !== false && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleResendApprovalEmail(user.id)}
                                      disabled={resendingUserId === user.id}
                                    >
                                      {resendingUserId === user.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <Mail className="w-4 h-4 mr-2" />
                                      )}
                                      Resend approval email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRejectUser(user.id)}
                                      disabled={approvingUserId === user.id}
                                      variant="destructive"
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Revoke approval
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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

      {/* User details dialog (opened from row actions) */}
      <Dialog open={userDetailsOpen} onOpenChange={(open) => {
        if (!open) { setUserDetailsOpen(false); setSelectedUser(null) }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {getInitials(selectedUser)}
                  </div>
                  {selectedUser.first_name} {selectedUser.last_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedUser.email}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                <div>
                  <p className="font-medium text-gray-500">Role</p>
                  <Badge className={`${getRoleInfo(selectedUser.app_role || '').color} border mt-0.5`}>
                    {getRoleInfo(selectedUser.app_role || '').label}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-gray-500">Email</p>
                  <span className={selectedUser.email_confirmed_at ? 'text-green-600' : 'text-orange-600'}>
                    {selectedUser.email_confirmed_at ? `Confirmed ${formatDate(selectedUser.email_confirmed_at)}` : 'Unconfirmed'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-500">Profile</p>
                  <span className={selectedUser.profile_completed ? 'text-green-600' : 'text-orange-600'}>
                    {selectedUser.profile_completed ? 'Active' : 'Incomplete'}
                  </span>
                </div>
                {userRole === 'admin' && (
                  <>
                    <div>
                      <p className="font-medium text-gray-500">Login Approved</p>
                      <span className={selectedUser.login_approved ? 'text-green-600' : 'text-amber-600'}>
                        {selectedUser.login_approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Team</p>
                      <p className="text-gray-900">{selectedUser.teams ? `${selectedUser.teams.name} (${selectedUser.teams.code})` : 'No team'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="font-medium text-gray-500">Joined</p>
                  <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                </div>
                {selectedUser.phone && (
                  <div className="col-span-2">
                    <p className="font-medium text-gray-500">Phone</p>
                    <p className="text-gray-900">{selectedUser.phone}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
