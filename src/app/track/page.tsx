'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Timer, 
  Trophy, 
  Flag, 
  Zap, 
  RotateCcw, 
  Users, 
  Clock, 
  Edit3, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
  TrendingUp,
  Award,
  ArrowLeft,
  Plus
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'

type UserProfile = {
  id: string
  team_id: string
  app_role: string
  first_name: string
  last_name: string
}

type Team = {
  id: string
  code: string
  name: string
  vehicle_class?: string
}

type RunStatus = 'completed' | 'dnf' | 'dsq' | 'cancelled'

type Run = {
  id: string
  team_id: string
  driver_id: string | null
  event_type: string
  run_number: number
  raw_time: number | null
  penalties: any | null
  corrected_time: number | null
  status: RunStatus
  recorded_by: string
  recorded_at: string | null
  notes: string | null
  weather_conditions: string | null
  created_at: string | null
  teams?: Team
}

const DYNAMIC_EVENTS = [
  { key: 'acceleration', name: 'Acceleration', icon: <Zap className="h-5 w-5" />, color: 'from-yellow-500 to-orange-500' },
  { key: 'skidpad', name: 'Skidpad', icon: <RotateCcw className="h-5 w-5" />, color: 'from-blue-500 to-cyan-500' },
  { key: 'autocross', name: 'Autocross', icon: <Flag className="h-5 w-5" />, color: 'from-green-500 to-emerald-500' },
  { key: 'endurance', name: 'Endurance', icon: <Trophy className="h-5 w-5" />, color: 'from-purple-500 to-pink-500' },
]

const PAGE_SIZE = 20

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  React.useEffect(() => {
    const handleError = () => setHasError(true)
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])
  return hasError ? (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="font-semibold">An unexpected error occurred.</p>
        </div>
      </CardContent>
    </Card>
  ) : <>{children}</>
}

