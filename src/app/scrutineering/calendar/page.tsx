'use client'
import React from "react"
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import getSupabaseClient, { ensureSupabaseConnection } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  Calendar, 
  Clock, 
  Zap, 
  Wrench, 
  Battery, 
  Plus, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  LayoutGrid,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { todayInEventTz } from '@/lib/utils/formatting'
import { logger } from '@/lib/utils/logger'

type InspectionType = {
  id: string
  name: string
  duration_minutes: number
  concurrent_slots: number
  sort_order: number
  active: boolean
  key: string
  prerequisites?: string[]
}

type Booking = {
  id: string
  inspection_type_id: string
  team_id: string
  start_time: string
  end_time: string
  resource_index: number
  status: string
  date: string
  teams?: { name: string; code: string } | null
  inspection_types?: { name: string } | null
}

// core inspections only
const allowedTypes = ['Mechanical Inspection', 'Accumulator Inspection', 'Electrical Inspection', 'Pre-Inspection']

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; gradient: string; accent: string; icon: React.ReactNode }> = {
  'Electrical Inspection': { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-400', 
    border: 'border-blue-500/30',
    gradient: 'from-blue-600/20 to-transparent',
    accent: 'bg-blue-500',
    icon: <Zap className="w-5 h-5" />
  },
  'Mechanical Inspection': { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-400', 
    border: 'border-amber-500/30',
    gradient: 'from-amber-600/20 to-transparent',
    accent: 'bg-amber-500',
    icon: <Wrench className="w-5 h-5" />
  },
  'Accumulator Inspection': { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-400', 
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-600/20 to-transparent',
    accent: 'bg-emerald-500',
    icon: <Battery className="w-5 h-5" />
  },
  'Pre-Inspection': { 
    bg: 'bg-slate-500/10', 
    text: 'text-slate-400', 
    border: 'border-slate-500/30',
    gradient: 'from-slate-600/20 to-transparent',
    accent: 'bg-slate-500',
    icon: <LayoutGrid className="w-5 h-5" />
  }
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode; pulse?: boolean }> = {
  confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: <Clock className="w-3 h-3" /> },
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: <AlertTriangle className="w-3 h-3" />, pulse: true },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
  no_show: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: <Users className="w-3 h-3" /> },
  upcoming: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: <Calendar className="w-3 h-3" /> },
}

export default function ScrutineeringCalendarPage() {
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const today = todayInEventTz()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const router = useRouter()
  const { profile: authProfile, loading: authLoading } = useAuth()

  const fetchData = useCallback(async () => {
    if (authLoading) return
    
    setLoading(true)
    setError(null)
    try {
      const connected = await ensureSupabaseConnection()
      if (!connected) throw new Error('Database connection offline')

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Authentication required')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('app_role, team_id')
        .eq('id', user.id)
        .single()
      
      setTeamId(profile?.team_id || null)

      const { data: types } = await supabase
        .from('inspection_types')
        .select('*')
        .order('sort_order')
      
      const filteredTypes = (types ?? []).filter(t => allowedTypes.includes(t.name))
      setInspectionTypes(filteredTypes as InspectionType[])

      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, teams(name, code), inspection_types(name)')
        .eq('date', today)
        .order('start_time', { ascending: true })
      
      setAllBookings((bookings ?? []) as unknown as Booking[])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'System Failure'
      setError(msg)
      toast.error(msg)
      logger.error('[Calendar] Critical load error', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, today, authLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const typeStyle = (name: string) => TYPE_STYLES[name] || {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    gradient: 'from-slate-600/20 to-transparent',
    accent: 'bg-slate-500',
    icon: <LayoutGrid className="w-5 h-5" />
  }

  if (authLoading || loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synchronizing Uplink...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 bg-slate-50/50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
              Operational <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Lanes</span>
            </h1>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-3 h-3" />
              <p className="text-[9px] font-bold uppercase tracking-widest leading-none">
                Active Date: <span className="text-gray-700">{new Date(today).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button
              onClick={() => router.push('/scrutineering/book')}
              className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-5 font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Reserve Lane
            </Button>
            <Button
              onClick={fetchData}
              variant="outline"
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>

      {/* Grid of Inspection Lanes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {inspectionTypes.map(type => {
          const style = typeStyle(type.name)
          const typeBookings = allBookings.filter(b => b.inspection_type_id === type.id)
          
          return (
            <Card key={type.id} className="shadow-lg border-gray-200 flex flex-col h-[580px]">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 py-4 px-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${style.bg} border ${style.border}`}>
                    {style.icon}
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-gray-900 tracking-tight leading-4 uppercase mb-0.5">{type.name}</h2>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-3">{type.concurrent_slots} Active Lanes</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 flex-1 overflow-y-auto scrollbar-hide space-y-3 bg-slate-50/30">
                {typeBookings.length > 0 ? (
                  typeBookings.map((b, idx) => {
                    const status = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
                    const isYours = b.team_id === teamId
                    const isNext = idx === 0 && b.status !== 'completed' && b.status !== 'no_show'
                    const isPrivileged = authProfile?.app_role === 'admin' || authProfile?.app_role === 'scrutineer'
                    const showDetails = isYours || isPrivileged
                    
                    return (
                      <div 
                        key={b.id}
                        className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
                          isYours 
                            ? 'bg-slate-900 border-primary shadow-xl shadow-primary/20 scale-[1.02]' 
                            : isNext
                              ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-50'
                              : 'bg-white border-gray-100 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${isYours ? 'text-primary' : 'text-slate-400'}`}>
                                {showDetails ? `Car #${b.teams?.code || '??'}` : 'Reserved'}
                              </span>
                              {isNext && (
                                <Badge className="bg-blue-500 text-[8px] font-black uppercase tracking-widest h-4 px-1.5 border-0">Next Up</Badge>
                              )}
                            </div>
                            <div className={`text-sm font-black tracking-tight truncate ${isYours ? 'text-white' : 'text-slate-900'}`}>
                              {showDetails ? b.teams?.name : 'Unavailable'}
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-lg ${status.bg} ${status.text} flex items-center justify-center`}>
                            {status.icon}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                             <Clock className={`w-3.5 h-3.5 ${isYours ? 'text-slate-400' : 'text-slate-500'}`} />
                             <span className={`text-xs font-bold ${isYours ? 'text-slate-300' : 'text-slate-700'}`}>{b.start_time}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-2 h-5 border-white/10 ${isYours ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-500 font-bold'}`}>
                            Lane {b.resource_index}
                          </Badge>
                        </div>
                        
                        {isYours && (
                          <div className="absolute -top-1 -right-1">
                            <div className="px-2 py-0.5 bg-primary text-[8px] font-black text-white rounded-lg shadow-lg uppercase tracking-widest ring-2 ring-slate-900">Your Session</div>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 py-12">
                    <LayoutGrid className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Active Bookings</p>
                  </div>
                )}
                
                <button 
                  onClick={() => router.push('/scrutineering/book')}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-white transition-all text-slate-300 hover:text-primary flex items-center justify-center gap-3 group mt-2"
                >
                  <Plus className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs font-bold uppercase tracking-wider">Book New Slot</span>
                </button>
              </CardContent>
              
              <div className="p-4 bg-slate-900/5 border-t border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{typeBookings.filter(b => b.status === 'completed').length} Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest tracking-tighter">Station Online</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

    </div>
  )
}
