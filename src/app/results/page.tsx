'use client'
import React, { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

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

export default function ResultsPage() {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [overallEV, setOverallEV] = useState<OverallResult[]>([])
  const [overallCV, setOverallCV] = useState<OverallResult[]>([])
  const [dynEvent, setDynEvent] = useState<{ EV: Record<string, DynamicResult[]>, CV: Record<string, DynamicResult[]> }>({ EV: {}, CV: {} })
  const [staticEvent, setStaticEvent] = useState<{ EV: Record<string, StaticResult[]>, CV: Record<string, StaticResult[]> }>({ EV: {}, CV: {} })
  const [activeTab, setActiveTab] = useState('overall_ev')
  const [activeDynEvTab, setActiveDynEvTab] = useState('acceleration')
  const [activeDynCvTab, setActiveDynCvTab] = useState('acceleration')
  const [activeStaticEvTab, setActiveStaticEvTab] = useState('Design')
  const [activeStaticCvTab, setActiveStaticCvTab] = useState('Design')

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      // Overall EV/CV
      const { data: overallEV } = await supabase
        .from('overall_results_per_class')
        .select('*')
        .eq('vehicle_class', 'EV')
      setOverallEV((overallEV || []) as OverallResult[])
      const { data: overallCV } = await supabase
        .from('overall_results_per_class')
        .select('*')
        .eq('vehicle_class', 'CV')
      setOverallCV((overallCV || []) as OverallResult[])

      // Dynamic events by class/event
      let dynEventResultsEV: Record<string, DynamicResult[]> = {}
      let dynEventResultsCV: Record<string, DynamicResult[]> = {}
      for (let ev of DYNAMIC_EVENTS) {
        const evKey = ev.key
        const { data: evEV } = await supabase
          .from('dynamic_event_leaderboard')
          .select('*')
          .eq('vehicle_class', 'EV')
          .eq('event_type', evKey)
        dynEventResultsEV[evKey] = (evEV || []) as DynamicResult[]
        const { data: evCV } = await supabase
          .from('dynamic_event_leaderboard')
          .select('*')
          .eq('vehicle_class', 'CV')
          .eq('event_type', evKey)
        dynEventResultsCV[evKey] = (evCV || []) as DynamicResult[]
      }
      setDynEvent({ EV: dynEventResultsEV, CV: dynEventResultsCV })

      // Static (judged) events by class/event
      let staticEventResultsEV: Record<string, StaticResult[]> = {}
      let staticEventResultsCV: Record<string, StaticResult[]> = {}
      for (let ev of STATIC_EVENTS) {
        const evKey = ev.key
        const { data: statEV } = await supabase
          .from('static_event_aggregate')
          .select('*')
          .eq('vehicle_class', 'EV')
          .eq('static_event', evKey)
        staticEventResultsEV[evKey] = (statEV || []) as StaticResult[]
        const { data: statCV } = await supabase
          .from('static_event_aggregate')
          .select('*')
          .eq('vehicle_class', 'CV')
          .eq('static_event', evKey)
        staticEventResultsCV[evKey] = (statCV || []) as StaticResult[]
      }
      setStaticEvent({ EV: staticEventResultsEV, CV: staticEventResultsCV })

      setLoading(false)
    }
    fetchAll()
  }, [supabase])

  // --- Renders ---
  function renderOverallTable(rows: OverallResult[]) {
    return (
      <table className="w-full table-auto border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th>Rank</th>
            <th>Team</th>
            <th>Total</th>
            <th>Acc</th>
            <th>Skidpad</th>
            <th>Autox</th>
            <th>Endu</th>
            <th>Efcy</th>
            <th>Design</th>
            <th>Cost</th>
            <th>BP</th>
          </tr>
        </thead>
        <tbody>
          {rows
            ?.slice()
            .sort((a, b) => b.total_points - a.total_points)
            .map((row, idx) => (
              <tr key={row.team_code}>
                <td className="text-center">{idx + 1}</td>
                <td>{row.team_code} - {row.team_name}</td>
                <td className="font-bold text-center">{row.total_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.acceleration_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.skidpad_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.autocross_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.endurance_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.efficiency_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.design_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.cost_points?.toFixed(2) ?? 0}</td>
                <td className="text-center">{row.business_points?.toFixed(2) ?? 0}</td>
              </tr>
            ))}
        </tbody>
      </table>
    )
  }

  function renderDynamicTable(rows: DynamicResult[]) {
    return (
      <table className="w-full table-auto border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th>Rank</th>
            <th>Team</th>
            <th>Corrected</th>
            <th>Raw</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows
            ?.slice()
            .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
            .map((row, idx) => (
              <tr key={row.team_code}>
                <td className="text-center">{idx + 1}</td>
                <td>{row.team_code} - {row.team_name}</td>
                <td className="text-center">{row.best_corrected_time?.toFixed(3) ?? '-'}</td>
                <td className="text-center">{row.best_raw_time?.toFixed(3) ?? '-'}</td>
                <td className="text-center font-bold">{row.points?.toFixed(2) ?? '0'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    )
  }

  function renderStaticTable(rows: StaticResult[]) {
    return (
      <table className="w-full table-auto border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th>Rank</th>
            <th>Team</th>
            <th>Total Score</th>
          </tr>
        </thead>
        <tbody>
          {rows
            ?.slice()
            .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
            .map((row, idx) => (
              <tr key={row.team_code}>
                <td className="text-center">{idx + 1}</td>
                <td>{row.team_code} - {row.team_name}</td>
                <td className="text-center font-bold">{row.total_score ?? '0'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex gap-2 flex-wrap">
          <TabsTrigger value="overall_ev">Overall EV</TabsTrigger>
          <TabsTrigger value="overall_cv">Overall CV</TabsTrigger>
          <TabsTrigger value="dynamic_ev">Dynamic Events EV</TabsTrigger>
          <TabsTrigger value="dynamic_cv">Dynamic Events CV</TabsTrigger>
          <TabsTrigger value="static_ev">Static Events EV</TabsTrigger>
          <TabsTrigger value="static_cv">Static Events CV</TabsTrigger>
        </TabsList>
        {/* Overall EV */}
        <TabsContent value="overall_ev">
          <h2 className="font-bold text-xl mb-2">Overall Standings - EV</h2>
          {loading ? <Loader2 className="animate-spin mx-auto" /> : renderOverallTable(overallEV)}
        </TabsContent>
        {/* Overall CV */}
        <TabsContent value="overall_cv">
          <h2 className="font-bold text-xl mb-2">Overall Standings - CV</h2>
          {loading ? <Loader2 className="animate-spin mx-auto" /> : renderOverallTable(overallCV)}
        </TabsContent>
        {/* Dynamic EV */}
        <TabsContent value="dynamic_ev">
          <Tabs value={activeDynEvTab} onValueChange={setActiveDynEvTab} className="mt-4">
            <TabsList>
              {DYNAMIC_EVENTS.map(ev => (
                <TabsTrigger key={ev.key} value={ev.key}>{ev.label}</TabsTrigger>
              ))}
            </TabsList>
            {DYNAMIC_EVENTS.map(ev => (
              <TabsContent key={ev.key} value={ev.key}>
                <h3 className="font-bold mb-2">{ev.label} - EV</h3>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : renderDynamicTable(dynEvent.EV[ev.key] || [])}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
        {/* Dynamic CV */}
        <TabsContent value="dynamic_cv">
          <Tabs value={activeDynCvTab} onValueChange={setActiveDynCvTab} className="mt-4">
            <TabsList>
              {DYNAMIC_EVENTS.map(ev => (
                <TabsTrigger key={ev.key} value={ev.key}>{ev.label}</TabsTrigger>
              ))}
            </TabsList>
            {DYNAMIC_EVENTS.map(ev => (
              <TabsContent key={ev.key} value={ev.key}>
                <h3 className="font-bold mb-2">{ev.label} - CV</h3>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : renderDynamicTable(dynEvent.CV[ev.key] || [])}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
        {/* Static EV */}
        <TabsContent value="static_ev">
          <Tabs value={activeStaticEvTab} onValueChange={setActiveStaticEvTab} className="mt-4">
            <TabsList>
              {STATIC_EVENTS.map(ev => (
                <TabsTrigger key={ev.key} value={ev.key}>{ev.label}</TabsTrigger>
              ))}
            </TabsList>
            {STATIC_EVENTS.map(ev => (
              <TabsContent key={ev.key} value={ev.key}>
                <h3 className="font-bold mb-2">{ev.label} - EV</h3>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : renderStaticTable(staticEvent.EV[ev.key] || [])}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
        {/* Static CV */}
        <TabsContent value="static_cv">
          <Tabs value={activeStaticCvTab} onValueChange={setActiveStaticCvTab} className="mt-4">
            <TabsList>
              {STATIC_EVENTS.map(ev => (
                <TabsTrigger key={ev.key} value={ev.key}>{ev.label}</TabsTrigger>
              ))}
            </TabsList>
            {STATIC_EVENTS.map(ev => (
              <TabsContent key={ev.key} value={ev.key}>
                <h3 className="font-bold mb-2">{ev.label} - CV</h3>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : renderStaticTable(staticEvent.CV[ev.key] || [])}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}
