'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2,
  Scale,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Shield,
  FileText,
  Edit2,
  Trash2,
  Eye,
  Download,
  Calendar,
  Users,
  Activity,
  Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/utils/logger'
import { DateTime } from 'luxon'

const PENALTY_TYPES = [
  { key: 'time_penalty', label: 'Time Penalty (seconds)', icon: Clock },
  { key: 'points_deduction', label: 'Points Deduction', icon: Minus },
  { key: 'dsq', label: 'Disqualification (DSQ)', icon: XCircle },
]

const INCIDENT_TYPES = [
  { value: 'DOO', label: 'Down or Out', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'OOC', label: 'Off Course', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-300' },
]

const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'major', label: 'Major', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' },
]

const DYNAMIC_EVENTS = [
  { value: 'acceleration', label: 'Acceleration', icon: Zap },
  { value: 'skidpad', label: 'Skidpad', icon: Activity },
  { value: 'autocross', label: 'Autocross', icon: Zap },
  { value: 'endurance', label: 'Endurance', icon: Clock },
]

type PenaltyRule = {
  id: string
  name: string
  event_type: string
  incident_type: string
  penalty_type: string
  penalty_value: number
  max_count: number
  active: boolean
  description?: string
  created_at?: string
  rule_type?: string
  condition?: any
  penalty_unit?: string
}

type TrackIncident = {
  id: string
  occurred_at: string
  team_id: string
  marshal_id?: string
  sector?: string
  incident_type?: string
  severity?: string
  description?: string
  action_taken?: string
  coordinates?: unknown
  weather_impact?: boolean
  session_id?: string
  team?: { code?: string; name?: string } | null
  marshal?: { first_name?: string; last_name?: string } | null
}

