'use client'
import React, { useEffect, useState, useCallback } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Trophy, 
  Medal, 
  Award, 
  Zap, 
  Gauge, 
  Car, 
  Timer, 
  Target,
  FileText,
  Building2,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

type OverallResult = {
  team_code: string
  team_name: string
  vehicle_class: string
  total_points: number
  acceleration_points: number
  skidpad_points: number
  autocross_points: number
  endurance_points: number
  efficiency_points: number
  design_points: number
  cost_points: number
  business_points: number
}

type DynamicResult = {
  team_code: string
  team_name: string
  vehicle_class: string
  event_type: string
  best_corrected_time: number | null
  best_raw_time: number | null
  points: number | null
}

type StaticResult = {
  team_code: string
  team_name: string
  vehicle_class: string
  static_event: string
  total_score: number | null
}

const DYNAMIC_EVENTS = [
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'skidpad', label: 'Skidpad' },
  { key: 'autocross', label: 'Autocross' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'efficiency', label: 'Efficiency' },
]
const STATIC_EVENTS = [
  { key: 'Design', label: 'Design' },
  { key: 'Cost & Manufacturing', label: 'Cost & Manufacturing' },
  { key: 'Business Plan', label: 'Business Plan' },
]
const VEHICLE_CLASSES = ['EV', 'CV']

const EVENT_ICONS: Record<string, React.ReactNode> = {
  acceleration: <Zap className="w-4 h-4" />,
  skidpad: <Gauge className="w-4 h-4" />,
  autocross: <Car className="w-4 h-4" />,
  endurance: <Timer className="w-4 h-4" />,
  efficiency: <Target className="w-4 h-4" />,
  'Design': <FileText className="w-4 h-4" />,
  'Cost & Manufacturing': <Building2 className="w-4 h-4" />,
  'Business Plan': <TrendingUp className="w-4 h-4" />,
}

