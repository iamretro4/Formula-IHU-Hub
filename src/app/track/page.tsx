'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import {
  Timer, Trophy, Flag, Zap, RotateCcw, Users, Clock, Edit3, Trash2
} from 'lucide-react'
import { Loader2 } from 'lucide-react'

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
  penalties: object | null
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
  { key: 'acceleration', name: 'Acceleration', icon: <Zap className="h-5 w-5" /> },
  { key: 'skidpad', name: 'Skidpad', icon: <RotateCcw className="h-5 w-5" /> },
  { key: 'autocross', name: 'Autocross', icon: <Flag className="h-5 w-5" /> },
  { key: 'endurance', name: 'Endurance', icon: <Trophy className="h-5 w-5" /> },
]

const PAGE_SIZE = 20

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  React.useEffect(() => {
    const handleError = () => setHasError(true)
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])
  return hasError ? <div className="text-red-600 text-lg font-bold">An unexpected error occurred.</div> : <>{children}</>
}

export default function TrackLivePage() {
  const supabase = createClientComponentClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [allRuns, setAllRuns] = useState<Run[]>([])
  const [stats, setStats] = useState({ totalRuns: 0, activeEvents: 0, teamsParticipating: 0, averageTime: 0 })
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
      setProfile(profileData)

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
      if (runError) throw runError
      setAllRuns(runData || [])

      // Optionally add stats fetch here, omitted for brevity

    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error')
      setError(error.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAll()
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

  function clearMessagesDelayed() {
    setTimeout(() => {
      setError(null)
      setSuccess(null)
    }, 5000)
  }

  const handleSaveNew = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (!inputRun.teamId || inputRun.runNumber < 1) throw new Error('Fill all fields')
      if (
        inputRun.status === 'completed' &&
        (!inputRun.time || isNaN(+inputRun.time) || +inputRun.time <= 0)
      ) {
        throw new Error('Invalid time')
      }

      const duplicate = allRuns.find(
        r =>
          r.team_id === inputRun.teamId && r.event_type === activeTab && r.run_number === inputRun.runNumber
      )
      if (duplicate) throw new Error('Duplicate run exists, please edit instead.')

      const { error: insertError } = await supabase.from('dynamic_event_runs').insert({
        team_id: inputRun.teamId,
        event_type: activeTab,
        run_number: inputRun.runNumber,
        raw_time: inputRun.status === 'completed' ? +inputRun.time : null,
        status: inputRun.status,
        recorded_by: profile?.id,
      })
      if (insertError) throw insertError

      await fetchAll()
      setSuccess('Run added')
      clearMessagesDelayed()
      setInputRun({ teamId: '', runNumber: 1, time: '', status: 'completed' })
    } catch (e: any) {
      setError(e.message || 'Failed to add run')
      clearMessagesDelayed()
    } finally {
      setIsSaving(false)
    }
  }, [inputRun, activeTab, allRuns, profile?.id, supabase, fetchAll])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this run?')) return
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      try {
        const { error: delError } = await supabase.from('dynamic_event_runs').delete().eq('id', id)
        if (delError) throw delError
        await fetchAll()
        setSuccess('Run deleted')
        clearMessagesDelayed()
        if (editRunId === id) {
          setEditRunId(null)
          setEditRunData({ time: '', status: 'completed' })
        }
      } catch (e: any) {
        setError(e.message || 'Failed to delete run')
        clearMessagesDelayed()
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
          throw new Error('Invalid time')
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
        setSuccess('Run updated')
        clearMessagesDelayed()
        setEditRunId(null)
        setEditRunData({ time: '', status: 'completed' })
      } catch (e: any) {
        setError(e.message || 'Failed to update run')
        clearMessagesDelayed()
      } finally {
        setIsSaving(false)
      }
    },
    [editRunData, fetchAll, profile?.id, supabase],
  )

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-8">
        {(error || success) && (
          <Alert variant={error ? 'destructive' : 'default'}>
            <AlertDescription>{error ?? success}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Live Track Data & Run Management</h1>
            <p className="text-gray-600 max-w-xl">
              View, add, edit, and delete dynamic event runs.
            </p>
          </div>
          <Button asChild>
            <Link href="/track">Back to Track Dashboard</Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Card>
            <CardHeader>
              <TabsList>
                {DYNAMIC_EVENTS.map(dyn => (
                  <TabsTrigger
                    key={dyn.key}
                    value={dyn.key}
                    className={activeTab === dyn.key ? 'shadow-lg ring-2 ring-indigo-600 rounded-lg' : ''}
                  >
                    {dyn.icon}
                    <span className="ml-2">{dyn.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>
            <CardContent>
              {DYNAMIC_EVENTS.map(dyn => (
                <TabsContent key={dyn.key} value={dyn.key}>
                  {canInput && (
                    <div className="my-4 p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
                      <div className="flex flex-wrap gap-4 items-center">
                        <Select
                          value={inputRun.teamId}
                          onValueChange={v => setInputRun(prev => ({ ...prev, teamId: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Team" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map(team => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.code} - {team.name}
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
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={inputRun.time}
                          onChange={e => setInputRun(prev => ({ ...prev, time: e.target.value }))}
                          disabled={inputRun.status !== 'completed'}
                          placeholder="Time (s)"
                        />
                        <Select
                          value={inputRun.status}
                          onValueChange={v => setInputRun(prev => ({ ...prev, status: v }))}
                        >
                          <SelectTrigger>
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
                        >
                          {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Add Run'}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div>
                    {Object.keys(runsByTeam).length === 0 ? (
                      <p className="text-center text-gray-500">No runs logged for {dyn.name} yet.</p>
                    ) : (
                      Object.entries(runsByTeam).map(([teamId, runs]) => {
                        const team = teams.find(t => t.id === teamId)
                        return (
                          <Card key={teamId} className="mb-4">
                            <CardHeader className="flex justify-between items-center">
                              <div>{team ? `${team.code} - ${team.name}` : teamId}</div>
                              {runs[0].status === 'completed' && (
                                <Badge variant="default">Best: {runs[0].raw_time?.toFixed(2)} s</Badge>
                              )}
                            </CardHeader>
                            <CardContent>
                              {runs.map(run => (
                                <div key={run.id} className="flex justify-between items-center mb-2 text-sm">
                                  <div>Run {run.run_number}:</div>

                                  {editRunId === run.id ? (
                                    <>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={editRunData.time}
                                        onChange={e => setEditRunData(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-24"
                                      />
                                      <Select
                                        value={editRunData.status}
                                        onValueChange={v => setEditRunData(prev => ({ ...prev, status: v }))}
                                      >
                                        <SelectTrigger className="w-28">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="dnf">DNF</SelectItem>
                                          <SelectItem value="dsq">DSQ</SelectItem>
                                          <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button size="sm" onClick={() => saveEdit(run.id)} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save'}
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      {run.status === 'completed' ? (
                                        <span className="font-semibold w-24 block text-right">
                                          {run.raw_time?.toFixed(3)} s
                                        </span>
                                      ) : (
                                        <Badge variant={run.status === 'dnf' ? 'destructive' : 'secondary'}>
                                          {run.status.toUpperCase()}
                                        </Badge>
                                      )}
                                      {(canInput) && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => startEdit(run)}
                                            title="Edit Run"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDelete(run.id)}
                                            title="Delete Run"
                                            disabled={isSaving}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </>
                                  )}

                                  <span className="ml-2 text-xs text-gray-600">
                                    Logged by {run.recorded_by}
                                  </span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                </TabsContent>
              ))}
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}