export default function TrackLivePage() {
  const router = useRouter()
  const { profile: authProfile } = useAuth()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const effectRunIdRef = useRef(0)

  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Temporarily admin-only
  useEffect(() => {
    if (authProfile === undefined) return
    if (authProfile?.app_role !== 'admin') router.replace('/dashboard')
  }, [authProfile, router])
  const [teams, setTeams] = useState<Team[]>([])
  const [allRuns, setAllRuns] = useState<Run[]>([])
  const [stats, setStats] = useState({ 
    totalRuns: 0, 
    activeEvents: 0, 
    teamsParticipating: 0, 
    averageTime: 0,
    completedRuns: 0
  })
  const [activeTab, setActiveTab] = useState(DYNAMIC_EVENTS[0].key)
  const [inputRun, setInputRun] = useState<{ teamId: string; runNumber: number; time: string; status: RunStatus }>({
    teamId: '',
    runNumber: 1,
    time: '',
    status: 'completed',
  })
  const [editRunId, setEditRunId] = useState<string | null>(null)
  const [editRunData, setEditRunData] = useState<{ time: string; status: RunStatus }>({ time: '', status: 'completed' })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState<number>(1)

  const canInput = Boolean(profile && ['admin', 'scrutineer'].includes(profile.app_role))

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr) throw authErr
      if (!user) throw new Error('You must be logged in')

      const { data: profileData, error: profileErr } = await supabase
        .from('user_profiles')
        .select('id, team_id, app_role, first_name, last_name')
        .eq('id', user.id)
        .single()
        if (profileErr) throw profileErr
        setProfile(profileData as any)

      const { data: teamsData, error: teamsErr } = await supabase
        .from('teams')
        .select('id, code, name')
        .order('code')
      if (teamsErr) throw teamsErr
      setTeams(teamsData || [])

      const { data: runData, error: runError } = await supabase
        .from('dynamic_event_runs')
        .select(
          `
          *,
          teams(id, code, name, vehicle_class)
          `
        )
        .order('created_at', { ascending: false })
      if (runError) throw runError
      setAllRuns((runData || []) as any)

      // Calculate stats
      const completedRuns = (runData || []).filter((r: any) => r.status === 'completed' && r.raw_time)
      const avgTime = completedRuns.length > 0
        ? completedRuns.reduce((sum: number, r: any) => sum + (r.raw_time || 0), 0) / completedRuns.length
        : 0
      
      const uniqueTeams = new Set((runData || []).map((r: any) => r.team_id))
      const activeEventTypes = new Set((runData || []).map((r: any) => r.event_type))

      setStats({
        totalRuns: (runData || []).length,
        activeEvents: activeEventTypes.size,
        teamsParticipating: uniqueTeams.size,
        averageTime: avgTime,
        completedRuns: completedRuns.length
      })

    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error')
      setError(error.message || 'Failed to load data')
      toast.error(error.message || 'Failed to load data')
      logger.error('[Track] Error loading data', e)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const currentRunId = ++effectRunIdRef.current
    let active = true
    
    async function loadData() {
      if (currentRunId !== effectRunIdRef.current) return
      await fetchAll()
    }
    
    loadData()
    return () => { active = false }
  }, [fetchAll])

  const visibleRuns = allRuns.filter(run => run.event_type === activeTab)

  // Pagination slicing
  const pagedRuns = visibleRuns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const totalPages = Math.ceil(visibleRuns.length / PAGE_SIZE)

  // Group runs by team
  const runsByTeam: Record<string, Run[]> = {}
  pagedRuns.forEach(run => {
    const teamId = run.team_id || run.teams?.id
    if (!teamId) return
    if (!runsByTeam[teamId]) runsByTeam[teamId] = []
    runsByTeam[teamId].push(run)
  })
  Object.keys(runsByTeam).forEach(tid => {
    runsByTeam[tid] = runsByTeam[tid].sort((a, b) => {
      if (a.status !== 'completed' && b.status === 'completed') return 1
      if (a.status === 'completed' && b.status !== 'completed') return -1
      return (a.raw_time || Number.MAX_SAFE_INTEGER) - (b.raw_time || Number.MAX_SAFE_INTEGER)
    })
  })

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  function formatTime(seconds: number | null): string {
    if (!seconds) return 'N/A'
    return seconds.toFixed(3) + 's'
  }

  function getPenaltyDisplay(penalties: any): string {
    if (!penalties || typeof penalties !== 'object') return ''
    const parts: string[] = []
    if (penalties.cones) parts.push(`${penalties.cones} cone${penalties.cones > 1 ? 's' : ''}`)
    if (penalties.off_course) parts.push(`${penalties.off_course} off-course`)
    if (penalties.dsq) parts.push('DSQ')
    return parts.length > 0 ? parts.join(', ') : ''
  }

  const handleSaveNew = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (!inputRun.teamId || inputRun.runNumber < 1) {
        throw new Error('Please fill all required fields')
      }
      if (
        inputRun.status === 'completed' &&
        (!inputRun.time || isNaN(+inputRun.time) || +inputRun.time <= 0)
      ) {
        throw new Error('Invalid time for completed run')
      }

      const duplicate = allRuns.find(
        r =>
          r.team_id === inputRun.teamId && r.event_type === activeTab && r.run_number === inputRun.runNumber
      )
      if (duplicate) throw new Error('Duplicate run exists. Please edit the existing run instead.')

      const { error: insertError } = await supabase.from('dynamic_event_runs').insert({
        team_id: inputRun.teamId,
        event_type: activeTab,
        run_number: inputRun.runNumber,
        raw_time: inputRun.status === 'completed' ? +inputRun.time : null,
        status: inputRun.status,
        recorded_by: profile?.id,
      } as any)
      if (insertError) throw insertError

      await fetchAll()
      toast.success('Run added successfully')
      setInputRun({ teamId: '', runNumber: 1, time: '', status: 'completed' })
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to add run'
      setError(errorMsg)
      toast.error(errorMsg)
      logger.error('[Track] Error adding run', e)
    } finally {
      setIsSaving(false)
    }
  }, [inputRun, activeTab, allRuns, profile?.id, supabase, fetchAll])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this run? This action cannot be undone.')) return
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      try {
        const { error: delError } = await supabase.from('dynamic_event_runs').delete().eq('id', id)
        if (delError) throw delError
        await fetchAll()
        toast.success('Run deleted successfully')
        if (editRunId === id) {
          setEditRunId(null)
          setEditRunData({ time: '', status: 'completed' })
        }
      } catch (e: any) {
        const errorMsg = e.message || 'Failed to delete run'
        setError(errorMsg)
        toast.error(errorMsg)
        logger.error('[Track] Error deleting run', e)
      } finally {
        setIsSaving(false)
      }
    },
    [supabase, fetchAll, editRunId],
  )

  function startEdit(run: Run) {
    setEditRunId(run.id)
    setEditRunData({
      time: run.raw_time?.toString() ?? '',
      status: run.status,
    })
  }

  function cancelEdit() {
    setEditRunId(null)
    setEditRunData({ time: '', status: 'completed' })
  }

  const saveEdit = useCallback(
    async (id: string) => {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      try {
        if (
          editRunData.status === 'completed' &&
          (!editRunData.time || isNaN(+editRunData.time) || +editRunData.time <= 0)
        ) {
          throw new Error('Invalid time for completed run')
        }
        const { error: updateError } = await supabase
          .from('dynamic_event_runs')
          .update({
            raw_time: editRunData.status === 'completed' ? +editRunData.time : null,
            status: editRunData.status,
            recorded_by: profile?.id,
          })
          .eq('id', id)
        if (updateError) throw updateError
        await fetchAll()
        toast.success('Run updated successfully')
        setEditRunId(null)
        setEditRunData({ time: '', status: 'completed' })
      } catch (e: any) {
        const errorMsg = e.message || 'Failed to update run'
        setError(errorMsg)
        toast.error(errorMsg)
        logger.error('[Track] Error updating run', e)
      } finally {
        setIsSaving(false)
      }
    },
    [editRunData, fetchAll, profile?.id, supabase],
  )

  const activeEvent = DYNAMIC_EVENTS.find(e => e.key === activeTab)
  const isAdmin = authProfile?.app_role === 'admin'

  if (authProfile === undefined || !isAdmin) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-4 sm:p-6 md:p-8 space-y-6 animate-fade-in min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Live Track Data
            </h1>
            <p className="text-gray-600 mt-2 max-w-xl">
              View, add, edit, and manage dynamic event runs
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/track">
              <ArrowLeft className="w-4 h-4" />
              Back to Track
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="shadow-md border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Runs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRuns}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completedRuns}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Teams</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.teamsParticipating}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Avg Time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.averageTime > 0 ? formatTime(stats.averageTime) : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Timer className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-gray-600 font-medium">Loading track data...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !isLoading && (
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

        {!isLoading && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <Card className="shadow-lg border-gray-200">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2">
                  {DYNAMIC_EVENTS.map(dyn => (
                    <TabsTrigger
                      key={dyn.key}
                      value={dyn.key}
                      className={`flex items-center gap-2 data-[state=active]:bg-gradient-to-r ${dyn.color} data-[state=active]:text-white`}
                    >
                      {dyn.icon}
                      <span className="hidden sm:inline">{dyn.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>
              <CardContent className="pt-6">
                {DYNAMIC_EVENTS.map(dyn => (
                  <TabsContent key={dyn.key} value={dyn.key} className="space-y-6">
                    {canInput && (
                      <Card className="border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Add New Run
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Select
                              value={inputRun.teamId}
                              onValueChange={v => setInputRun(prev => ({ ...prev, teamId: v }))}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select Team" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map(team => (
                                  <SelectItem key={team.id} value={team.id}>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">{team.code}</Badge>
                                      {team.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={1}
                              value={inputRun.runNumber}
                              onChange={e => setInputRun(prev => ({ ...prev, runNumber: +e.target.value }))}
                              placeholder="Run #"
                              className="h-11"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={inputRun.time}
                              onChange={e => setInputRun(prev => ({ ...prev, time: e.target.value }))}
                              disabled={inputRun.status !== 'completed'}
                              placeholder="Time (s)"
                              className="h-11"
                            />
                            <Select
                              value={inputRun.status}
                              onValueChange={v => setInputRun(prev => ({ ...prev, status: v as RunStatus }))}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="dnf">DNF</SelectItem>
                                <SelectItem value="dsq">DSQ</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleSaveNew}
                              disabled={
                                isSaving ||
                                !inputRun.teamId ||
                                !inputRun.runNumber ||
                                (inputRun.status === 'completed' && !inputRun.time)
                              }
                              className="h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Run
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Runs List */}
                    <div className="space-y-4">
                      {Object.keys(runsByTeam).length === 0 ? (
                        <Card className="border-gray-200">
                          <CardContent className="pt-6">
                            <div className="text-center py-12">
                              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                              <p className="text-gray-500 font-medium">No runs logged for {dyn.name} yet.</p>
                              <p className="text-sm text-gray-400 mt-1">Add the first run using the form above.</p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {Object.entries(runsByTeam).map(([teamId, runs]) => {
                            const team = teams.find(t => t.id === teamId)
                            const bestRun = runs.find(r => r.status === 'completed' && r.raw_time)
                            return (
                              <Card key={teamId} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <Badge variant="outline" className="text-base font-bold px-3 py-1">
                                        {team?.code || teamId}
                                      </Badge>
                                      <div>
                                        <p className="font-semibold text-gray-900">{team?.name || 'Unknown Team'}</p>
                                        <p className="text-xs text-gray-500">{runs.length} run{runs.length !== 1 ? 's' : ''}</p>
                                      </div>
                                    </div>
                                    {bestRun && (
                                      <div className="flex items-center gap-2">
                                        <Award className="w-5 h-5 text-yellow-500" />
                                        <span className="text-sm text-gray-600">Best:</span>
                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-base px-3 py-1">
                                          {formatTime(bestRun.raw_time)}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                  <div className="space-y-3">
                                    {runs.map(run => (
                                      <div 
                                        key={run.id} 
                                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white"
                                      >
                                        <div className="flex-1 flex items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-semibold">
                                              Run {run.run_number}
                                            </Badge>
                                            {run.status === 'completed' ? (
                                              <div className="flex items-center gap-2">
                                                <Timer className="w-4 h-4 text-green-600" />
                                                <span className="font-bold text-lg text-gray-900">
                                                  {formatTime(run.raw_time)}
                                                </span>
                                              </div>
                                            ) : (
                                              <Badge 
                                                variant={run.status === 'dsq' ? 'destructive' : 'secondary'}
                                                className="font-semibold"
                                              >
                                                {run.status.toUpperCase()}
                                              </Badge>
                                            )}
                                          </div>
                                          {run.penalties && getPenaltyDisplay(run.penalties) && (
                                            <div className="flex items-center gap-2 text-sm text-amber-600">
                                              <AlertCircle className="w-4 h-4" />
                                              <span className="font-medium">{getPenaltyDisplay(run.penalties)}</span>
                                            </div>
                                          )}
                                        </div>

                                        {editRunId === run.id ? (
                                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min={0}
                                              value={editRunData.time}
                                              onChange={e => setEditRunData(prev => ({ ...prev, time: e.target.value }))}
                                              className="w-full sm:w-32 h-10"
                                              placeholder="Time"
                                            />
                                            <Select
                                              value={editRunData.status}
                                              onValueChange={v => setEditRunData(prev => ({ ...prev, status: v as RunStatus }))}
                                            >
                                              <SelectTrigger className="w-full sm:w-32 h-10">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="dnf">DNF</SelectItem>
                                                <SelectItem value="dsq">DSQ</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <div className="flex gap-2">
                                              <Button 
                                                size="sm" 
                                                onClick={() => saveEdit(run.id)} 
                                                disabled={isSaving}
                                                className="flex-1 sm:flex-none"
                                              >
                                                {isSaving ? (
                                                  <Loader2 className="animate-spin h-4 w-4" />
                                                ) : (
                                                  <CheckCircle2 className="h-4 w-4" />
                                                )}
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={cancelEdit} 
                                                disabled={isSaving}
                                                className="flex-1 sm:flex-none"
                                              >
                                                <XCircle className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            {canInput && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => startEdit(run)}
                                                  title="Edit Run"
                                                  className="gap-2"
                                                >
                                                  <Edit3 className="w-4 h-4" />
                                                  <span className="hidden sm:inline">Edit</span>
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  onClick={() => handleDelete(run.id)}
                                                  title="Delete Run"
                                                  disabled={isSaving}
                                                  className="gap-2"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                  <span className="hidden sm:inline">Delete</span>
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="gap-2"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                              </Button>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  Page {currentPage} of {totalPages}
                                </span>
                                <span className="text-sm text-gray-400">
                                  ({visibleRuns.length} total runs)
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="gap-2"
                              >
                                Next
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </CardContent>
            </Card>
          </Tabs>
        )}
      </div>
    </ErrorBoundary>
  )
}
