'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Loader2, 
  FileText, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  Users,
  Calendar,
  Zap,
  Wrench,
  Battery,
  Lock,
  Save,
  Check,
  X,
  Activity
} from 'lucide-react'
import jsPDF from 'jspdf'
import { logger } from '@/lib/utils/logger'
import toast from 'react-hot-toast'

type Team = {
  name: string
  code: string
}

type InspectionType = {
  name: string
}

type InspectionResult = {
  status: string
  completed_at?: string
}

type Booking = {
  id: string
  team_id: string
  inspection_type_id: string
  date: string
  start_time: string
  end_time: string
  status: string
  completed_at?: string
  inspection_types?: InspectionType | null
  teams?: Team | null
  inspection_results?: InspectionResult[] | null
}

type ChecklistTemplate = {
  id: string
  inspection_type_id: string
  section: string
  description: string
  order_index: number
  required: boolean
}

type UserProfile = {
  id: string
  first_name: string
  last_name: string
  app_role: string
  email?: string
}

type InspectionProgress = {
  id: string
  booking_id: string
  item_id: string
  user_id: string
  checked_at: string | null
  status: string | null
  comment: string
  locked: boolean
  user_profiles?: UserProfile | null
}

type InspectionComment = {
  id: string
  booking_id: string
  item_id: string
  user_id: string
  comment: string
  created_at: string
  user_profiles?: {
    first_name: string
    last_name: string
  } | null
}