export default function ResultsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overallEV, setOverallEV] = useState<OverallResult[]>([])
  const [overallCV, setOverallCV] = useState<OverallResult[]>([])
  const [dynEvent, setDynEvent] = useState<{ EV: Record<string, DynamicResult[]>, CV: Record<string, DynamicResult[]> }>({ EV: {}, CV: {} })
  const [staticEvent, setStaticEvent] = useState<{ EV: Record<string, StaticResult[]>, CV: Record<string, StaticResult[]> }>({ EV: {}, CV: {} })
  const [activeTab, setActiveTab] = useState('overall_ev')
  const [activeDynEvTab, setActiveDynEvTab] = useState('acceleration')
  const [activeDynCvTab, setActiveDynCvTab] = useState('acceleration')
  const [activeStaticEvTab, setActiveStaticEvTab] = useState('Design')
  const [activeStaticCvTab, setActiveStaticCvTab] = useState('Design')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()
      
      // Fetch all teams with vehicle class
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, code, name, vehicle_class')
      
      if (teamsError) throw teamsError
      
      const teamsMap = new Map((teams || []).map(t => [t.id, t]))
      
      // Fetch dynamic event results
      const { data: dynamicResults, error: dynamicError } = await supabase
        .from('dynamic_event_results')
        .select('*, teams:team_id(code, name, vehicle_class)')
        .order('points', { ascending: false, nullsFirst: false })
      
      if (dynamicError) throw dynamicError
      
      // Fetch best times from runs for raw/corrected time display
      const { data: allRuns, error: runsError } = await supabase
        .from('dynamic_event_runs')
        .select('team_id, event_type, raw_time, corrected_time')
        .not('raw_time', 'is', null)
        .eq('status', 'completed')
      
      if (runsError) throw runsError
      
      // Create a map of best times per team/event
      const bestTimesMap = new Map<string, { raw: number | null, corrected: number | null }>()
      
      allRuns?.forEach((run: any) => {
        const key = `${run.team_id}_${run.event_type}`
        const existing = bestTimesMap.get(key)
        
        if (!existing) {
          bestTimesMap.set(key, {
            raw: run.raw_time,
            corrected: run.corrected_time || run.raw_time,
          })
        } else {
          // Keep the best (lowest) corrected time
          const currentCorrected = run.corrected_time || run.raw_time
          const existingCorrected = existing.corrected || existing.raw
          
          if (currentCorrected && (!existingCorrected || currentCorrected < existingCorrected)) {
            bestTimesMap.set(key, {
              raw: run.raw_time,
              corrected: currentCorrected,
            })
          }
        }
      })
      
      // Fetch efficiency results
      const { data: efficiencyResults, error: efficiencyError } = await supabase
        .from('efficiency_results')
        .select('*, teams:team_id(code, name, vehicle_class)')
        .order('efficiency_points', { ascending: false, nullsFirst: false })
      
      if (efficiencyError) throw efficiencyError
      
      // Process dynamic events by class/event
      let dynEventResultsEV: Record<string, DynamicResult[]> = {}
      let dynEventResultsCV: Record<string, DynamicResult[]> = {}
      
      for (const ev of DYNAMIC_EVENTS) {
        const evKey = ev.key === 'efficiency' ? 'endurance' : ev.key // Efficiency is part of endurance
        
        const evResults = (dynamicResults || []).filter((r: any) => {
          const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
          return r.event_type === evKey && team?.vehicle_class === 'EV'
        })
        
        dynEventResultsEV[ev.key] = evResults.map((r: any) => {
          const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
          const timeKey = `${team?.id}_${evKey}`
          const bestTimes = bestTimesMap.get(timeKey)
          return {
            team_code: team?.code || '',
            team_name: team?.name || '',
            vehicle_class: 'EV',
            event_type: ev.key,
            best_corrected_time: bestTimes?.corrected || r.best_time || null,
            best_raw_time: bestTimes?.raw || null,
            points: r.points || null,
          }
        })
        
        const cvResults = (dynamicResults || []).filter((r: any) => {
          const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
          return r.event_type === evKey && team?.vehicle_class === 'CV'
        })
        
        dynEventResultsCV[ev.key] = cvResults.map((r: any) => {
          const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
          const timeKey = `${team?.id}_${evKey}`
          const bestTimes = bestTimesMap.get(timeKey)
          return {
            team_code: team?.code || '',
            team_name: team?.name || '',
            vehicle_class: 'CV',
            event_type: ev.key,
            best_corrected_time: bestTimes?.corrected || r.best_time || null,
            best_raw_time: bestTimes?.raw || null,
            points: r.points || null,
          }
        })
      }
      
      // Add efficiency results
      const evEfficiency = (efficiencyResults || []).filter((r: any) => {
        const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
        return team?.vehicle_class === 'EV'
      })
      
      dynEventResultsEV['efficiency'] = evEfficiency.map((r: any) => {
        const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
        return {
          team_code: team?.code || '',
          team_name: team?.name || '',
          vehicle_class: 'EV',
          event_type: 'efficiency',
          best_corrected_time: null,
          best_raw_time: null,
          points: r.efficiency_points || null,
        }
      })
      
      const cvEfficiency = (efficiencyResults || []).filter((r: any) => {
        const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
        return team?.vehicle_class === 'CV'
      })
      
      dynEventResultsCV['efficiency'] = cvEfficiency.map((r: any) => {
        const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
        return {
          team_code: team?.code || '',
          team_name: team?.name || '',
          vehicle_class: 'CV',
          event_type: 'efficiency',
          best_corrected_time: null,
          best_raw_time: null,
          points: r.efficiency_points || null,
        }
      })
      
      setDynEvent({ EV: dynEventResultsEV, CV: dynEventResultsCV })
      
      // Fetch judged event bookings with event info to get event types
      const { data: bookings, error: bookingsError } = await supabase
        .from('judged_event_bookings')
        .select(`
          id,
          event_id,
          team_id,
          teams:team_id(code, name, vehicle_class),
          judged_events:event_id(id, name)
        `)
      
      if (bookingsError) throw bookingsError
      
      // Fetch all judged event scores
      const { data: judgedScores, error: judgedError } = await supabase
        .from('judged_event_scores')
        .select('id, booking_id, score, status')
      
      if (judgedError) throw judgedError
      
      // Map event names to event types
      const eventNameToType: Record<string, string> = {}
      bookings?.forEach((booking: any) => {
        const event = Array.isArray(booking.judged_events) ? booking.judged_events[0] : booking.judged_events
        if (event?.name) {
          const name = event.name.toLowerCase()
          if (name.includes('design') || name.includes('engineering')) {
            eventNameToType[booking.id] = 'engineering_design'
          } else if (name.includes('cost') || name.includes('manufacturing')) {
            eventNameToType[booking.id] = 'cost_manufacturing'
          } else if (name.includes('business') || name.includes('plan')) {
            eventNameToType[booking.id] = 'business_plan'
          }
        }
      })
      
      // Aggregate scores by booking
      const bookingScoresMap = new Map<string, {
        team: any,
        eventType: string,
        totalScore: number
      }>()
      
      bookings?.forEach((booking: any) => {
        const team = Array.isArray(booking.teams) ? booking.teams[0] : booking.teams
        if (!team) return
        
        const eventType = eventNameToType[booking.id] || ''
        if (!eventType) return
        
        // Calculate total score for this booking (sum of all approved scores)
        const bookingScores = judgedScores?.filter((s: any) => 
          s.booking_id === booking.id && s.status === 'approved'
        ) || []
        
        const totalScore = bookingScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
        
        if (totalScore > 0) {
          bookingScoresMap.set(booking.id, {
            team,
            eventType,
            totalScore
          })
        }
      })
      
      const eventTypeMap: Record<string, string> = {
        'Design': 'engineering_design',
        'Cost & Manufacturing': 'cost_manufacturing',
        'Business Plan': 'business_plan',
      }
      
      let staticEventResultsEV: Record<string, StaticResult[]> = {}
      let staticEventResultsCV: Record<string, StaticResult[]> = {}
      
      for (const ev of STATIC_EVENTS) {
        const eventType = eventTypeMap[ev.key]
        
        const evResults: StaticResult[] = []
        const cvResults: StaticResult[] = []
        
        bookingScoresMap.forEach((entry) => {
          if (entry.eventType === eventType) {
            const result = {
              team_code: entry.team?.code || '',
              team_name: entry.team?.name || '',
              vehicle_class: entry.team?.vehicle_class || '',
              static_event: ev.key,
              total_score: entry.totalScore || null,
            }
            
            if (entry.team?.vehicle_class === 'EV') {
              evResults.push(result)
            } else if (entry.team?.vehicle_class === 'CV') {
              cvResults.push(result)
            }
          }
        })
        
        staticEventResultsEV[ev.key] = evResults.sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
        staticEventResultsCV[ev.key] = cvResults.sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      }
      
      setStaticEvent({ EV: staticEventResultsEV, CV: staticEventResultsCV })
      
      // Calculate overall results by aggregating all points
      const overallResultsMap = new Map<string, OverallResult>()
      
      // Initialize all teams
      teams?.forEach(team => {
        if (team.vehicle_class) {
          overallResultsMap.set(team.id, {
            team_code: team.code || '',
            team_name: team.name || '',
            vehicle_class: team.vehicle_class,
            total_points: 0,
            acceleration_points: 0,
            skidpad_points: 0,
            autocross_points: 0,
            endurance_points: 0,
            efficiency_points: 0,
            design_points: 0,
            cost_points: 0,
            business_points: 0,
          })
        }
      })
      
      // Add dynamic event points
      dynamicResults?.forEach((r: any) => {
        const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
        if (!team?.id) return
        
        const result = overallResultsMap.get(team.id)
        if (!result) return
        
        const points = r.points || 0
        result.total_points += points
        
        if (r.event_type === 'acceleration') {
          result.acceleration_points = points
        } else if (r.event_type === 'skidpad') {
          result.skidpad_points = points
        } else if (r.event_type === 'autocross') {
          result.autocross_points = points
        } else if (r.event_type === 'endurance') {
          result.endurance_points = points
        }
      })
      
      // Add efficiency points
      efficiencyResults?.forEach((r: any) => {
        const team = Array.isArray(r.teams) ? r.teams[0] : r.teams
        if (!team?.id) return
        
        const result = overallResultsMap.get(team.id)
        if (!result) return
        
        const points = r.efficiency_points || 0
        result.efficiency_points = points
        result.total_points += points
      })
      
      // Add static event points (aggregate by booking)
      bookingScoresMap.forEach((entry) => {
        if (!entry.team?.id) return
        
        const result = overallResultsMap.get(entry.team.id)
        if (!result) return
        
        const points = entry.totalScore || 0
        result.total_points += points
        
        if (entry.eventType === 'engineering_design') {
          result.design_points = points // Use the booking's total score
        } else if (entry.eventType === 'cost_manufacturing') {
          result.cost_points = points // Use the booking's total score
        } else if (entry.eventType === 'business_plan') {
          result.business_points = points // Use the booking's total score
        }
      })
      
      // Convert to arrays and filter by class
      const overallEV = Array.from(overallResultsMap.values())
        .filter(r => r.vehicle_class === 'EV')
        .sort((a, b) => b.total_points - a.total_points)
      
      const overallCV = Array.from(overallResultsMap.values())
        .filter(r => r.vehicle_class === 'CV')
        .sort((a, b) => b.total_points - a.total_points)
      
      setOverallEV(overallEV)
      setOverallCV(overallCV)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load results'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error fetching results:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return null
  }

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100/50 border-yellow-200'
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100/50 border-gray-200'
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200'
    return 'bg-white border-gray-200 hover:bg-gray-50'
  }

  // --- Renders ---
  function renderOverallTable(rows: OverallResult[]) {
    const sortedRows = rows?.slice().sort((a, b) => b.total_points - a.total_points) || []
    
    if (sortedRows.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No results available yet</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b-2 border-primary/20">
              <th className="px-4 py-3 text-left font-bold text-gray-700">Rank</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Team</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700">Total</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Acc</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Skidpad</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Autox</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Endu</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Efcy</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Design</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Cost</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">BP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row, idx) => {
              const rank = idx + 1
              return (
                <tr key={row.team_code} className={`transition-all duration-200 ${getRankBgColor(rank)}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      <span className="font-bold text-gray-700">{rank}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-gray-900">{row.team_code}</div>
                      <div className="text-xs text-gray-500">{row.team_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-lg text-primary">{row.total_points?.toFixed(2) ?? '0.00'}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.acceleration_points?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.skidpad_points?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.autocross_points?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.endurance_points?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.efficiency_points?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.design_points?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.cost_points?.toFixed(2) ?? '0.00'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.business_points?.toFixed(2) ?? '0.00'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderDynamicTable(rows: DynamicResult[]) {
    const sortedRows = rows?.slice().sort((a, b) => (b.points ?? 0) - (a.points ?? 0)) || []
    
    if (sortedRows.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Timer className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No results available yet</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b-2 border-primary/20">
              <th className="px-4 py-3 text-left font-bold text-gray-700">Rank</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Team</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Corrected Time</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Raw Time</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row, idx) => {
              const rank = idx + 1
              return (
                <tr key={row.team_code} className={`transition-all duration-200 ${getRankBgColor(rank)}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      <span className="font-bold text-gray-700">{rank}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-gray-900">{row.team_code}</div>
                      <div className="text-xs text-gray-500">{row.team_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="font-mono">
                      {row.best_corrected_time?.toFixed(3) ?? '-'}s
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-600 font-mono">{row.best_raw_time?.toFixed(3) ?? '-'}s</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-lg text-primary">{row.points?.toFixed(2) ?? '0.00'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderStaticTable(rows: StaticResult[]) {
    const sortedRows = rows?.slice().sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0)) || []
    
    if (sortedRows.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No results available yet</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b-2 border-primary/20">
              <th className="px-4 py-3 text-left font-bold text-gray-700">Rank</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Team</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row, idx) => {
              const rank = idx + 1
              return (
                <tr key={row.team_code} className={`transition-all duration-200 ${getRankBgColor(rank)}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      <span className="font-bold text-gray-700">{rank}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-gray-900">{row.team_code}</div>
                      <div className="text-xs text-gray-500">{row.team_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-lg text-primary">{row.total_score?.toFixed(2) ?? '0.00'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Competition Results
          </h1>
          <p className="text-gray-600 mt-2">View standings and scores for all events</p>
        </div>
        {error && (
          <Button
            onClick={fetchAll}
            variant="outline"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading results</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-gray-600 font-medium">Loading results...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Tabs */}
      {!loading && !error && (
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 flex gap-2 flex-wrap bg-gray-100/50">
                <TabsTrigger value="overall_ev" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Overall EV
                </TabsTrigger>
                <TabsTrigger value="overall_cv" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Overall CV
                </TabsTrigger>
                <TabsTrigger value="dynamic_ev" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Dynamic EV
                </TabsTrigger>
                <TabsTrigger value="dynamic_cv" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Dynamic CV
                </TabsTrigger>
                <TabsTrigger value="static_ev" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Static EV
                </TabsTrigger>
                <TabsTrigger value="static_cv" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Static CV
                </TabsTrigger>
              </TabsList>
              {/* Overall EV */}
              <TabsContent value="overall_ev" className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <Trophy className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">Overall Standings - EV</h2>
                </div>
                {renderOverallTable(overallEV)}
              </TabsContent>
              
              {/* Overall CV */}
              <TabsContent value="overall_cv" className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <Trophy className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">Overall Standings - CV</h2>
                </div>
                {renderOverallTable(overallCV)}
              </TabsContent>
              
              {/* Dynamic EV */}
              <TabsContent value="dynamic_ev" className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <Zap className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">Dynamic Events - EV</h2>
                </div>
                <Tabs value={activeDynEvTab} onValueChange={setActiveDynEvTab}>
                  <TabsList className="mb-4 bg-gray-100/50">
                    {DYNAMIC_EVENTS.map(ev => (
                      <TabsTrigger key={ev.key} value={ev.key} className="gap-2">
                        {EVENT_ICONS[ev.key]}
                        {ev.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {DYNAMIC_EVENTS.map(ev => (
                    <TabsContent key={ev.key} value={ev.key} className="space-y-4">
                      <div className="flex items-center gap-2">
                        {EVENT_ICONS[ev.key]}
                        <h3 className="text-xl font-bold text-gray-900">{ev.label} - EV</h3>
                      </div>
                      {renderDynamicTable(dynEvent.EV[ev.key] || [])}
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
              
              {/* Dynamic CV */}
              <TabsContent value="dynamic_cv" className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <Zap className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">Dynamic Events - CV</h2>
                </div>
                <Tabs value={activeDynCvTab} onValueChange={setActiveDynCvTab}>
                  <TabsList className="mb-4 bg-gray-100/50">
                    {DYNAMIC_EVENTS.map(ev => (
                      <TabsTrigger key={ev.key} value={ev.key} className="gap-2">
                        {EVENT_ICONS[ev.key]}
                        {ev.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {DYNAMIC_EVENTS.map(ev => (
                    <TabsContent key={ev.key} value={ev.key} className="space-y-4">
                      <div className="flex items-center gap-2">
                        {EVENT_ICONS[ev.key]}
                        <h3 className="text-xl font-bold text-gray-900">{ev.label} - CV</h3>
                      </div>
                      {renderDynamicTable(dynEvent.CV[ev.key] || [])}
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
              
              {/* Static EV */}
              <TabsContent value="static_ev" className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <FileText className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">Static Events - EV</h2>
                </div>
                <Tabs value={activeStaticEvTab} onValueChange={setActiveStaticEvTab}>
                  <TabsList className="mb-4 bg-gray-100/50">
                    {STATIC_EVENTS.map(ev => (
                      <TabsTrigger key={ev.key} value={ev.key} className="gap-2">
                        {EVENT_ICONS[ev.key]}
                        {ev.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {STATIC_EVENTS.map(ev => (
                    <TabsContent key={ev.key} value={ev.key} className="space-y-4">
                      <div className="flex items-center gap-2">
                        {EVENT_ICONS[ev.key]}
                        <h3 className="text-xl font-bold text-gray-900">{ev.label} - EV</h3>
                      </div>
                      {renderStaticTable(staticEvent.EV[ev.key] || [])}
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
              
              {/* Static CV */}
              <TabsContent value="static_cv" className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <FileText className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">Static Events - CV</h2>
                </div>
                <Tabs value={activeStaticCvTab} onValueChange={setActiveStaticCvTab}>
                  <TabsList className="mb-4 bg-gray-100/50">
                    {STATIC_EVENTS.map(ev => (
                      <TabsTrigger key={ev.key} value={ev.key} className="gap-2">
                        {EVENT_ICONS[ev.key]}
                        {ev.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {STATIC_EVENTS.map(ev => (
                    <TabsContent key={ev.key} value={ev.key} className="space-y-4">
                      <div className="flex items-center gap-2">
                        {EVENT_ICONS[ev.key]}
                        <h3 className="text-xl font-bold text-gray-900">{ev.label} - CV</h3>
                      </div>
                      {renderStaticTable(staticEvent.CV[ev.key] || [])}
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