export default function PenaltyManagementPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const router = useRouter()
  const effectRunIdRef = useRef(0)
  const [activeTab, setActiveTab] = useState<'rules' | 'create' | 'review'>('rules')
  const [rules, setRules] = useState<PenaltyRule[]>([])
  const [incidents, setIncidents] = useState<TrackIncident[]>([])
  const [allIncidents, setAllIncidents] = useState<TrackIncident[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [selectedIncident, setSelectedIncident] = useState<TrackIncident | null>(null)
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false)

  const [newRule, setNewRule] = useState({
    name: '',
    event_type: DYNAMIC_EVENTS[0].value,
    incident_type: INCIDENT_TYPES[0].value,
    penalty_type: PENALTY_TYPES[0].key,
    penalty_value: 0,
    max_count: 1,
    active: true,
    description: '',
  })

  const loadData = useCallback(async (isRefresh = false) => {
    const currentRunId = ++effectRunIdRef.current
    let active = true

    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!active || currentRunId !== effectRunIdRef.current) return
      
      if (!user) {
        router.push('/auth/signin')
        return
      }

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('app_role')
          .eq('id', user.id)
          .single() as { data: { app_role: string } | null; error: any }
        
        if (profileError) {
          logger.error('Failed to load user profile', profileError, { context: 'penalty_management' })
          toast.error('Failed to load your profile')
          router.push('/dashboard')
          return
        }
        
        if (!profile || !['admin', 'scrutineer'].includes(profile.app_role || '')) {
          router.push('/dashboard')
          return
        }
        
        if (active && currentRunId === effectRunIdRef.current) {
          setUserRole(profile.app_role)
        }
      }

      // Load penalty rules
      const { data: penaltyRules, error: rulesError } = await supabase
        .from('penalty_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (rulesError) throw rulesError

      // Transform to match PenaltyRule type
      const transformedRules: PenaltyRule[] = (penaltyRules || []).map((rule: any) => ({
        id: rule.id,
        name: rule.name || rule.rule_type || 'Unnamed Rule',
        event_type: rule.event_type || '',
        incident_type: rule.incident_type || '',
        penalty_type: rule.penalty_type || rule.rule_type || '',
        penalty_value: rule.penalty_value || 0,
        max_count: rule.max_count || 0,
        active: rule.active ?? true,
        description: rule.description,
        created_at: rule.created_at,
        rule_type: rule.rule_type,
        condition: rule.condition,
        penalty_unit: rule.penalty_unit,
      }))

      // Fetch incidents with team join (marshal_id references auth.users, not user_profiles, so we can't join it directly)
      const { data: trackIncidents, error: incidentsError } = await supabase
        .from('track_incidents')
        .select(
          `id, occurred_at, team_id, marshal_id, sector, incident_type, severity, description, action_taken, coordinates, weather_impact, session_id, 
          teams:team_id(code, name)`
        )
        .order('occurred_at', { ascending: false })
        .limit(100)

      if (incidentsError) throw incidentsError

      // Fetch marshal info separately if we have marshal IDs
      const marshalIds = [...new Set((trackIncidents || []).map((incident: any) => incident.marshal_id).filter(Boolean))]
      let marshalMap: Record<string, { first_name?: string; last_name?: string }> = {}
      
      if (marshalIds.length > 0) {
        const { data: marshals } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', marshalIds)
        
        if (marshals) {
          marshals.forEach((marshal: any) => {
            marshalMap[marshal.id] = {
              first_name: marshal.first_name,
              last_name: marshal.last_name,
            }
          })
        }
      }

      // Transform the data to match TrackIncident type
      const transformedIncidents: TrackIncident[] = (trackIncidents || []).map((incident: any) => ({
        id: incident.id,
        occurred_at: incident.occurred_at,
        team_id: incident.team_id,
        marshal_id: incident.marshal_id,
        sector: incident.sector,
        incident_type: incident.incident_type,
        severity: incident.severity,
        description: incident.description,
        action_taken: incident.action_taken,
        coordinates: incident.coordinates,
        weather_impact: incident.weather_impact,
        session_id: incident.session_id,
        team: Array.isArray(incident.teams) ? incident.teams[0] : incident.teams,
        marshal: incident.marshal_id ? marshalMap[incident.marshal_id] || null : null,
      }))

      if (!active || currentRunId !== effectRunIdRef.current) return

      if (active && currentRunId === effectRunIdRef.current) {
        setRules(transformedRules)
        setAllIncidents(transformedIncidents)
        setIncidents(transformedIncidents)
        setError(null)
        if (isRefresh) {
          toast.success('Data refreshed successfully')
        }
      }
    } catch (e: unknown) {
      if (active && currentRunId === effectRunIdRef.current) {
        const error = e instanceof Error ? e : new Error('Unknown error')
        setError(error.message || 'Failed to load data')
        toast.error(`Failed to load data: ${error.message}`)
        logger.error('[Penalty Management] Error loading data', e)
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

  // Filter incidents
  useEffect(() => {
    let filtered = allIncidents

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (incident) =>
          incident.team?.code?.toLowerCase().includes(query) ||
          incident.team?.name?.toLowerCase().includes(query) ||
          incident.incident_type?.toLowerCase().includes(query) ||
          incident.description?.toLowerCase().includes(query) ||
          incident.sector?.toLowerCase().includes(query)
      )
    }

    // Note: event_type is not available on track_incidents, so we skip this filter
    // if (eventFilter !== 'all') {
    //   filtered = filtered.filter((incident) => incident.event_type === eventFilter)
    // }

    if (incidentTypeFilter !== 'all') {
      filtered = filtered.filter((incident) => incident.incident_type === incidentTypeFilter)
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter((incident) => incident.severity === severityFilter)
    }

    setIncidents(filtered)
  }, [allIncidents, searchQuery, incidentTypeFilter, severityFilter])

  const stats = useMemo(() => {
    return {
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.active).length,
      totalIncidents: allIncidents.length,
      safetyIncidents: allIncidents.filter((i) => i.severity === 'critical').length, // Critical incidents are typically safety-related
      criticalIncidents: allIncidents.filter((i) => i.severity === 'critical').length,
    }
  }, [rules, allIncidents])

  async function applyPenalties() {
    if (!confirm('Are you sure you want to apply penalties to runs? This action cannot be undone.')) return
    setIsApplying(true)
    setError(null)
    try {
      // Check if the function exists, if not, implement client-side logic
      const { data, error } = await supabase.rpc('apply_penalties_to_runs' as any)
      
      if (error) {
        // If function doesn't exist, implement client-side penalty calculation
        if (error.code === '42883' || error.message?.includes('does not exist')) {
          logger.warn('[Penalty Management] RPC function not found, applying penalties client-side', { context: 'penalty_management' })
          
          // Get all runs that need penalty calculation
          const { data: runs, error: runsError } = await supabase
            .from('dynamic_event_runs')
            .select('id, team_id, event_type, run_number, raw_time, penalties, corrected_time')
            .not('raw_time', 'is', null)
          
          if (runsError) throw runsError
          
          if (!runs || runs.length === 0) {
            toast('No runs found to apply penalties to')
            return
          }
          
          // Apply penalties to each run
          let updated = 0
          for (const run of runs) {
            const penalties = (run.penalties as any) || {}
            let penaltyTime = 0
            
            // Calculate penalty time from penalties JSONB
            // Standard Formula Student penalties:
            // - Cones: typically 0.5 seconds per cone
            // - Off-course: typically 2 seconds per occurrence
            // - DSQ: disqualifies the run (corrected_time = null or very high)
            
            if (penalties.dsq) {
              // DSQ - set corrected_time to null or a very high value
              const { error: updateError } = await supabase
                .from('dynamic_event_runs')
                .update({ 
                  corrected_time: null,
                  status: 'dsq' as any
                })
                .eq('id', run.id)
              
              if (!updateError) updated++
              continue
            }
            
            // Calculate time penalties
            if (penalties.cones) {
              penaltyTime += (penalties.cones || 0) * 0.5 // 0.5 seconds per cone
            }
            if (penalties.off_course) {
              penaltyTime += (penalties.off_course || 0) * 2.0 // 2 seconds per off-course
            }
            
            // Apply penalty rules if they exist
            const applicableRules = rules.filter(r => 
              r.active && 
              r.event_type === run.event_type &&
              r.condition?.incident_type
            )
            
            // For now, we'll use the penalties JSONB field which is already set by marshals
            // The penalty rules system can be enhanced later to automatically apply based on incidents
            
            const correctedTime = (run.raw_time || 0) + penaltyTime
            
            const { error: updateError } = await supabase
              .from('dynamic_event_runs')
              .update({ 
                corrected_time: correctedTime > 0 ? correctedTime : null
              })
              .eq('id', run.id)
            
            if (!updateError) updated++
          }
          
          toast.success(`Penalties applied successfully to ${updated} runs`)
        } else {
          throw error
        }
      } else {
        toast.success('Penalties applied successfully')
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error')
      const errorMessage = error.message || 'Failed to apply penalties'
      setError(errorMessage)
      toast.error(`Failed to apply penalties: ${errorMessage}`)
      logger.error('[Penalty Management] Error applying penalties', e)
    } finally {
      setIsApplying(false)
    }
  }

  async function createPenaltyRule() {
    setLoading(true)
    setError(null)
    try {
      if (!newRule.name.trim()) {
        throw new Error('Rule name is required')
      }
      if (newRule.penalty_value <= 0 && newRule.penalty_type !== 'dsq') {
        throw new Error('Penalty value must be greater than 0')
      }

      const penaltyUnit =
        newRule.penalty_type === 'time_penalty'
          ? 'seconds'
          : newRule.penalty_type === 'points_deduction'
          ? 'points'
          : 'points'

      const { error } = await supabase.from('penalty_rules').insert({
        name: newRule.name,
        event_type: newRule.event_type,
        rule_type: newRule.penalty_type,
        condition: {
          incident_type: newRule.incident_type,
          max_count: newRule.max_count,
        },
        penalty_value: newRule.penalty_value,
        penalty_unit: penaltyUnit,
        active: newRule.active,
        description: newRule.description || null,
      } as any)

      if (error) {
        logger.error('Failed to create penalty rule', error, { context: 'penalty_management' })
        throw error
      }

      toast.success('Penalty rule created successfully')
      setNewRule({
        name: '',
        event_type: DYNAMIC_EVENTS[0].value,
        incident_type: INCIDENT_TYPES[0].value,
        penalty_type: PENALTY_TYPES[0].key,
        penalty_value: 0,
        max_count: 1,
        active: true,
        description: '',
      })

      // Reload rules
      await loadData(true)
    } catch (e: any) {
      const error = e instanceof Error ? e : new Error('Unknown error')
      setError(error.message || 'Failed to create penalty rule')
      toast.error(`Failed to create penalty rule: ${error.message}`)
      logger.error('[Penalty Management] Error creating rule', e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleRuleActive(id: string, current: boolean) {
    try {
      const { error } = await supabase.from('penalty_rules').update({ active: !current }).eq('id', id)
      if (error) throw error
      setRules(rules.map((r) => (r.id === id ? { ...r, active: !current } : r)))
      toast.success(`Rule ${!current ? 'activated' : 'deactivated'} successfully`)
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error')
      toast.error(`Failed to update rule status: ${error.message}`)
      logger.error('[Penalty Management] Error toggling rule', e)
    }
  }

  const formatDate = (date: string) => {
    return DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_MED)
  }

  const formatTimeAgo = (date: string) => {
    const dt = DateTime.fromISO(date)
    const now = DateTime.now()
    const diff = now.diff(dt, ['hours', 'minutes'])
    
    if (diff.hours >= 24) {
      return `${Math.floor(diff.hours / 24)}d ago`
    } else if (diff.hours >= 1) {
      return `${Math.floor(diff.hours)}h ago`
    } else {
      return `${Math.floor(diff.minutes)}m ago`
    }
  }

  const getIncidentTypeInfo = (type: string) => {
    return INCIDENT_TYPES.find((it) => it.value === type) || INCIDENT_TYPES[INCIDENT_TYPES.length - 1]
  }

  const getSeverityInfo = (severity: string) => {
    return SEVERITY_LEVELS.find((s) => s.value === severity) || SEVERITY_LEVELS[0]
  }

  const getEventInfo = (event: string) => {
    return DYNAMIC_EVENTS.find((e) => e.value === event) || { value: event, label: event, icon: Activity }
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading penalty management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Scale className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            Penalty Management
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Manage penalty rules and review track incidents
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          {userRole === 'admin' && (
            <Button onClick={applyPenalties} disabled={loading || isApplying} className="gap-2">
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Apply Penalties
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Rules</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalRules}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Rules</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeRules}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Incidents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalIncidents}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Safety Incidents</p>
                <p className="text-3xl font-bold text-red-600">{stats.safetyIncidents}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-sm">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Critical</p>
                <p className="text-3xl font-bold text-orange-600">{stats.criticalIncidents}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'rules' | 'create' | 'review')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules" className="gap-2">
            <FileText className="w-4 h-4" />
            Penalty Rules
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <Plus className="w-4 h-4" />
            Create Rule
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <Eye className="w-4 h-4" />
            Incident Review
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Active Penalty Rules
              </CardTitle>
              <CardDescription>
                Manage and configure penalty rules for track events
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {rules.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-medium text-lg mb-2">No penalty rules</p>
                  <p className="text-sm text-gray-400">Create your first penalty rule to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Rule Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Event</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Incident Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Penalty</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Max Count</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => {
                        const eventInfo = getEventInfo(rule.event_type)
                        const EventIcon = eventInfo.icon
                        return (
                          <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-medium text-gray-900">{rule.name || rule.rule_type}</p>
                                {rule.description && (
                                  <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge variant="outline" className="gap-1">
                                <EventIcon className="w-3 h-3" />
                                {eventInfo.label}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              {rule.condition?.incident_type && (
                                <Badge className={getIncidentTypeInfo(rule.condition.incident_type).color}>
                                  {getIncidentTypeInfo(rule.condition.incident_type).label}
                                </Badge>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant="outline"
                                className={
                                  rule.penalty_type === 'dsq'
                                    ? 'bg-red-50 text-red-700 border-red-300'
                                    : 'bg-gray-50 text-gray-700 border-gray-300'
                                }
                              >
                                {rule.penalty_unit === 'seconds'
                                  ? `+${rule.penalty_value}s`
                                  : rule.penalty_unit === 'points'
                                  ? `-${rule.penalty_value}pts`
                                  : rule.penalty_type === 'dsq'
                                  ? 'DSQ'
                                  : `${rule.penalty_value}`}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-gray-600">{rule.condition?.max_count || '-'}</td>
                            <td className="py-4 px-4">
                              <Badge
                                className={
                                  rule.active
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                                }
                              >
                                {rule.active ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1 inline" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleRuleActive(rule.id, rule.active)}
                                disabled={loading}
                                className="gap-1"
                              >
                                {rule.active ? (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Activate
                                  </>
                                )}
                              </Button>
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
        </TabsContent>

        {/* Create Rule Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Penalty Rule
              </CardTitle>
              <CardDescription>
                Define a new penalty rule for track events
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    type="text"
                    placeholder="e.g., Cone Penalty - Autocross"
                    value={newRule.name}
                    onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-type">Event Type *</Label>
                    <Select
                      value={newRule.event_type}
                      onValueChange={(v) => setNewRule((prev) => ({ ...prev, event_type: v }))}
                    >
                      <SelectTrigger id="event-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DYNAMIC_EVENTS.map((ev) => (
                          <SelectItem key={ev.value} value={ev.value}>
                            <div className="flex items-center gap-2">
                              <ev.icon className="w-4 h-4" />
                              {ev.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incident-type">Incident Type *</Label>
                    <Select
                      value={newRule.incident_type}
                      onValueChange={(v) => setNewRule((prev) => ({ ...prev, incident_type: v }))}
                    >
                      <SelectTrigger id="incident-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INCIDENT_TYPES.map((it) => (
                          <SelectItem key={it.value} value={it.value}>
                            {it.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="penalty-type">Penalty Type *</Label>
                    <Select
                      value={newRule.penalty_type}
                      onValueChange={(v) => setNewRule((prev) => ({ ...prev, penalty_type: v }))}
                    >
                      <SelectTrigger id="penalty-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PENALTY_TYPES.map((pt) => {
                          const Icon = pt.icon
                          return (
                            <SelectItem key={pt.key} value={pt.key}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {pt.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="penalty-value">Penalty Value *</Label>
                    <Input
                      id="penalty-value"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={newRule.penalty_value || ''}
                      onChange={(e) => setNewRule((prev) => ({ ...prev, penalty_value: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-count">Max Count</Label>
                    <Input
                      id="max-count"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={newRule.max_count || ''}
                      onChange={(e) => setNewRule((prev) => ({ ...prev, max_count: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active">Status</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        id="active"
                        type="checkbox"
                        checked={newRule.active}
                        onChange={(e) => setNewRule((prev) => ({ ...prev, active: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="active" className="cursor-pointer">
                        Active
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description for this penalty rule..."
                    rows={4}
                    value={newRule.description}
                    onChange={(e) => setNewRule((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <Button onClick={createPenaltyRule} disabled={loading} className="w-full gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Penalty Rule
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          {/* Filters */}
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search incidents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={incidentTypeFilter} onValueChange={setIncidentTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {INCIDENT_TYPES.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    {SEVERITY_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-gray-200">
            <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Incidents ({incidents.length})
              </CardTitle>
              <CardDescription>
                Review and manage track incidents
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {incidents.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-medium text-lg mb-2">No incidents found</p>
                  <p className="text-sm text-gray-400">
                    {searchQuery || incidentTypeFilter !== 'all' || severityFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'No incidents have been recorded yet'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Team</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Severity</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Sector</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident) => {
                        const incidentTypeInfo = getIncidentTypeInfo(incident.incident_type || 'OTHER')
                        const severityInfo = getSeverityInfo(incident.severity || 'minor')
                        return (
                          <tr key={incident.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{formatDate(incident.occurred_at)}</p>
                                <p className="text-xs text-gray-500">{formatTimeAgo(incident.occurred_at)}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{incident.team?.code || 'Unknown'}</Badge>
                                {incident.team?.name && (
                                  <span className="text-sm text-gray-600">{incident.team.name}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={incidentTypeInfo.color}>{incidentTypeInfo.label}</Badge>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={severityInfo.color}>{severityInfo.label}</Badge>
                            </td>
                            <td className="py-4 px-4">
                              {incident.sector ? (
                                <Badge variant="outline">{incident.sector}</Badge>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedIncident(incident)
                                  setIncidentDialogOpen(true)
                                }}
                                className="gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
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
        </TabsContent>
      </Tabs>

      {/* Incident Details Dialog */}
      <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Incident Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this track incident
            </DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Timestamp</p>
                  <p className="text-base text-gray-900">{formatDate(selectedIncident.occurred_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Team</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedIncident.team?.code || 'Unknown'}</Badge>
                    {selectedIncident.team?.name && (
                      <span className="text-sm text-gray-600">{selectedIncident.team.name}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Session ID</p>
                  <p className="text-base text-gray-900">{selectedIncident.session_id || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Incident Type</p>
                  <Badge className={getIncidentTypeInfo(selectedIncident.incident_type || 'OTHER').color}>
                    {getIncidentTypeInfo(selectedIncident.incident_type || 'OTHER').label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Severity</p>
                  <Badge className={getSeverityInfo(selectedIncident.severity || 'minor').color}>
                    {getSeverityInfo(selectedIncident.severity || 'minor').label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Sector</p>
                  <p className="text-base text-gray-900">{selectedIncident.sector || '-'}</p>
                </div>
                {selectedIncident.marshal && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Reported By</p>
                    <p className="text-base text-gray-900">
                      {selectedIncident.marshal.first_name} {selectedIncident.marshal.last_name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Weather Impact</p>
                  <Badge variant="outline">
                    {selectedIncident.weather_impact ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              {selectedIncident.description && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedIncident.description}
                  </p>
                </div>
              )}
              {selectedIncident.action_taken && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Action Taken</p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedIncident.action_taken}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
