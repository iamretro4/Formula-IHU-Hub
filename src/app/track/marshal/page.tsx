'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  AlertTriangle, 
  Play, 
  LogIn, 
  LogOut, 
  Lock, 
  Unlock,
  Car,
  Flag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Activity
} from 'lucide-react'
import { Database } from '@/lib/types/database'
import { logger } from '@/lib/utils/logger'
import toast from 'react-hot-toast'

type Team = Database['public']['Tables']['teams']['Row']
type TrackIncident = {
  id: string
  team_id: string
  team_code?: string
  team_name?: string
  incident_type: string
  sector: string
  severity: string
  occurred_at: string
}
type TrackEntry = {
  id: string
  team_id: string
  team_code?: string
  team_name?: string
  event: string
  sector: string
  action: string
  timestamp: string
}

const sectorOptions = [
  { value: 'Start/Finish', label: 'Start/Finish', icon: <Flag className="w-4 h-4" /> },
  { value: 'S1', label: 'Sector S1', icon: <Activity className="w-4 h-4" /> },
  { value: 'S2', label: 'Sector S2', icon: <Activity className="w-4 h-4" /> },
  { value: 'S3', label: 'Sector S3', icon: <Activity className="w-4 h-4" /> },
]

const eventOptions = [
  { value: 'skidpad', label: 'Skidpad', icon: <Zap className="w-4 h-4" /> },
  { value: 'acceleration', label: 'Acceleration', icon: <Zap className="w-4 h-4" /> },
  { value: 'autocross', label: 'Autocross', icon: <Zap className="w-4 h-4" /> },
  { value: 'endurance', label: 'Endurance', icon: <Zap className="w-4 h-4" /> },
  { value: 'practice', label: 'Practice Area', icon: <Zap className="w-4 h-4" /> },
]

type UserProfile = {
  id: string
  email?: string
  app_role?: string
}

export default function MarshalAndLiveTrackPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const effectRunIdRef = useRef(0)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [sector, setSector] = useState<string | null>(null)
  const [event, setEvent] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [runNumber, setRunNumber] = useState<number | null>(null)
  const [cones, setCones] = useState<number>(0)
  const [offCourse, setOffCourse] = useState<number>(0)
  const [dsq, setDsq] = useState<boolean>(false)
  const [incidents, setIncidents] = useState<TrackIncident[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logging, setLogging] = useState(false)
  const [showSafetyButtons, setShowSafetyButtons] = useState(false)
  const [pendingSafetyTeam, setPendingSafetyTeam] = useState<string | null>(null)
  const [trackEntries, setTrackEntries] = useState<TrackEntry[]>([])
  const [liveTeams, setLiveTeams] = useState<TrackEntry[]>([])

  const loadIncidents = useCallback(async () => {
    try {
      const since = new Date()
      since.setDate(since.getDate() - 1)
      const { data } = await supabase
        .from('track_incidents')
        .select('id,team_id,incident_type,sector,severity,occurred_at,team:teams(name,code)')
        .gte('occurred_at', since.toISOString())
        .order('occurred_at', { ascending: false })
      setIncidents(
        Array.isArray(data)
          ? data.map((inc: any) => ({
              ...inc,
              team_code: inc.team?.code,
              team_name: inc.team?.name,
            } as any))
          : []
      )
    } catch (err) {
      logger.error('[Marshal] Error loading incidents', err)
    }
  }, [supabase])

  const loadEntries = useCallback(async () => {
    try {
      const since = new Date()
      since.setDate(since.getDate() - 1)
      const { data } = await (supabase as any)
        .from('track_activity_log')
        .select('id,team_id,event,sector,action,timestamp,teams(name,code)')
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true })
      const mapped = Array.isArray(data)
        ? data.map((entry: any) => ({
            ...entry,
            team_code: entry.teams?.code,
            team_name: entry.teams?.name,
          } as any))
        : []
      setTrackEntries(mapped)
      const map = new Map<string, TrackEntry>()
      mapped.forEach((e) => {
        const key = `${e.team_id}|${e.event}|${e.sector}`
        if (e.action === 'entry') map.set(key, e)
        if (e.action === 'exit') map.delete(key)
      })
      setLiveTeams(Array.from(map.values()))
    } catch (err) {
      logger.error('[Marshal] Error loading track entries', err)
    }
  }, [supabase])

  useEffect(() => {
    const currentRunId = ++effectRunIdRef.current
    let active = true
    
    async function loadData() {
      if (currentRunId !== effectRunIdRef.current) return
      setIsLoading(true)
      setError(null)
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (active && currentRunId === effectRunIdRef.current) {
          setUser(authUser)
        }
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .order('code', { ascending: true })
        if (!active || currentRunId !== effectRunIdRef.current) return
        if (active && currentRunId === effectRunIdRef.current) {
          setTeams(teamsData ?? [])
        }
        await Promise.all([loadIncidents(), loadEntries()])
      } catch (err: unknown) {
        if (active && currentRunId === effectRunIdRef.current) {
          const error = err instanceof Error ? err : new Error('Unknown error')
          setError(error.message || 'Failed to load marshal data')
          toast.error(error.message || 'Failed to load marshal data')
        }
      } finally {
        if (active && currentRunId === effectRunIdRef.current) {
          setIsLoading(false)
        }
      }
    }
    loadData()
    return () => { active = false }
  }, [supabase, loadIncidents, loadEntries])

  function resetPenalties() {
    setCones(0)
    setOffCourse(0)
    setDsq(false)
  }

  async function logIncidentWithPenalties(type: string) {
    if (!user || !locked || !sector || !event || !teamId || runNumber === null) {
      toast.error('Please select team and run number')
      return
    }
    setLogging(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      
      // Build penalties object
      const penalties: any = {}
      if (cones > 0) penalties.cones = cones
      if (offCourse > 0) penalties.off_course = offCourse
      if (dsq) penalties.dsq = true
      
      // Log the incident
      const { error: incidentError } = await (supabase.from('track_incidents') as any).insert({
        team_id: teamId,
        marshal_id: user.id,
        incident_type: type,
        sector,
        occurred_at: now,
        severity: 'minor',
        description: '',
        action_taken: '',
        run_number: runNumber,
      })
      
      if (incidentError) throw incidentError
      
      // Log/update penalties in dynamic_event_runs
      if (cones > 0 || offCourse > 0 || dsq) {
        // Check if run exists
        const { data: existingRun } = await supabase
          .from('dynamic_event_runs')
          .select('id, penalties')
          .eq('team_id', teamId)
          .eq('event_type', event as 'acceleration' | 'skidpad' | 'autocross' | 'endurance')
          .eq('run_number', runNumber)
          .single()
        
        if (existingRun) {
          // Update existing run - merge penalties
          const existingPenalties = (existingRun.penalties || {}) as Record<string, any>
          const updatedPenalties = {
            ...existingPenalties,
            cones: (existingPenalties.cones || 0) + (penalties.cones || 0),
            off_course: (existingPenalties.off_course || 0) + (penalties.off_course || 0),
            dsq: existingPenalties.dsq || penalties.dsq || false
          }
          
          const { error: updateError } = await supabase
            .from('dynamic_event_runs')
            .update({ 
              penalties: updatedPenalties,
              status: updatedPenalties.dsq ? 'dsq' : 'completed'
            })
            .eq('id', existingRun.id)
          
          if (updateError) throw updateError
        } else {
          // Create new run with penalties
          const { error: insertError } = await supabase
            .from('dynamic_event_runs')
            .insert({
              team_id: teamId,
              event_type: event as 'acceleration' | 'skidpad' | 'autocross' | 'endurance',
              run_number: runNumber,
              penalties,
              status: dsq ? 'dsq' : 'completed',
              recorded_by: user.id,
            })
          
          if (insertError) throw insertError
        }
      }
      
      toast.success(`${type} incident and penalties logged successfully`)
      await loadIncidents()
      // Only reset penalties, keep team and run selected for multiple logs
      resetPenalties()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message ?? 'Failed to log incident.')
      toast.error(error.message ?? 'Failed to log incident.')
    } finally {
      setLogging(false)
    }
  }

  function handleSafetyConcern() {
    if (!teamId) {
      toast.error('Please select a team first')
      return
    }
    setPendingSafetyTeam(teamId)
    setShowSafetyButtons(true)
  }

  async function escalateSafety(type: 'minor' | 'critical') {
    if (!user || !locked || !sector || !event || !pendingSafetyTeam || runNumber === null) {
      toast.error('Please select team and run number')
      return
    }
    setLogging(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      
      // Build penalties object
      const penalties: any = {}
      if (cones > 0) penalties.cones = cones
      if (offCourse > 0) penalties.off_course = offCourse
      if (dsq) penalties.dsq = true
      
      // Log the safety incident
      const { error: incidentError } = await (supabase.from('track_incidents') as any).insert({
        team_id: pendingSafetyTeam,
        marshal_id: user.id,
        incident_type: 'Safety',
        sector,
        occurred_at: now,
        severity: type,
        description: `Safety concern set to ${type}`,
        run_number: runNumber,
      })
      
      if (incidentError) throw incidentError
      
      // Log/update penalties in dynamic_event_runs
      if (cones > 0 || offCourse > 0 || dsq) {
        const { data: existingRun } = await supabase
          .from('dynamic_event_runs')
          .select('id, penalties')
          .eq('team_id', pendingSafetyTeam)
          .eq('event_type', event as 'acceleration' | 'skidpad' | 'autocross' | 'endurance')
          .eq('run_number', runNumber)
          .single()
        
        if (existingRun) {
          const existingPenalties = (existingRun.penalties || {}) as Record<string, any>
          const updatedPenalties = {
            ...existingPenalties,
            cones: (existingPenalties.cones || 0) + (penalties.cones || 0),
            off_course: (existingPenalties.off_course || 0) + (penalties.off_course || 0),
            dsq: existingPenalties.dsq || penalties.dsq || false
          }
          
          const { error: updateError } = await supabase
            .from('dynamic_event_runs')
            .update({ 
              penalties: updatedPenalties,
              status: updatedPenalties.dsq ? 'dsq' : 'completed'
            })
            .eq('id', existingRun.id)
          
          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase
            .from('dynamic_event_runs')
            .insert({
              team_id: pendingSafetyTeam,
              event_type: event as 'acceleration' | 'skidpad' | 'autocross' | 'endurance',
              run_number: runNumber,
              penalties,
              status: dsq ? 'dsq' : 'completed',
              recorded_by: user.id,
            })
          
          if (insertError) throw insertError
        }
      }
      
      toast.success(`Safety concern logged as ${type} with penalties`)
      setShowSafetyButtons(false)
      setPendingSafetyTeam(null)
      // Only reset penalties, keep team and run selected
      resetPenalties()
      await loadIncidents()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message ?? 'Failed to log safety concern.')
      toast.error(error.message ?? 'Failed to log safety concern.')
    } finally {
      setLogging(false)
    }
  }

  async function clearSafety() {
    if (!pendingSafetyTeam || !sector) {
      setShowSafetyButtons(false)
      setPendingSafetyTeam(null)
      return
    }
    setLogging(true)
    setError(null)
    try {
      const { data } = await (supabase as any)
        .from('track_incidents')
        .select('id')
        .eq('team_id', pendingSafetyTeam)
        .eq('sector', sector)
        .eq('incident_type', 'Safety')
        .order('occurred_at', { ascending: false })
        .limit(1)
      if (data?.[0]) {
        const { error: deleteError } = await (supabase.from('track_incidents') as any).delete().eq('id', (data[0] as any).id)
        if (deleteError) throw deleteError
        toast.success('Safety concern cleared')
      }
      setShowSafetyButtons(false)
      setPendingSafetyTeam(null)
      // Don't reset team/run, only penalties
      resetPenalties()
      await loadIncidents()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message ?? 'Failed to clear safety concern.')
      toast.error(error.message ?? 'Failed to clear safety concern.')
    } finally {
      setLogging(false)
    }
  }

  async function logTrackActivity(action: 'entry' | 'exit') {
    if (!user || !teamId || !event || !sector) {
      toast.error('Please select team, event, and sector')
      return
    }
    setLogging(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const { error: insertError } = await (supabase as any).from('track_activity_log').insert({
        team_id: teamId,
        event,
        sector,
        action,
        timestamp: now,
        marshal_id: user.id,
      })
      
      if (insertError) throw insertError
      
      toast.success(`Track ${action} logged successfully`)
      await loadEntries()
      // Don't reset team/run for track activity, only penalties
      resetPenalties()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message ?? 'Failed to log track entry/exit')
      toast.error(error.message ?? 'Failed to log track entry/exit')
    } finally {
      setLogging(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      void loadEntries()
    }, 10000)
    return () => clearInterval(interval)
  }, [loadEntries])

  const selectedTeam = teams.find(t => t.id === teamId)
  const selectedSector = sectorOptions.find(s => s.value === sector)
  const selectedEvent = eventOptions.find(e => e.value === event)

  return (
    <div className='p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in min-h-screen'>
      {/* Header */}
      <div className="space-y-2">
        <h1 className='text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight'>
          Track Marshal Console
        </h1>
        <p className='text-gray-600 text-sm sm:text-base'>
          Quick incident logging and track activity monitoring
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className='flex items-center justify-center gap-3 py-8'>
              <Loader2 className='w-6 h-6 animate-spin text-primary' />
              <span className="text-gray-600 font-medium">Loading marshal data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className='flex items-center gap-3 text-red-700'>
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial Setup: Sector, Event, Lock */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Sector</label>
              <Select disabled={locked} value={sector ?? undefined} onValueChange={(v) => setSector(v)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder='Select Sector' />
                </SelectTrigger>
                <SelectContent>
                  {sectorOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-base">
                      <div className="flex items-center gap-2">
                        {o.icon}
                        {o.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Dynamic Event</label>
              <Select disabled={locked} value={event ?? undefined} onValueChange={(v) => setEvent(v)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder='Select Event' />
                </SelectTrigger>
                <SelectContent>
                  {eventOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-base">
                      <div className="flex items-center gap-2">
                        {o.icon}
                        {o.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Status</label>
              {!locked ? (
                <Button 
                  className='w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                  disabled={!sector || !event} 
                  onClick={() => setLocked(true)}
                >
                  <Lock className='mr-2 w-5 h-5' />
                  Lock Settings
                </Button>
              ) : (
                <Button 
                  variant='outline' 
                  className='w-full h-12 text-base font-semibold' 
                  onClick={() => {
                    setLocked(false)
                    setTeamId(null)
                    setRunNumber(null)
                    resetPenalties()
                    setShowSafetyButtons(false)
                    setPendingSafetyTeam(null)
                  }}
                >
                  <Unlock className='mr-2 w-5 h-5' />
                  Unlock
                </Button>
              )}
            </div>
          </div>
          
          {locked && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Settings Locked</p>
                  <p className="text-sm">
                    {selectedSector?.label} • {selectedEvent?.label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Logging Section - Only shown when locked */}
      {locked && (
        <Card className="shadow-lg border-gray-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Quick Logging
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Team and Run Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Team
                </label>
                <Select value={teamId ?? undefined} onValueChange={(v) => setTeamId(v)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder='Select Team' />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id} className="text-base">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{team.code}</Badge>
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Run Number
                </label>
                <Input
                  type='number'
                  min={1}
                  value={runNumber ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setRunNumber(val === '' ? null : Number(val))
                  }}
                  placeholder='Run #'
                  className='h-12 text-base'
                />
              </div>
            </div>

            {/* Penalties Section */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Penalties (applied with incidents)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">Cones</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => setCones(Math.max(0, cones - 1))}
                      disabled={cones === 0}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={cones}
                      onChange={(e) => setCones(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-10 text-center text-base font-semibold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => setCones(cones + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">Off Course</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => setOffCourse(Math.max(0, offCourse - 1))}
                      disabled={offCourse === 0}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={offCourse}
                      onChange={(e) => setOffCourse(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-10 text-center text-base font-semibold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => setOffCourse(offCourse + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">DSQ</label>
                  <Button
                    variant={dsq ? "default" : "outline"}
                    className={`w-full h-10 ${dsq ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    onClick={() => setDsq(!dsq)}
                  >
                    {dsq ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    {dsq ? 'DSQ' : 'No DSQ'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Incident Buttons */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Incidents
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Button
                  className='h-14 text-base font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                  onClick={() => logIncidentWithPenalties('DOO')}
                  disabled={!teamId || runNumber === null || logging || showSafetyButtons}
                >
                  DOO
                </Button>
                <Button
                  className='h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  onClick={() => logIncidentWithPenalties('OOC')}
                  disabled={!teamId || runNumber === null || logging || showSafetyButtons}
                >
                  OOC
                </Button>
                <Button
                  className='h-14 text-base font-bold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  onClick={handleSafetyConcern}
                  disabled={!teamId || runNumber === null || logging || showSafetyButtons}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Safety
                </Button>
              </div>
              
              {/* Safety Concern Buttons */}
              {showSafetyButtons && (
                <Card className="border-red-200 bg-red-50 mt-4">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-red-800 font-semibold">
                        <Shield className="w-5 h-5" />
                        Safety Concern for {selectedTeam?.code}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          className='h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 font-bold'
                          onClick={() => escalateSafety('minor')}
                          disabled={logging}
                        >
                          Minor
                        </Button>
                        <Button
                          className='h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 font-bold'
                          onClick={() => escalateSafety('critical')}
                          disabled={logging}
                        >
                          Critical
                        </Button>
                        <Button
                          className='h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 font-bold'
                          onClick={clearSafety}
                          disabled={logging}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Track Entry/Exit (Only for Start/Finish) */}
            {sector === 'Start/Finish' && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Track Entry/Exit
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className='h-14 text-base font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    onClick={() => logTrackActivity('entry')}
                    disabled={!teamId || logging}
                  >
                    <LogIn className='w-5 h-5 mr-2' />
                    ENTRY
                  </Button>
                  <Button
                    className='h-14 text-base font-bold bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                    onClick={() => logTrackActivity('exit')}
                    disabled={!teamId || logging}
                  >
                    <LogOut className='w-5 h-5 mr-2' />
                    EXIT
                  </Button>
                </div>
              </div>
            )}

            {logging && (
              <div className="flex items-center justify-center gap-2 text-gray-600 pt-2">
                <Loader2 className='w-5 h-5 animate-spin' />
                <span className="font-medium">Processing...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Incidents */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent Incidents (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className='space-y-3'>
            {incidents.map((inc) => (
              <Card key={inc.id} className="border-gray-200 hover:border-gray-300 transition-colors">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 font-medium">Team:</span>
                      <Badge variant="outline" className="ml-2">{inc.team_code ?? inc.team_id}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Type:</span>
                      <span className="ml-2 font-semibold">{inc.incident_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Sector:</span>
                      <span className="ml-2">{inc.sector}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Time:</span>
                      <span className="ml-2">{new Date(inc.occurred_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {incidents.length === 0 && (
              <div className='text-gray-500 p-8 text-center'>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No incidents logged in the past 24 hours
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Track Activity */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live Track Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {liveTeams.map((entry) => (
              <Card key={entry.id} className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-sm font-bold">{entry.team_code ?? entry.team_id}</Badge>
                      <Badge className="bg-green-500">{entry.event}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Sector:</span> {entry.sector}
                    </div>
                    <div className="text-xs text-gray-500">
                      Since: {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {liveTeams.length === 0 && (
              <div className='text-gray-500 p-8 text-center col-span-full'>
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No teams on track right now
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
