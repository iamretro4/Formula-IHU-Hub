'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'  // Import Input here
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertTriangle, Play, LogIn, LogOut } from 'lucide-react'
import { Database } from '@/lib/types/database'

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
  action: string // entry/exit
  timestamp: string
}

const sectorOptions = [
  { value: 'Start/Finish', label: 'Start/Finish' },
  { value: 'S1', label: 'Sector S1' },
  { value: 'S2', label: 'Sector S2' },
  { value: 'S3', label: 'Sector S3' },
]
const eventOptions = [
  { value: 'skidpad', label: 'Skidpad' },
  { value: 'acceleration', label: 'Acceleration' },
  { value: 'autocross', label: 'Autocross' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'practice', label: 'Practice Area' },
]

type UserProfile = {
  id: string
  email?: string
  app_role?: string
}

export default function MarshalAndLiveTrackPage() {
  const supabase = useMemo(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])
  const effectRunIdRef = useRef(0)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [sector, setSector] = useState<string | null>(null)
  const [event, setEvent] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [runNumber, setRunNumber] = useState<number | null>(null)
  const [incidents, setIncidents] = useState<TrackIncident[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logging, setLogging] = useState(false)
  const [showSafetyButtons, setShowSafetyButtons] = useState(false)
  const [pendingSafetyTeam, setPendingSafetyTeam] = useState<string | null>(null)
  const [trackEntries, setTrackEntries] = useState<TrackEntry[]>([])
  const [liveTeams, setLiveTeams] = useState<TrackEntry[]>([])

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
        }
      } finally {
        if (active && currentRunId === effectRunIdRef.current) {
          setIsLoading(false)
        }
      }
    }
    loadData()
    return () => { active = false }
  }, [supabase])

  async function loadIncidents() {
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
  }

  async function loadEntries() {
    const since = new Date()
    since.setDate(since.getDate() - 1)
    const { data } = await supabase
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
  }

  async function quickLog(type: string) {
    if (!user || !locked || !sector || !event || !teamId || runNumber === null) return
    setLogging(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      await (supabase.from('track_incidents') as any).insert({
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
      await loadIncidents()
     } catch (err: unknown) {
       const error = err instanceof Error ? err : new Error('Unknown error')
       setError(error.message ?? 'Failed to log incident.')
    } finally {
      setLogging(false)
    }
  }

  async function escalateSafety(type: 'minor' | 'critical') {
    if (!user || !locked || !sector || !event || !pendingSafetyTeam || runNumber === null) return
    setLogging(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      await (supabase.from('track_incidents') as any).insert({
        team_id: pendingSafetyTeam,
        marshal_id: user.id,
        incident_type: 'Safety',
        sector,
        occurred_at: now,
        severity: type,
        description: `Safety concern set to ${type}`,
        run_number: runNumber,
      })
      setShowSafetyButtons(false)
      setPendingSafetyTeam(null)
      setTeamId(null)
      setRunNumber(null)
      await loadIncidents()
     } catch (err: unknown) {
       const error = err instanceof Error ? err : new Error('Unknown error')
       setError(error.message ?? 'Failed to log safety concern.')
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
      const { data } = await supabase
        .from('track_incidents')
        .select('id')
        .eq('team_id', pendingSafetyTeam)
        .eq('sector', sector)
        .eq('incident_type', 'Safety')
        .order('occurred_at', { ascending: false })
        .limit(1)
      if (data?.[0]) {
        await (supabase.from('track_incidents') as any).delete().eq('id', (data[0] as any).id)
      }
      setShowSafetyButtons(false)
      setPendingSafetyTeam(null)
      setTeamId(null)
      setRunNumber(null)
      await loadIncidents()
     } catch (err: unknown) {
       const error = err instanceof Error ? err : new Error('Unknown error')
       setError(error.message ?? 'Failed to clear safety concern.')
    } finally {
      setLogging(false)
    }
  }

  async function logTrackActivity(action: 'entry' | 'exit') {
    if (!user || !teamId || !event || !sector) return
    setLogging(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      await (supabase.from('track_activity_log') as any).insert({
        team_id: teamId,
        event,
        sector,
        action,
        timestamp: now,
        marshal_id: user.id,
      })
      await loadEntries()
     } catch (err: unknown) {
       const error = err instanceof Error ? err : new Error('Unknown error')
       setError(error.message ?? 'Failed to log track entry/exit')
    } finally {
      setLogging(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      loadEntries()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='p-6 max-w-6xl mx-auto space-y-8'>
      <h1 className='text-2xl font-bold mb-2'>Track Marshal Console + Live Track Activity</h1>
      <p className='text-gray-500 mb-5'>
        Incident, Safety, ENTRY/EXIT logging. Live Activity is visible to all. Entry/Exit only appears when sector is Start/Finish.
      </p>
      {isLoading && (
        <div className='flex items-center gap-2'>
          <Loader2 className='animate-spin' />
          Loading...
        </div>
      )}
      {error && (
        <div className='text-red-600'>
          <AlertTriangle /> {error}
        </div>
      )}
      <div className='flex gap-4 mb-4'>
        <Select disabled={locked} value={sector ?? undefined} onValueChange={(v) => setSector(v)}>
          <SelectTrigger>
            <SelectValue placeholder='Select Sector' />
          </SelectTrigger>
          <SelectContent>
            {sectorOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select disabled={locked} value={event ?? undefined} onValueChange={(v) => setEvent(v)}>
          <SelectTrigger>
            <SelectValue placeholder='Select Dynamic Event' />
          </SelectTrigger>
          <SelectContent>
            {eventOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type='number'
          min={1}
          disabled={locked}
          value={runNumber ?? ''}
          onChange={(e) => {
            const val = e.target.value
            setRunNumber(val === '' ? null : Number(val))
          }}
          placeholder='Run Number'
          className='w-24'
        />
        {!locked && (
          <Button className='ml-2' disabled={!sector || !event} onClick={() => setLocked(true)}>
            <Play className='mr-1' />
            Lock
          </Button>
        )}
        {locked && (
          <Button variant='secondary' className='ml-2' onClick={() => setLocked(false)}>
            Unlock
          </Button>
        )}
      </div>
      {locked && (
        <Card>
          <CardHeader>
            <CardTitle>Log Incident / Track Entry/Exit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex gap-3 items-center'>
              <Select value={teamId ?? undefined} onValueChange={(v) => setTeamId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder='Select Team' />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.code} - {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className='bg-yellow-200 text-yellow-900 font-semibold'
                onClick={() => quickLog('DOO')}
                disabled={!teamId || logging || showSafetyButtons}
              >
                DOO
              </Button>
              <Button
                className='bg-blue-200 text-blue-900 font-semibold'
                onClick={() => quickLog('OOC')}
                disabled={!teamId || logging || showSafetyButtons}
              >
                OOC
              </Button>
              <Button
                className='bg-red-200 text-red-900 font-semibold'
                onClick={() => quickLog('Safety')}
                disabled={!teamId || logging || showSafetyButtons}
              >
                Safety Concern
              </Button>
              {sector === 'Start/Finish' && (
                <>
                  <Button
                    className='bg-lime-200 text-lime-800 font-semibold'
                    onClick={() => logTrackActivity('entry')}
                    disabled={!teamId || logging}
                  >
                    Log ENTRY <LogIn className='ml-1 inline h-4' />
                  </Button>
                  <Button
                    className='bg-gray-200 text-gray-800 font-semibold'
                    onClick={() => logTrackActivity('exit')}
                    disabled={!teamId || logging}
                  >
                    Log EXIT <LogOut className='ml-1 inline h-4' />
                  </Button>
                </>
              )}
            </div>
            {logging && <Loader2 className='animate-spin ml-2' />}
            {showSafetyButtons && (
              <div className='flex gap-4 mt-4'>
                <Button
                  className='bg-yellow-300 text-yellow-900 font-bold'
                  onClick={() => escalateSafety('minor')}
                  disabled={logging}
                >
                  Minor
                </Button>
                <Button
                  className='bg-orange-300 text-orange-900 font-bold'
                  onClick={() => escalateSafety('critical')}
                  disabled={logging}
                >
                  Severe
                </Button>
                <Button
                  className='bg-green-200 text-green-800 font-bold'
                  onClick={clearSafety}
                  disabled={logging}
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className='mt-8'>
        <h2 className='text-lg font-bold mb-2'>Logged Incidents (Past 24h)</h2>
        <div className='space-y-3'>
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <CardContent>
                <div>
                  <b>Team:</b> {inc.team_code ?? inc.team_id}
                </div>
                <div>
                  <b>Incident Type:</b> {inc.incident_type}
                </div>
                <div>
                  <b>Sector:</b> {inc.sector}
                </div>
                <div>
                  <b>Severity:</b> {inc.severity}
                </div>
                <div>
                  <b>Logged At:</b> {new Date(inc.occurred_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
          {incidents.length === 0 && (
            <div className='text-gray-500 p-8 text-center'>No incidents logged today.</div>
          )}
        </div>
      </div>
      <div className='mt-8'>
        <h2 className='text-lg font-bold mb-2'>Live Track Activity (On-Track Teams)</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {liveTeams.map((entry) => (
            <Card key={entry.id}>
              <CardContent>
                <div>
                  <b>Team:</b> {entry.team_code ?? entry.team_id}
                </div>
                <div>
                  <b>Event:</b> {entry.event}
                </div>
                <div>
                  <b>Sector:</b> {entry.sector}
                </div>
                <div>
                  <b>Active Since:</b> {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          ))}
          {liveTeams.length === 0 && (
            <div className='text-gray-500 p-8 text-center'>No teams on track right now.</div>
          )}
        </div>
      </div>
    </div>
  )
}
