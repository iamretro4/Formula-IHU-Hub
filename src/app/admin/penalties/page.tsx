'use client'
import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

const PENALTY_TYPES = [
  { key: 'time_penalty', label: 'Time Penalty (seconds)' },
  { key: 'points_deduction', label: 'Points Deduction' },
  { key: 'dsq', label: 'Disqualification (DSQ)' },
]

const INCIDENT_TYPES = ['DOO', 'OOC', 'OTHER']
const DYNAMIC_EVENTS = ['acceleration', 'skidpad', 'autocross', 'endurance']

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
  weather_impact?: string
  event_type?: string
  team?: { code?: string } | null
}

export default function PenaltyManagementPage() {
  const supabase = createClientComponentClient()
  const [activeTab, setActiveTab] = useState<'rules' | 'create' | 'review'>('rules')
  const [rules, setRules] = useState<PenaltyRule[]>([])
  const [incidents, setIncidents] = useState<TrackIncident[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const [newRule, setNewRule] = useState({
    name: '',
    event_type: DYNAMIC_EVENTS[0],
    incident_type: INCIDENT_TYPES[0],
    penalty_type: PENALTY_TYPES[0].key,
    penalty_value: 0,
    max_count: 1,
    active: true,
    description: '',
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('app_role')
            .eq('id', user.id)
            .single()
          setUserRole(profile?.app_role ?? null)
        }

        const { data: penaltyRules } = await supabase
          .from('penalty_rules')
          .select('*')
          .order('created_at', { ascending: false })
        setRules(penaltyRules || [])

        // Fetch from track_incidents with join on teams
        const { data: trackIncidents } = await supabase
          .from('track_incidents')
          .select(
            `id, occurred_at, team_id, marshal_id, sector, incident_type, severity, description, action_taken, coordinates, weather_impact, event_type, team:teams(code)`
          )
          .order('occurred_at', { ascending: false })
          .limit(10)
        
        // Transform the data to match TrackIncident type
        const transformedIncidents = trackIncidents?.map(incident => ({
          ...incident,
          team: Array.isArray(incident.team) ? incident.team[0] : incident.team
        })) || []
        
        setIncidents(transformedIncidents)

        setError(null)
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error('Unknown error')
        setError(error.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function applyPenalties() {
    if (!confirm('Are you sure you want to apply penalties to runs?')) return
    setIsApplying(true)
    setError(null)
    setSuccess(null)
    try {
      const { error } = await supabase.rpc('apply_penalties_to_runs')
      if (error) throw error
      setSuccess('Penalties applied successfully')
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error')
      setError(error.message || 'Failed to apply penalties')
    } finally {
      setIsApplying(false)
    }
  }

  async function createPenaltyRule() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (!newRule.name.trim()) throw new Error('Rule name is required')
      if (newRule.penalty_value <= 0 && newRule.penalty_type !== 'dsq')
        throw new Error('Penalty value must be greater than 0')

      const penaltyUnit =
        newRule.penalty_type === 'time_penalty'
          ? 'seconds'
          : newRule.penalty_type === 'points_deduction'
          ? 'points'
          : 'points'

      const { error } = await supabase.from('penalty_rules').insert({
        event_type: newRule.event_type,
        rule_type: newRule.penalty_type,
        condition: {
          incident_type: newRule.incident_type,
          max_count: newRule.max_count,
        },
        penalty_value: newRule.penalty_value,
        penalty_unit: penaltyUnit,
        active: newRule.active,
      })

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      setSuccess('Penalty rule created successfully')
      setNewRule({
        name: '',
        event_type: DYNAMIC_EVENTS[0],
        incident_type: INCIDENT_TYPES[0],
        penalty_type: PENALTY_TYPES[0].key,
        penalty_value: 0,
        max_count: 1,
        active: true,
        description: '',
      })

      const { data: penaltyRules } = await supabase
        .from('penalty_rules')
        .select('*')
        .order('created_at', { ascending: false })
      setRules(penaltyRules || [])
    } catch (e: any) {
      setError(e.message || 'Failed to create penalty rule')
    } finally {
      setLoading(false)
    }
  }

  async function toggleRuleActive(id: string, current: boolean) {
    try {
      await supabase.from('penalty_rules').update({ active: !current }).eq('id', id)
      setRules(rules.map((r) => (r.id === id ? { ...r, active: !current } : r)))
    } catch {
      setError('Failed to update rule status')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Penalty Management</h1>
        {userRole === 'admin' && (
          <Button onClick={applyPenalties} disabled={loading || isApplying}>
            {isApplying ? 'Applying...' : 'Apply Penalties to Runs'}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'rules' | 'create' | 'review')}>
        <TabsList>
          <TabsTrigger value="rules">Penalty Rules</TabsTrigger>
          <TabsTrigger value="create">Create Rule</TabsTrigger>
          <TabsTrigger value="review">Incident Review</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Active Penalty Rules</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                </div>
              ) : (
                <table className="w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="border px-4 py-2">Rule Name</th>
                      <th className="border px-4 py-2">Event</th>
                      <th className="border px-4 py-2">Incident Type</th>
                      <th className="border px-4 py-2">Penalty</th>
                      <th className="border px-4 py-2">Max Count</th>
                      <th className="border px-4 py-2">Status</th>
                      <th className="border px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-100">
                        <td className="border px-4 py-2">{rule.name || rule.rule_type}</td>
                        <td className="border px-4 py-2">{rule.event_type}</td>
                        <td className="border px-4 py-2">{rule.condition?.incident_type}</td>
                        <td className="border px-4 py-2">
                          {rule.penalty_unit === 'seconds'
                            ? `+${rule.penalty_value}s`
                            : rule.penalty_unit === 'points'
                            ? `-${rule.penalty_value}pts`
                            : `${rule.penalty_value}%`}
                        </td>
                        <td className="border px-4 py-2">{rule.condition?.max_count}</td>
                        <td className="border px-4 py-2">
                          <Badge variant={rule.active ? 'default' : 'destructive'}>
                            {rule.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="border px-4 py-2">
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={() => toggleRuleActive(rule.id, rule.active)}
                            disabled={loading}
                            aria-label={`Toggle rule ${rule.rule_type} active state`}
                            className="cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Create New Penalty Rule</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <Input
                  type="text"
                  placeholder="Rule Name (optional)"
                  value={newRule.name}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Select
                  value={newRule.event_type}
                  onValueChange={(v) => setNewRule((prev) => ({ ...prev, event_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DYNAMIC_EVENTS.map((ev) => (
                      <SelectItem key={ev} value={ev}>
                        {ev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newRule.incident_type}
                  onValueChange={(v) => setNewRule((prev) => ({ ...prev, incident_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((it) => (
                      <SelectItem key={it} value={it}>
                        {it}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newRule.penalty_type}
                  onValueChange={(v) => setNewRule((prev) => ({ ...prev, penalty_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PENALTY_TYPES.map((pt) => (
                      <SelectItem key={pt.key} value={pt.key}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Penalty Value"
                  value={newRule.penalty_value}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, penalty_value: Number(e.target.value) }))}
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Max Count"
                  value={newRule.max_count}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, max_count: Number(e.target.value) }))}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRule.active}
                    onChange={(e) => setNewRule((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  Active
                </label>
                <textarea
                  placeholder="Description (optional)"
                  className="w-full rounded border p-2"
                  rows={4}
                  value={newRule.description}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, description: e.target.value }))}
                />
                <Button onClick={createPenaltyRule} disabled={loading}>
                  Create Penalty Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Recent Incidents</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
              ) : (
                <table className="w-full table-auto border-collapse border border-gray-200">
                  <thead className="bg-gray-50 font-semibold">
                    <tr>
                      <th className="border px-4 py-2">Timestamp</th>
                      <th className="border px-4 py-2">Team</th>
                      <th className="border px-4 py-2">Event</th>
                      <th className="border px-4 py-2">Type</th>
                      <th className="border px-4 py-2">Severity</th>
                      <th className="border px-4 py-2">Action Taken</th>
                      <th className="border px-4 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-100">
                        <td className="border px-4 py-2">{new Date(incident.occurred_at).toLocaleString()}</td>
                        <td className="border px-4 py-2">{incident.team?.code || 'Unknown'}</td>
                        <td className="border px-4 py-2">{incident.event_type || '-'}</td>
                        <td className="border px-4 py-2">{incident.incident_type || '-'}</td>
                        <td className="border px-4 py-2 text-red-600 font-semibold">{incident.severity || '-'}</td>
                        <td className="border px-4 py-2">{incident.action_taken || '-'}</td>
                        <td className="border px-4 py-2">{incident.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