export default function ChecklistBookingPage() {
  const params = useParams<{ bookingId: string }>()
  const bookingId = params?.bookingId
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [booking, setBooking] = useState<Booking | null>(null)
  const [checklist, setChecklist] = useState<ChecklistTemplate[]>([])
  const [status, setStatus] = useState<Record<string, InspectionProgress>>({})
  const [user, setUser] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<string>('')
  const [readonly, setReadonly] = useState(false)
  const [commenting, setCommenting] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, InspectionComment[]>>({})
  const [reinspectLoading, setReinspectLoading] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    Electrical: <Zap className="w-5 h-5" />,
    Mechanical: <Wrench className="w-5 h-5" />,
    Accumulator: <Battery className="w-5 h-5" />,
  }

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true)
        setError(null)
        // User and profile
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          logger.error('[Inspection] Auth error', userError, { context: 'auth_check' })
          throw new Error('Auth session missing! Please sign in again.')
        }
        if (!authUser) {
          throw new Error('Auth session missing! Please sign in again.')
        }
        if (authUser) {
          const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('*').eq('id', authUser.id).single()
          if (profileError) throw profileError
          setUser(userProfile as UserProfile)
          setRole(userProfile?.app_role || '')
          setReadonly(['team_leader', 'team_member'].includes(userProfile?.app_role || ''))
        }
        // Booking & base info
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`*, inspection_types(name), teams(name, code), inspection_results(status, completed_at)`)
          .eq('id', bookingId)
          .single()
        if (bookingError) throw bookingError
        setBooking(bookingData as unknown as Booking)
        // Checklist items
        const { data: items, error: itemsError } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('inspection_type_id', (bookingData as any)?.inspection_type_id || '')
          .order('section')
          .order('order_index')
        if (itemsError) throw itemsError
        setChecklist((items ?? []) as ChecklistTemplate[])
        // Progress
        const { data: progress, error: progressError } = await supabase
          .from('inspection_progress')
          .select(`*, user_profiles!inspection_progress_user_id_fkey(first_name, last_name, app_role)`)
          .eq('booking_id', bookingId)
        if (progressError) throw progressError
        const s: Record<string, InspectionProgress> = {}
        for (const rec of (progress ?? []) as any[]) s[rec.item_id] = rec as InspectionProgress
        setStatus(s)
        
        // If inspection has progress but status is not ongoing/completed, set it to ongoing
        const hasProgress = Object.keys(s).length > 0
        const bookingStatus = (bookingData as any)?.status
        const resultStatus = (bookingData as any)?.inspection_results?.[0]?.status
        const isPassedOrFailed = resultStatus === 'passed' || resultStatus === 'failed'
        const isCompleted = bookingStatus === 'completed'
        
        if (hasProgress && !isCompleted && !isPassedOrFailed && bookingStatus !== 'ongoing') {
          // Set booking status to ongoing if inspection has started
          try {
            const { error: statusError } = await supabase
              .from('bookings')
              .update({ status: 'ongoing' } as any)
              .eq('id', bookingId)
            
            if (!statusError) {
              setBooking(prev => prev ? { ...prev, status: 'ongoing' } : null)
            } else {
              logger.error('[Inspection] Error setting status to ongoing on load', statusError, { context: 'load_all', bookingId })
            }
          } catch (statusErr) {
            logger.error('[Inspection] Error setting status to ongoing on load', statusErr, { context: 'load_all', bookingId })
          }
        }
        
        // Comments
        const { data: comms, error: commentsErr } = await (supabase as any)
          .from('inspection_comments')
          .select(`*, user_profiles!inspection_comments_user_id_fkey(first_name, last_name)`)
          .eq('booking_id', bookingId)
        if (commentsErr) throw commentsErr
        const perItem: Record<string, InspectionComment[]> = {}
        for (const c of (comms ?? []) as any[]) {
          if (!perItem[c.item_id]) perItem[c.item_id] = []
          perItem[c.item_id].push(c as InspectionComment)
        }
        setComments(perItem)
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error.message)
        toast.error(error.message)
        logger.error('[Inspection] Error loading inspection', err, { context: 'load_all', bookingId })
      } finally {
        setLoading(false)
      }
    }
    if (bookingId) {
      loadAll()
      pollingRef.current = setInterval(loadAll, 9000)
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [bookingId, supabase])

  // Set booking status to "ongoing" when inspection starts
  useEffect(() => {
    async function ensureOngoingStatus() {
      if (!booking || readonly) return
      
      // Check if inspection has started (has any progress items)
      const hasProgress = Object.keys(status).length > 0
      const isCompleted = booking.status === 'completed'
      const resultStatus = booking?.inspection_results?.[0]?.status
      const isPassedOrFailed = resultStatus === 'passed' || resultStatus === 'failed'
      
      // Set to ongoing if:
      // 1. Has progress items (inspection has started)
      // 2. Not already completed
      // 3. Not already passed or failed
      if (hasProgress && !isCompleted && !isPassedOrFailed && booking.status !== 'ongoing') {
        try {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'ongoing' } as any)
            .eq('id', booking.id)
          
          if (error) {
            logger.error('[Inspection] Error setting status to ongoing', error, { context: 'ensure_ongoing', bookingId })
          } else {
            // Update local state
            setBooking(prev => prev ? { ...prev, status: 'ongoing' } : null)
          }
        } catch (err) {
          logger.error('[Inspection] Error in ensureOngoingStatus', err, { context: 'ensure_ongoing', bookingId })
        }
      }
    }
    
    ensureOngoingStatus()
  }, [booking, status, readonly, supabase, bookingId])

  async function markItem(item_id: string, checked: boolean) {
    const isLocked = status[item_id]?.locked ?? false
    if (readonly || (isLocked && !['admin', 'scrutineer'].includes(role))) return
    setSaving(true)
    if (!user) {
      setError("User not loaded, can't mark item."); setSaving(false)
      return
    }
    
    try {
      if (checked) {
        // When checking: create or update the progress record
        const payload: Partial<InspectionProgress> = {
          booking_id: bookingId,
          item_id,
          user_id: user.id,
          checked_at: new Date().toISOString(),
          status: 'passed',
          comment: status[item_id]?.comment || ''
        }
        
        // Optimistically update UI
        setStatus(prev => ({
          ...prev,
          [item_id]: { ...prev[item_id], ...payload } as InspectionProgress
        }))
        
        const { error } = await supabase
          .from('inspection_progress')
          .upsert([payload as any], { onConflict: 'booking_id,item_id', ignoreDuplicates: false })
        
        if (error) {
          // Revert optimistic update
          setStatus(prev => {
            const newStatus = { ...prev }
            if (prev[item_id]) {
              delete newStatus[item_id]
            }
            return newStatus
          })
          const errorMsg = 'Failed to save. Please check your permissions and RLS settings. ' + error.message
          setError(errorMsg)
          toast.error(errorMsg)
          logger.error('[Inspection] Error saving item', error, { context: 'mark_item', item_id, bookingId })
          return
        }
        
        // If this is the first item being checked, set booking status to "ongoing"
        const wasFirstItem = Object.keys(status).length === 0
        if (wasFirstItem && booking && booking.status !== 'ongoing' && booking.status !== 'completed') {
          try {
            const { error: statusError } = await supabase
              .from('bookings')
              .update({ status: 'ongoing' } as any)
              .eq('id', bookingId)
            
            if (!statusError) {
              setBooking(prev => prev ? { ...prev, status: 'ongoing' } : null)
            } else {
              logger.error('[Inspection] Error setting status to ongoing', statusError, { context: 'mark_item', bookingId })
            }
          } catch (statusErr) {
            logger.error('[Inspection] Error setting status to ongoing', statusErr, { context: 'mark_item', bookingId })
          }
        }
        
        toast.success('Item checked successfully')
      } else {
        // When unchecking: delete the progress record
        // Optimistically update UI
        setStatus(prev => {
          const newStatus = { ...prev }
          delete newStatus[item_id]
          return newStatus
        })
        
        const { error } = await supabase
          .from('inspection_progress')
          .delete()
          .eq('booking_id', bookingId)
          .eq('item_id', item_id)
        
        if (error) {
          // Revert optimistic update by reloading
          const { data: progress } = await supabase
            .from('inspection_progress')
            .select(`*, user_profiles!inspection_progress_user_id_fkey(first_name, last_name, app_role)`)
            .eq('booking_id', bookingId)
          
          if (progress) {
            const s: Record<string, InspectionProgress> = {}
            for (const rec of (progress ?? []) as any[]) s[rec.item_id] = rec as InspectionProgress
            setStatus(s)
          }
          
          const errorMsg = 'Failed to uncheck item. Please check your permissions and RLS settings. ' + error.message
          setError(errorMsg)
          toast.error(errorMsg)
          logger.error('[Inspection] Error unchecking item', error, { context: 'mark_item', item_id, bookingId })
          return
        }
        toast.success('Item unchecked successfully')
      }
      setError(null)
    } catch (e) {
      const errorMsg = 'Failed to save. Caught JS error.'
      setError(errorMsg)
      toast.error(errorMsg)
      logger.error('[Inspection] JS error saving item', e, { context: 'mark_item', item_id, bookingId })
      
      // Reload status on error
      try {
        const { data: progress } = await supabase
          .from('inspection_progress')
          .select(`*, user_profiles!inspection_progress_user_id_fkey(first_name, last_name, app_role)`)
          .eq('booking_id', bookingId)
        
        if (progress) {
          const s: Record<string, InspectionProgress> = {}
          for (const rec of (progress ?? []) as any[]) s[rec.item_id] = rec as InspectionProgress
          setStatus(s)
        }
      } catch (reloadError) {
        logger.error('[Inspection] Error reloading status', reloadError, { context: 'mark_item_reload', bookingId })
      }
    } finally {
      setSaving(false)
    }
  }

  function openComment(item_id: string) { setCommenting(item_id); setCommentDraft('') }
  async function saveComment(item_id: string) {
    const isLocked = status[item_id]?.locked ?? false
    if (readonly || (isLocked && !['admin', 'scrutineer'].includes(role))) return
    setSaving(true)
    try {
      const failed = status[item_id]?.status !== 'passed'
      if (failed && !commentDraft) {
        setError("You must enter a comment describing the failure.")
        setSaving(false)
        return
      }
      const { error: commentError } = await (supabase as any).from('inspection_comments').insert({
        booking_id: bookingId,
        item_id: item_id,
        user_id: user?.id,
        comment: commentDraft,
        created_at: new Date().toISOString()
      } as any)
      
      if (commentError) {
        throw commentError
      }
      
      setCommenting(null)
      setCommentDraft('')
      setError(null)
      toast.success('Comment saved successfully')
      
      // Reload comments
      const { data: comms } = await (supabase as any)
        .from('inspection_comments')
        .select(`*, user_profiles!inspection_comments_user_id_fkey(first_name, last_name)`)
        .eq('booking_id', bookingId)
      
      if (comms) {
        const perItem: Record<string, InspectionComment[]> = {}
        for (const c of (comms ?? []) as any[]) {
          if (!perItem[c.item_id]) perItem[c.item_id] = []
          perItem[c.item_id].push(c as InspectionComment)
        }
        setComments(perItem)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save comment. Please check your permissions.'
      setError(errorMsg)
      toast.error(errorMsg)
      logger.error('[Inspection] Error saving comment', err, { context: 'save_comment', item_id, bookingId })
    } finally {
      setSaving(false)
    }
  }

  async function exportPDF() {
    if (!booking) {
      toast.error('Booking data not available')
      return
    }
    
    try {
      const { data: progress, error: progressError } = await supabase
        .from('inspection_progress')
        .select('*, user_profiles(first_name, last_name)')
        .eq('booking_id', bookingId)
      
      if (progressError) throw progressError
      
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text(`Inspection Report`, 10, 10)
      doc.setFontSize(12)
      doc.text(`Inspection: ${booking.inspection_types?.name ?? ""}`, 10, 20)
      doc.text(`Team: ${booking.teams?.name ?? ""} (${booking.teams?.code ?? "-"})`, 10, 27)
      doc.text(`Date: ${booking.date}`, 10, 34)
      doc.text(`Slot: ${booking.start_time} - ${booking.end_time}`, 10, 41)
      doc.text(`Status: ${booking.inspection_results?.[0]?.status ?? booking.status ?? '-'}`, 10, 48)
      doc.text(`Checklist Items:`, 10, 58)
      
      let yPos = 65
      type ProgressItem = {
        item_id: string
        status?: string
        user_profiles?: { first_name?: string; last_name?: string } | null
        user_id?: string
      }
      ((progress ?? []) as ProgressItem[]).forEach((p, i: number) => {
        const inspectorName = p.user_profiles 
          ? `${p.user_profiles.first_name ?? ''} ${p.user_profiles.last_name ?? ''}`.trim()
          : p.user_id ?? 'Unknown'
        doc.text(
          `${i + 1}. ${p.item_id} - Status: ${p.status ?? '-'} - By: ${inspectorName}`,
          10, yPos
        )
        yPos += 7
        if (yPos > 280) {
          doc.addPage()
          yPos = 20
        }
      })
      
      const fileName = `${booking.teams?.name ?? ""}_${booking.inspection_types?.name ?? ""}_${booking.start_time}.pdf`
      doc.save(fileName)
      toast.success('PDF exported successfully')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to export PDF'
      toast.error(errorMsg)
      logger.error('[Inspection] Error exporting PDF', err, { context: 'export_pdf', bookingId })
    }
  }

  // Mark completion, only for edit roles
  async function markInspectionComplete(passed: boolean) {
    if (readonly) return
    if (passed && !allChecked) {
      setError('All checklist items must be completed before marking as passed')
      return
    }
    setSaving(true)
    try {
      await supabase
        .from('bookings')
        .update({ status: 'completed', completed_at: new Date().toISOString() } as any)
        .eq('id', bookingId)
      await supabase
        .from('inspection_results')
        .upsert([{
          booking_id: bookingId,
          status: passed ? 'passed' : 'failed',
          completed_at: new Date().toISOString(),
          scrutineer_ids: user ? [user.id] : []
        } as any])
      const { error: progressError } = await supabase
        .from('inspection_progress')
        .update({ locked: true } as any)
        .eq('booking_id', bookingId)
      
      if (progressError) throw progressError
      
      setError(null)
      toast.success(`Inspection marked as ${passed ? 'Passed' : 'Failed'}!`)
      
      // Small delay to show toast before redirect
      setTimeout(() => {
        router.push('/scrutineering/live')
      }, 1000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete inspection. Please check permissions.'
      setError(errorMsg)
      toast.error(errorMsg)
      logger.error('[Inspection] Error completing inspection', err, { context: 'mark_complete', bookingId, passed })
    } finally {
      setSaving(false)
    }
  }

  // --------------- REINSPECT LOGIC
  const canReinspect = (
    (role === 'scrutineer' || role === 'admin') &&
      booking?.status === 'completed' &&
      booking?.inspection_results?.[0]?.status === 'passed'
  )

  async function handleReinspect() {
    if (!confirm('Are you sure you want to reset this inspection? This will mark it as failed and unlock all checkpoints.')) {
      return
    }
    
    setReinspectLoading(true)
    try {
      const { error: resultError } = await supabase
        .from('inspection_results')
        .update({ status: 'failed', completed_at: null } as any)
        .eq('booking_id', bookingId)
      
      if (resultError) throw resultError
      
      const { error: progressError } = await supabase
        .from('inspection_progress')
        .update({ status: 'failed', comment: null, locked: false } as any)
        .eq('booking_id', bookingId)
      
      if (progressError) throw progressError
      
      toast.success('Inspection reset successfully')
      router.replace(`/scrutineering/live/${bookingId}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reset for re-inspection. Please check RLS and permissions.'
      setError(errorMsg)
      toast.error(errorMsg)
      logger.error('[Inspection] Error resetting inspection', err, { context: 'reinspect', bookingId })
    } finally {
      setReinspectLoading(false)
    }
  }
  // --------------------------------

  const allChecked = checklist.length > 0 && checklist.every(item => status[item.id]?.status === 'passed')
  const completionCount = checklist.filter(item => status[item.id]?.status === 'passed').length

  const itemsBySection: Record<string, ChecklistTemplate[]> = {}
  for (const item of checklist) {
    if (!itemsBySection[item.section]) itemsBySection[item.section] = []
    itemsBySection[item.section].push(item)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-gray-600 font-medium">Loading inspection checklist...</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading inspection</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 gap-2"
              onClick={() => router.push('/scrutineering/live')}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const inspectionTypeName = booking?.inspection_types?.name ?? 'Inspection'
  const resultStatus = booking?.inspection_results?.[0]?.status
  const progressPercentage = checklist.length > 0 ? (completionCount / checklist.length) * 100 : 0

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <Button 
            variant="ghost" 
            className="mb-4 gap-2"
            onClick={() => router.push('/scrutineering/live')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
          </Button>
          <div className="flex items-center gap-3 mb-3">
            {TYPE_ICONS[inspectionTypeName]}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              {inspectionTypeName}
            </h1>
            {booking?.status === "ongoing" && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Activity className="w-3 h-3 mr-1" />
                Ongoing
              </Badge>
            )}
            {booking?.status === "completed" && resultStatus === 'passed' && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Passed
              </Badge>
            )}
            {booking?.status === "completed" && resultStatus === 'failed' && (
              <Badge className="bg-red-100 text-red-800 border-red-300">
                <XCircle className="w-3 h-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{booking?.teams?.name}</span>
              {booking?.teams?.code && (
                <Badge variant="outline" className="text-xs">
                  {booking.teams.code}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{booking?.start_time} - {booking?.end_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{booking?.date}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Inspector</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {user?.first_name} {user?.last_name}
              </Badge>
              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                {role}
              </Badge>
            </div>
          </div>
          {(role === 'scrutineer' || role === 'judge' || role === 'admin') && booking?.status === 'completed' && (
            <Button
              variant="outline"
              onClick={exportPDF}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
          )}
          {canReinspect && (
            <Button
              variant="outline"
              disabled={reinspectLoading}
              onClick={handleReinspect}
              className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              {reinspectLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Re-inspect
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="shadow-lg border-gray-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Inspection Progress</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {completionCount} of {checklist.length} items completed
                </p>
              </div>
              <Badge variant="outline" className="text-lg font-bold">
                {Math.round(progressPercentage)}%
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>
      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Sections */}
      <div className="space-y-6">
        {Object.entries(itemsBySection).map(([section, items]) => (
          <Card key={section} className="shadow-md border-gray-200">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
              <CardTitle className="text-xl">{section}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {items.map((item, idx) => {
                  const isLocked = status[item.id]?.locked ?? false
                  const isDisabled = saving || readonly || (isLocked && !['admin','scrutineer'].includes(role))
                  const isChecked = status[item.id]?.status === 'passed'
                  const itemComments = comments[item.id] || []
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        isChecked 
                          ? 'bg-green-50/50 border-green-300' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      } ${isDisabled ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => markItem(item.id, checked === true)}
                            disabled={isDisabled}
                            className="w-5 h-5"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <label className="flex items-center gap-2 cursor-pointer" onClick={() => !isDisabled && markItem(item.id, !isChecked)}>
                                <span className="font-bold text-gray-900 text-base">
                                  {idx + 1}. {item.description}
                                </span>
                                {item.required && (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                                    Required
                                  </Badge>
                                )}
                              </label>
                              {status[item.id]?.checked_at && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  <span>
                                    Checked by{' '}
                                    <span className="font-semibold text-gray-700">
                                      {status[item.id]?.user_profiles
                                        ? `${status[item.id].user_profiles?.first_name} ${status[item.id].user_profiles?.last_name}`
                                        : user?.email || user?.id}
                                    </span>
                                    {' '}at {new Date(status[item.id].checked_at as string).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isLocked && (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openComment(item.id)}
                                disabled={isDisabled}
                                className="gap-2"
                                title={`${itemComments.length} comment${itemComments.length !== 1 ? 's' : ''}`}
                              >
                                <MessageSquare className="w-4 h-4" />
                                {itemComments.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {itemComments.length}
                                  </Badge>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Action Buttons */}
      {!readonly && (
        <Card className="shadow-lg border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                variant="destructive"
                onClick={() => markInspectionComplete(false)}
                disabled={saving}
                className="gap-2"
                size="lg"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Mark as Failed
              </Button>
              <Button
                onClick={() => markInspectionComplete(true)}
                disabled={!allChecked || saving}
                className="gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                size="lg"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Mark as Passed
              </Button>
            </div>
            {!allChecked && (
              <p className="text-sm text-amber-600 mt-3 text-right flex items-center justify-end gap-1">
                <AlertCircle className="w-4 h-4" />
                All checklist items must be completed before marking as passed
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {/* Comments Dialog */}
      <Dialog open={!!commenting} onOpenChange={(open) => !open && setCommenting(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments for Checklist Item
            </DialogTitle>
            <DialogDescription>
              View and add comments for this inspection item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(comments[commenting || '']?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Previous Comments</h4>
                {comments[commenting || '']?.map(c => (
                  <Card key={c.id} className="border-gray-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {c.user_profiles
                                  ? `${c.user_profiles.first_name?.[0] || ''}${c.user_profiles.last_name?.[0] || ''}`
                                  : 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">
                                {c.user_profiles
                                  ? `${c.user_profiles.first_name} ${c.user_profiles.last_name}`
                                  : c.user_id}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(c.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No comments yet</p>
              </div>
            )}
            
            {!readonly && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-700">
                  Add Comment
                </label>
                <Textarea
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  placeholder="Enter your comment here..."
                  rows={4}
                  className="resize-none"
                  disabled={saving}
                />
                {status[commenting || '']?.status !== 'passed' && !commentDraft && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    A comment is required when marking an item as failed
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCommenting(null)
                      setCommentDraft('')
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveComment(commenting!)}
                    disabled={saving || (!commentDraft && status[commenting || '']?.status !== 'passed')}
                    className="gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Comment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
