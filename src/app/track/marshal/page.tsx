'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Activity,
  History
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
  const [runNumber, setRunNumber] = useState<number | null>(1)
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

  // Auto-lock when both sector and event are selected
  useEffect(() => {
    if (sector && event && !locked) {
      setLocked(true)
      toast.success('Setup locked. Ready to log incidents.')
    }
  }, [sector, event, locked])

  function resetPenalties() {
    setCones(0)
    setOffCourse(0)
    setDsq(false)
  }

  async function logIncidentWithPenalties(type: string, targetTeamId?: string, targetRunNumber?: number, c?: number, o?: number, d?: boolean) {
    const tid = targetTeamId || teamId
    const rid = targetRunNumber || runNumber
    const conesVal = c !== undefined ? c : cones
    const offVal = o !== undefined ? o : offCourse
    const dsqVal = d !== undefined ? d : dsq

    if (!user || !locked || !sector || !event || !tid || rid === null) {
      toast.error('Please select team and run number')
      return
    }
    setLogging(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      
      // Build penalties object
      const penalties: any = {}
      if (conesVal > 0) penalties.cones = conesVal
      if (offVal > 0) penalties.off_course = offVal
      if (dsqVal) penalties.dsq = true
      
      // Log the incident
      const { error: incidentError } = await (supabase.from('track_incidents') as any).insert({
        team_id: tid,
        marshal_id: user.id,
        incident_type: type,
        sector,
        occurred_at: now,
        severity: type === 'Safety' ? 'critical' : 'minor',
        description: type === 'Safety' ? 'Safety concern reported' : '',
        action_taken: '',
        run_number: rid,
      })
      
      if (incidentError) throw incidentError
      
      // Log/update penalties in dynamic_event_runs
      if (conesVal > 0 || offVal > 0 || dsqVal) {
        // Check if run exists
        const { data: existingRun } = await supabase
          .from('dynamic_event_runs')
          .select('id, penalties')
          .eq('team_id', tid)
          .eq('event_type', event as 'acceleration' | 'skidpad' | 'autocross' | 'endurance')
          .eq('run_number', rid)
          .single()
        
        if (existingRun) {
          // Update existing run - merge penalties
          const existingPenalties = (existingRun.penalties || {}) as Record<string, any>
          const updatedPenalties = {
            ...existingPenalties,
            cones: (existingPenalties.cones || 0) + (conesVal || 0),
            off_course: (existingPenalties.off_course || 0) + (offVal || 0),
            dsq: existingPenalties.dsq || dsqVal || false
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
              team_id: tid,
              event_type: event as 'acceleration' | 'skidpad' | 'autocross' | 'endurance',
              run_number: rid,
              penalties: {
                cones: conesVal,
                off_course: offVal,
                dsq: dsqVal
              },
              status: dsqVal ? 'dsq' : 'completed',
              recorded_by: user.id,
            })
          
          if (insertError) throw insertError
        }
      }
      
      // Notify Discord
      try {
        await fetch('/api/discord/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: type === 'Safety' ? 'safety' : 'penalty',
            title: type === 'Safety' ? '🚨 SAFETY INCIDENT' : '⚠️ TRACK PENALTY',
            color: type === 'Safety' ? 16711680 : 16753920,
            fields: [
              { name: 'Team', value: teams.find(t => t.id === tid)?.code || 'Unknown', inline: true },
              { name: 'Event', value: event, inline: true },
              { name: 'Sector', value: sector, inline: true },
              { name: 'Type', value: type, inline: true },
              { name: 'Run #', value: rid.toString(), inline: true },
              { name: 'Cones/Off', value: `${conesVal} / ${offVal}`, inline: true },
              { name: 'DSQ', value: dsqVal ? 'Yes' : 'No', inline: true },
            ]
          })
        })
      } catch (e) {
        logger.error('Failed to notify discord', e)
      }
      
      toast.success(`${type} logged for Team ${teams.find(t => t.id === tid)?.code}`)
      await loadIncidents()
      resetPenalties()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message ?? 'Failed to log incident.')
      toast.error(error.message ?? 'Failed to log incident.')
    } finally {
      setLogging(false)
    }
  }

  async function handleQuickAction(action: 'DOO+1' | 'OOC+1' | 'DSQ') {
    if (!teamId || runNumber === null) {
      toast.error('Select team and run first')
      return
    }

    if (action === 'DOO+1') {
      await logIncidentWithPenalties('DOO', teamId, runNumber, 1, 0, false)
    } else if (action === 'OOC+1') {
      await logIncidentWithPenalties('OOC', teamId, runNumber, 0, 1, false)
    } else if (action === 'DSQ') {
      await logIncidentWithPenalties('OTHER', teamId, runNumber, 0, 0, true)
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
      
      // Notify Discord for escalated safety
      try {
        await fetch('/api/discord/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'safety',
            title: `🚨 SAFETY ESCALATION: ${type.toUpperCase()}`,
            color: type === 'critical' ? 16711680 : 16753920,
            fields: [
              { name: 'Team', value: teams.find(t => t.id === pendingSafetyTeam)?.code || 'Unknown', inline: true },
              { name: 'Event', value: event, inline: true },
              { name: 'Sector', value: sector, inline: true },
            ]
          })
        })
      } catch (e) {
        logger.error('Failed to notify discord', e)
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50/50 min-h-screen animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
            Marshal <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Console</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.3em] leading-none">
            Rapid Incident Logging &amp; Activity Vector
          </p>
        </div>
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
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Initialization Phase
          </CardTitle>
          <CardDescription>
            Assign Sector & Dynamic Protocol
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Sector</label>
              <Select disabled={locked} value={sector || ''} onValueChange={(v) => setSector(v)}>
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
              <Select disabled={locked} value={event || ''} onValueChange={(v) => setEvent(v)}>
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
                <div className="flex h-12 items-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3">
                  Select Sector and Event to begin
                </div>
              ) : (
                <Button 
                  variant='outline' 
                  className='w-full h-12 text-base font-semibold' 
                  onClick={() => {
                    setLocked(false)
                    setSector(null)
                    setEvent(null)
                    setTeamId(null)
                    setRunNumber(1)
                    resetPenalties()
                    setShowSafetyButtons(false)
                    setPendingSafetyTeam(null)
                  }}
                >
                  <Unlock className='mr-2 w-5 h-5' />
                  Edit Setup
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
            {/* Team Selection Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Select Team
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">Run</label>
                  <Input
                    type='number'
                    min={1}
                    value={runNumber ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setRunNumber(val === '' ? null : Number(val))
                    }}
                    placeholder='#'
                    className='h-8 w-16 text-center text-sm'
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1 pr-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setTeamId(team.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      teamId === team.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold text-lg text-indigo-700">#{team.code}</span>
                    <span className="text-xs text-gray-500 font-medium truncate w-full text-center mt-1">
                      {team.name}
                    </span>
                  </button>
                ))}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  className='h-14 text-base font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                  onClick={() => handleQuickAction('DOO+1')}
                  disabled={!teamId || runNumber === null || logging}
                >
                  DOO (+1 Cone)
                </Button>
                <Button
                  className='h-14 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  onClick={() => handleQuickAction('OOC+1')}
                  disabled={!teamId || runNumber === null || logging}
                >
                  OOC (+1 Off)
                </Button>
                <Button
                  className='h-14 text-base font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-red-700 hover:to-red-800'
                  onClick={() => handleQuickAction('DSQ')}
                  disabled={!teamId || runNumber === null || logging}
                >
                  DSQ (Quick)
                </Button>
                <Button
                  className='h-14 text-base font-bold bg-gradient-to-r from-red-600 to-red-800 hover:from-red-800 hover:to-red-900 shadow-md'
                  onClick={() => logIncidentWithPenalties('Safety', teamId!, runNumber!)}
                  disabled={!teamId || runNumber === null || logging}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  SAFETY!
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
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Incidents
          </CardTitle>
          <CardDescription>
            Chronological track activity log
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="space-y-2">
              {incidents.map((inc) => (
                <div 
                  key={inc.id} 
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Team</span>
                      <Badge variant="outline" className="font-bold text-xs">{inc.team_code ?? inc.team_id}</Badge>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Type</span>
                      <span className="text-sm font-black text-slate-900 leading-none">{inc.incident_type}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sector</span>
                      <span className="text-sm font-bold text-slate-600 leading-none">{inc.sector}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 block">Time</span>
                    <span className="text-sm font-mono font-medium text-slate-500">
                      {new Date(inc.occurred_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {incidents.length === 0 && (
                <div className='text-gray-500 p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200'>
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No incidents logged in the past 24 hours
                </div>
              )}
            </div>
        </CardContent>
      </Card>

      {/* Live Track Activity */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live Track Activity
          </CardTitle>
          <CardDescription>
            Real-time active teams on course
          </CardDescription>
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
