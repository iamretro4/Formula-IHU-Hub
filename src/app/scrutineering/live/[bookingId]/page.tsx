'use client'
import { use, useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
  vehicle_class?: string
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
  notes?: string
  started_at?: string
  completed_at?: string
  inspection_types?: {
    name: string
    duration_minutes: number
    key: string
  } | null
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
  vehicle_class?: 'EV' | 'CV'
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

type PageProps = {
  params: Promise<{ bookingId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default function ChecklistBookingPage({ params, searchParams }: PageProps) {
  const { bookingId } = use(params)
  use(searchParams ?? Promise.resolve({}))
  const router = useRouter()
  const { profile: authProfile, loading: authLoading } = useAuth()
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

  // Restricted roles redirect (viewers or unassigned)
  useEffect(() => {
    if (authLoading || !authProfile) return
    const allowedRoles = ['admin', 'scrutineer', 'team_leader', 'inspection_responsible']
    if (!allowedRoles.includes(authProfile.app_role)) {
      router.replace('/dashboard')
    }
  }, [authLoading, authProfile, router])

  // Timer logic
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!booking || booking.status !== 'ongoing' || !booking.started_at) {
      setTimeLeft(null)
      return
    }

    const durationMinutes = booking.inspection_types?.duration_minutes || 120
    const start = new Date(booking.started_at).getTime()
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const elapsed = (now - start) / 1000 / 60
      const remaining = Math.max(0, durationMinutes - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(timer)
    }, 1000)

    return () => clearInterval(timer)
  }, [booking])

  function formatTime(minutes: number) {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
        if (userError || !authUser) {
          // If the session is missing (usually because the user logged out), silently redirect instead of throwing noisy errors
          router.replace('/auth/signin')
          return
        }
        if (authUser) {
          const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('*').eq('id', authUser.id).single()
          if (profileError) throw profileError
          setUser(userProfile as UserProfile)
          setRole(userProfile?.app_role || '')
          setReadonly(['team_leader', 'team_member', 'inspection_responsible'].includes(userProfile?.app_role || ''))
        }
        // Booking & base info
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`*, inspection_types(name, duration_minutes, key), teams(name, code, vehicle_class), inspection_results(status, completed_at)`)
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

        // Filter items by vehicle class if team has one
        const teamVehicleClass = (bookingData as any)?.teams?.vehicle_class
        const filteredItems = (items ?? []).filter((item: any) => 
          !item.vehicle_class || !teamVehicleClass || item.vehicle_class === teamVehicleClass
        )
        setChecklist(filteredItems as ChecklistTemplate[])
        // Progress
        const { data: progress, error: progressError } = await supabase
          .from('inspection_progress')
          .select(`*, user_profiles(first_name, last_name, app_role)`)
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
          .select(`*, user_profiles(first_name, last_name)`)
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
    }
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
            .update({ 
              status: 'ongoing',
              started_at: booking.started_at || new Date().toISOString()
            } as any)
            .eq('id', booking.id)
          
          if (error) {
            logger.error('[Inspection] Error setting status to ongoing', error, { context: 'ensure_ongoing', bookingId })
          } else {
            // Update local state
            setBooking(prev => prev ? { ...prev, status: 'ongoing', started_at: prev.started_at || new Date().toISOString() } : null)
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
          [item_id]: { 
            ...prev[item_id], 
            ...payload,
            user_profiles: {
              first_name: user?.first_name || 'System',
              last_name: user?.last_name || '',
              app_role: role
            }
          } as InspectionProgress
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
            const updates: any = { status: 'ongoing' }
            if (!booking.started_at) updates.started_at = new Date().toISOString()
            
            const { error: statusError } = await supabase
              .from('bookings')
              .update(updates)
              .eq('id', bookingId)
            
            if (!statusError) {
              setBooking(prev => prev ? { ...prev, ...updates } : null)
              // 🔔 Discord: Inspection started
              fetch('/api/discord/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'inspection_started',
                  teamName: booking.teams?.name || 'Unknown',
                  teamCode: booking.teams?.code || '??',
                  inspectionType: booking.inspection_types?.name || 'Inspection',
                  scrutineerName: user ? `${user.first_name} ${user.last_name}` : undefined,
                }),
              }).catch(() => {})
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
            .select(`*, user_profiles(first_name, last_name, app_role)`)
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
          .select(`*, user_profiles(first_name, last_name, app_role)`)
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
        .select(`*, user_profiles(first_name, last_name)`)
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
      const pageWidth = doc.internal.pageSize.getWidth()
      const primaryColor = '#FFD700' // Gold
      const headerColor = [30, 58, 138] as [number, number, number] // Deep Blue
      
      // --- HEADER & BRANDING ---
      doc.setFillColor(...headerColor)
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      // Stylized Logo Text
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('FORMULA', 15, 20)
      doc.setTextColor(primaryColor)
      doc.text('IHU 2026', 62, 20)
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`OFFICIAL SCRUTINEERING REPORT`, 15, 28)
      
      // --- STICKERS TABLE (FIHU Specialty) ---
      const stickerX = pageWidth - 90
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.5)
      
      const stickerTypes = ['MECH', 'ACC', 'ELEC', 'TILT', 'R/N', 'BRAKE']
      stickerTypes.forEach((label, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        const x = stickerX + (col * 25)
        const y = 8 + (row * 14)
        
        doc.rect(x, y, 22, 12, 'S')
        doc.setFontSize(7)
        doc.text(label, x + 11, y + 4, { align: 'center' })
        
        // Mark current if applicable
        const isCurrent = booking.inspection_types?.name.toUpperCase().includes(label) || 
                         (label === 'R/N' && (booking.inspection_types?.name.toUpperCase().includes('RAIN') || booking.inspection_types?.name.toUpperCase().includes('NOISE')))
        
        if (isCurrent && booking.inspection_results?.[0]?.status === 'passed') {
          doc.setFontSize(6)
          doc.text('PASSED', x + 11, y + 9, { align: 'center' })
        }
      })
      
      // --- TEAM INFO BOX ---
      doc.setTextColor(33, 33, 33)
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(248, 250, 252)
      doc.rect(10, 45, pageWidth - 20, 35, 'FD')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('TEAM INFORMATION', 15, 52)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Team: ${booking.teams?.name ?? ""}`, 15, 60)
      doc.text(`No: ${booking.teams?.code ?? "-"}`, 15, 67)
      doc.text(`Class: ${booking.teams?.vehicle_class || 'N/A'}`, 15, 74)
      
      doc.text(`Stage: ${booking.inspection_types?.name ?? ""}`, 110, 60)
      doc.text(`Date: ${booking.date}`, 110, 67)
      doc.text(`Result: ${booking.inspection_results?.[0]?.status?.toUpperCase() ?? 'ONGOING'}`, 110, 74)
      
      // --- CHECKLIST ITEMS ---
      let yPos = 95
      const margin = 10
      const contentWidth = pageWidth - (margin * 2)
      
      const sortedItems = [...checklist].sort((a, b) => a.order_index - b.order_index)
      let currentSection = ""
      
      sortedItems.forEach((item) => {
        // Section Header
        if (item.section !== currentSection) {
          if (yPos > 260) { doc.addPage(); yPos = 20 }
          
          doc.setFillColor(240, 240, 240)
          doc.rect(margin, yPos, contentWidth, 8, 'F')
          doc.setDrawColor(200, 200, 200)
          doc.rect(margin, yPos, contentWidth, 8, 'S')
          
          doc.setTextColor(30, 58, 138)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.text(item.section.toUpperCase(), margin + 2, yPos + 6)
          
          yPos += 12
          currentSection = item.section
        }
        
        if (yPos > 275) { doc.addPage(); yPos = 20 }
        
        const isChecked = progress?.find(p => p.item_id === item.id)?.status === 'passed'
        
        // Draw Checkbox Square
        doc.setDrawColor(100, 100, 100)
        doc.rect(margin + 2, yPos - 4, 4, 4, 'S')
        if (isChecked) {
          doc.line(margin + 2, yPos - 4, margin + 6, yPos)
          doc.line(margin + 6, yPos - 4, margin + 2, yPos)
        }
        
        // Item Text
        doc.setTextColor(50, 50, 50)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const splitText = doc.splitTextToSize(item.description, contentWidth - 15)
        doc.text(splitText, margin + 10, yPos)
        
        yPos += (splitText.length * 5) + 3
      })
      
      // --- FOOTER / SIGNATURES ---
      if (yPos > 240) { doc.addPage(); yPos = 20 }
      
      yPos = 265
      doc.setDrawColor(150, 150, 150)
      doc.line(15, yPos, 85, yPos)
      doc.line(115, yPos, 185, yPos)
      
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('OFFICIAL SCRUTINEER SIGNATURE', 15, yPos + 5)
      doc.text('TEAM REPRESENTATIVE SIGNATURE', 115, yPos + 5)
      
      const fileName = `FIHU26_REPORT_${booking.teams?.code ?? "CAR"}_${booking.inspection_types?.key.toUpperCase()}.pdf`
      doc.save(fileName)
      toast.success('Official Scrutineering Report Generated')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to export PDF'
      toast.error(errorMsg)
      logger.error('[Inspection] Error exporting PDF', err, { context: 'export_pdf', bookingId })
    }
  }

  // Mark completion, only for edit roles
  async function markInspectionComplete(passed: boolean, isSuspended: boolean = false, isTimeout: boolean = false) {
    if (readonly) return
    if (passed && !allChecked) {
      setError('All checklist items must be completed before marking as passed')
      return
    }
    setSaving(true)
    try {
      // For timeout or suspension, handle status updates
      const bookingUpdates: any = { 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }
      
      if (isTimeout) {
        bookingUpdates.notes = (booking?.notes ? booking.notes + '\n' : '') + '[SYSTEM] Session timed out.'
      }

      await supabase
        .from('bookings')
        .update(bookingUpdates)
        .eq('id', bookingId)
      
      const finalStatus = isTimeout ? 'failed' : (isSuspended ? 'suspended' : (passed ? 'passed' : 'failed'))
      
      await supabase
        .from('inspection_results')
        .upsert([{
          booking_id: bookingId,
          status: finalStatus,
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
      
      // 🔔 Discord: Inspection passed or failed
      const notifType = passed ? 'inspection_passed' : 'inspection_failed'
      fetch('/api/discord/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: notifType,
          teamName: booking?.teams?.name || 'Unknown',
          teamCode: booking?.teams?.code || '??',
          inspectionType: booking?.inspection_types?.name || 'Inspection',
          vehicleClass: (booking?.teams as any)?.vehicle_class || undefined,
        }),
      }).catch(() => {})
      
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
      
      // 🔔 Discord: Inspection reset
      fetch('/api/discord/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'inspection_reset',
          teamName: booking?.teams?.name || 'Unknown',
          teamCode: booking?.teams?.code || '??',
          inspectionType: booking?.inspection_types?.name || 'Inspection',
          resetBy: user ? `${user.first_name} ${user.last_name}` : undefined,
        }),
      }).catch(() => {})
      
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
        <Card className="border-rose-200 bg-rose-50 shadow-xl">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-rose-900">Communication Error</h2>
              <p className="text-sm text-rose-700 font-medium">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4 gap-2 border-rose-200 hover:bg-rose-100"
                onClick={() => router.push('/scrutineering/live')}
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Command Center
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const team = booking?.teams
  const type = booking?.inspection_types
  const resultStatus = booking?.inspection_results?.[0]?.status

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      {/* Top Progress Ribbon */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-[100] bg-gray-100">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_8px_rgba(var(--primary),0.5)]"
          style={{ width: `${(completionCount / (checklist.length || 1)) * 100}%` }}
        />
      </div>

      {/* Sticky Header Monitor */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/scrutineering/live')}
              className="rounded-xl hover:bg-white/10 hidden sm:flex shrink-0 text-white"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Button>
            
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge className={`text-[8px] h-3.5 px-1.5 border-none font-black tracking-tighter ${
                    team?.vehicle_class === 'EV' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                  }`}>
                    {team?.vehicle_class || 'CLASS'}
                  </Badge>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:block">Team Entity</span>
                </div>
                <h1 className="text-sm sm:text-base font-black text-white truncate leading-none">
                  {team?.name || 'Loading Entity...'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-right hidden md:block">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Active Protocol</div>
              <div className="text-sm font-bold text-white tracking-tight">{type?.name || 'Inspection'}</div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden sm:block" />

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                {timeLeft !== null && (
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2.5 shadow-xl transition-all ${
                    timeLeft < 10 ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-slate-800 text-white border-white/5 shadow-inner'
                  }`}>
                    <Clock className={`w-4 h-4 ${timeLeft < 10 ? 'text-white' : 'text-indigo-400'}`} />
                    <span className="text-base sm:text-xl font-black tabular-nums tracking-tighter font-mono">
                      {timeLeft > 0 ? formatTime(timeLeft) : 'TIMEOUT'}
                    </span>
                  </div>
                )}
                <div className="hidden lg:flex flex-col items-end ml-2">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Saturation</div>
                  <div className="text-xs font-black text-indigo-400 leading-none">{completionCount}/{checklist.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* Status Alert for Completed */}
        {resultStatus && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 shadow-lg ${
            resultStatus === 'passed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
             <div className="flex items-center gap-3 font-black text-sm tracking-tight uppercase">
               {resultStatus === 'passed' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
               Final Report: {resultStatus}
             </div>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={exportPDF}
               className={`rounded-xl font-bold border-current hover:bg-current/10 ${
                 resultStatus === 'passed' ? 'text-emerald-700' : 'text-rose-700'
               }`}
             >
               <FileText className="w-4 h-4 mr-2" />
               Get PDF Report
             </Button>
          </div>
        )}

        {/* Technical Checklist */}
        <div className="space-y-12">
          {Object.entries(itemsBySection).map(([section, items]) => (
            <div key={section} className="relative">
              <div className="sticky top-14 sm:top-16 z-40 bg-slate-900/95 backdrop-blur-xl -mx-4 px-6 py-2.5 flex items-center justify-between border-b border-white/5 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                  <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">{section}</h2>
                </div>
                <Badge variant="outline" className="rounded-full bg-white/5 text-[9px] font-black border-white/10 text-indigo-400">
                  {items.filter(i => status[i.id]?.status === 'passed').length} / {items.length}
                </Badge>
              </div>

              <div className="mt-4 space-y-1">
                {items.map((item) => {
                  const entry = status[item.id]
                  const isChecked = entry?.status === 'passed'
                  const isLocked = entry?.locked
                  const itemComments = comments[item.id] || []
                  
                  return (
                    <div 
                      key={item.id}
                      className={`group relative p-4 sm:p-5 rounded-2xl transition-all duration-300 border ${
                        isChecked 
                          ? 'bg-emerald-50/30 border-emerald-100' 
                          : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <button
                            disabled={readonly || (isLocked && !['admin', 'scrutineer'].includes(role))}
                            onClick={() => markItem(item.id, !isChecked)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                              isChecked 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                : 'bg-white border-gray-200 text-transparent hover:border-emerald-300 group-hover:text-emerald-100'
                            }`}
                          >
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                          </button>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-bold text-gray-800 leading-snug space-y-1">
                            {item.description.split('\n').map((line, i) => (
                              <div key={i} className={line.trim().startsWith('-') || line.trim().startsWith('•') ? 'pl-5 -indent-5' : ''}>
                                {line}
                              </div>
                            ))}
                          </div>
                          
                          {/* Comments View */}
                          {itemComments.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {itemComments.map((c) => (
                                <div key={c.id} className="text-[11px] p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-2">
                                  <MessageSquare className="w-3 h-3 mt-0.5 text-gray-400" />
                                  <div className="flex-1">
                                    <span className="font-bold text-gray-600">{c.user_profiles?.first_name}: </span>
                                    <span className="text-gray-500 italic">"{c.comment}"</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Item Meta */}
                          {(isChecked || entry?.user_profiles) && (
                            <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-gray-400 tracking-tight uppercase">
                              <div className="flex items-center gap-1">
                                {isChecked ? 'Verified' : 'Last activity'}
                              </div>
                              <div className="w-1 h-1 rounded-full bg-gray-300" />
                              <div className="flex items-center gap-1">
                                By {entry?.user_profiles?.first_name || 'System'}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openComment(item.id)}
                            className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-gray-100 ${
                              itemComments.length > 0 ? 'text-primary' : 'text-gray-300'
                            }`}
                          >
                            <MessageSquare className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Bar */}
      {!readonly && !resultStatus && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <div className="p-4 bg-slate-900 border border-white/10 shadow-2xl rounded-3xl backdrop-blur-xl flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex-1 px-4">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Progress</div>
              <div className="flex items-center gap-2">
                <div className="text-xl font-black text-white">{completionCount}</div>
                <div className="text-sm font-bold text-slate-600">/ {checklist.length} Checkpoints</div>
              </div>
            </div>
            
            <div className="flex gap-2 pr-2">
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => markInspectionComplete(false)}
                className="rounded-2xl h-12 px-6 font-black uppercase text-xs shadow-lg shadow-rose-900/40"
              >
                Fail
              </Button>
              <Button
                disabled={saving || !allChecked}
                onClick={() => markInspectionComplete(true)}
                className={`rounded-2xl h-12 px-8 font-black uppercase text-xs shadow-xl transition-all ${
                  allChecked 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/40' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
              >
                {allChecked ? 'Authorized Pass' : 'Locked'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Dialog */}
      <Dialog open={!!commenting} onOpenChange={() => setCommenting(null)}>
        <DialogContent className="rounded-3xl border-none p-0 overflow-hidden shadow-2xl">
          <div className="bg-slate-900 p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-white flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-primary" />
                Checkpoint Logging
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium pt-2">
                Add technical notes or failure reasons for this protocol item.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <Textarea
              className="min-h-[120px] rounded-2xl bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              placeholder="Enter technical details..."
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCommenting(null)} className="rounded-xl font-bold">Cancel</Button>
              <Button 
                onClick={() => commenting && saveComment(commenting)} 
                disabled={saving}
                className="rounded-xl font-black px-6 shadow-lg shadow-primary/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Protocol Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
