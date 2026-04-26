'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ShieldAlert, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Car,
  MapPin,
  RefreshCw,
  BellRing,
  Volume2,
  VolumeX
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow, parseISO } from 'date-fns'

type TrackIncident = {
  id: string
  team_id: string
  marshal_id?: string
  sector?: string
  incident_type: string
  severity: string
  occurred_at: string
  description?: string
  teams?: { code: string; name: string }
}

export default function SafetyDashboardPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [incidents, setIncidents] = useState<TrackIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const effectRunIdRef = useRef(0)

  const playAlarm = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); 
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.2); 
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("AudioContext play failed", e);
    }
  }, [audioEnabled])

  // Request notification permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const since = new Date()
      since.setHours(since.getHours() - 12) // Last 12 hours

      const { data, error: fetchError } = await supabase
        .from('track_incidents')
        .select(`
          id,
          team_id,
          marshal_id,
          sector,
          incident_type,
          severity,
          occurred_at,
          description,
          teams:team_id (code, name)
        `)
        .eq('incident_type', 'Safety')
        .gte('occurred_at', since.toISOString())
        .order('occurred_at', { ascending: false })
      
      if (fetchError) throw fetchError

      setIncidents((data as unknown as TrackIncident[]) || [])
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error('Unknown error')
      setError(e.message || 'Failed to fetch safety incidents')
      toast.error('Failed to load safety data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const currentRunId = ++effectRunIdRef.current
    
    // Initial fetch
    fetchIncidents()

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'track_incidents',
          filter: "incident_type=eq.Safety"
        },
        (payload) => {
          // Play sound and show notification
          if (typeof window !== 'undefined') {
            playAlarm()

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('NEW SAFETY INCIDENT', {
                body: `A new safety concern has been reported!`,
                icon: '/favicon.ico'
              })
            }
          }
          toast.error('NEW SAFETY INCIDENT DETECTED!', { duration: 10000, icon: '🚨' })
          
          // Re-fetch to get joins (like team name)
          fetchIncidents()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'track_incidents',
        },
        () => {
          fetchIncidents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchIncidents])

  const acknowledgeIncident = async (id: string) => {
    try {
      const { error } = await supabase
        .from('track_incidents')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Safety incident cleared')
      setIncidents(incidents.filter(inc => inc.id !== id))
    } catch (err) {
      toast.error('Failed to clear incident')
    }
  }

  // Force re-render relative times every minute
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  const activeCritical = incidents.filter(i => i.severity === 'critical')
  const isEmergency = activeCritical.length > 0

  // Loop alarm if emergency active
  useEffect(() => {
    if (!isEmergency || !audioEnabled) return;
    const interval = setInterval(() => {
      playAlarm();
    }, 2000);
    return () => clearInterval(interval);
  }, [isEmergency, audioEnabled, playAlarm]);

  return (
    <div className={`p-4 sm:p-6 md:p-8 transition-colors duration-500 ${isEmergency ? 'bg-red-50' : 'bg-gray-50'}`}>
      {isEmergency && <div className="fixed inset-0 pointer-events-none bg-red-600/20 animate-pulse z-[100]" />}
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${
              isEmergency ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {isEmergency ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
                Safety <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.3em] leading-none">
                Emergency Services & Race Control Matrix
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEmergency && (
              <Badge variant="destructive" className="bg-red-500 text-white text-[8px] px-3 py-1 uppercase tracking-widest font-black animate-pulse shadow-lg border-0">
                Active Emergency
              </Badge>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                setAudioEnabled(!audioEnabled)
                if (!audioEnabled) {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = audioCtx.createOscillator();
                  osc.connect(audioCtx.destination);
                  osc.start(); osc.stop(audioCtx.currentTime + 0.1);
                  toast.success('Audio alarms enabled');
                }
              }}
              className={`gap-2 rounded-xl h-9 px-3 ${!audioEnabled && 'opacity-50'}`}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
              <span className="font-bold uppercase text-[9px] tracking-widest">{audioEnabled ? 'On' : 'Off'}</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchIncidents} 
              disabled={loading} 
              className="gap-2 rounded-xl h-9 px-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <p className="font-semibold">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {loading && incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
            <p className="text-xl font-medium">Connecting to track telemetry...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 bg-white rounded-xl border border-dashed shadow-sm">
            <ShieldAlert className="w-16 h-16 mb-4 text-green-500/50" />
            <p className="text-2xl font-medium text-gray-700">Track is Clear</p>
            <p className="text-gray-500 mt-2">No active safety incidents reported in the last 12 hours.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incidents.map((incident) => {
              const isCritical = incident.severity === 'critical'
              const teamCode = incident.teams ? Array.isArray(incident.teams) ? incident.teams[0]?.code : incident.teams.code : 'Unknown'
              const teamName = incident.teams ? Array.isArray(incident.teams) ? incident.teams[0]?.name : incident.teams.name : 'Unknown Team'
              
              return (
                <Card 
                  key={incident.id} 
                  className={`overflow-hidden shadow-lg border-gray-200 transition-all duration-300 hover:-translate-y-1 ${
                    isCritical ? 'hover:shadow-red-500/10' : 'hover:shadow-amber-500/10'
                  }`}
                >
                  <CardHeader className={`border-b border-gray-200 ${isCritical ? 'bg-gradient-to-r from-red-50 to-orange-50' : 'bg-gradient-to-r from-amber-50 to-yellow-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">
                            {isCritical ? 'Critical' : 'Minor'}
                          </CardTitle>
                          <CardDescription className={`text-xs font-semibold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                            {isCritical ? 'Emergency Response' : 'Safety Advisory'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-bold text-xs">
                        {teamCode}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <Car className={`w-5 h-5 mt-0.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Team</p>
                        <p className="text-lg font-bold text-gray-900">{teamName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <MapPin className={`w-5 h-5 mt-0.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Location</p>
                        <p className="text-lg font-bold text-gray-900">{incident.sector || 'Unknown Sector'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className={`w-5 h-5 mt-0.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Time</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatDistanceToNow(parseISO(incident.occurred_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {incident.description && (
                      <div className="pt-2 border-t border-gray-200/50">
                        <p className="text-sm text-gray-700 italic">{incident.description}</p>
                      </div>
                    )}

                    <Button 
                      className="w-full mt-4 font-bold" 
                      variant={isCritical ? "destructive" : "default"}
                      onClick={() => acknowledgeIncident(incident.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Clear Incident
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
