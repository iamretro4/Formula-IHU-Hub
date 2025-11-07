'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { FaRegCommentDots, FaFilePdf, FaUndo } from 'react-icons/fa'
import { Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'

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
  const supabase = createClientComponentClient()
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

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true)
        setError(null)
        // User and profile
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!authUser) throw new Error('User not authenticated')
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
        // Comments
        const { data: comms, error: commentsErr } = await supabase
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

  useEffect(() => {
    if (booking && booking.status && booking.status !== 'ongoing' && !readonly) {
      supabase.from('bookings').update({ status: 'ongoing' } as any).eq('id', booking.id)
    }
  }, [booking, supabase, readonly])

  async function markItem(item_id: string, checked: boolean) {
    const isLocked = status[item_id]?.locked ?? false
    if (readonly || (isLocked && !['admin', 'scrutineer'].includes(role))) return
    setSaving(true)
    if (!user) {
      setError("User not loaded, can't mark item."); setSaving(false)
      return
    }
    const payload: Partial<InspectionProgress> = {
      booking_id: bookingId,
      item_id,
      user_id: user.id,
      checked_at: checked ? new Date().toISOString() : null,
      status: checked ? 'passed' : null,
      comment: status[item_id]?.comment || ''
    }
    setStatus(prev => ({
      ...prev,
      [item_id]: { ...prev[item_id], ...payload } as InspectionProgress
    }))
    try {
      const { error } = await supabase
        .from('inspection_progress')
        .upsert([payload as any], { onConflict: 'booking_id,item_id', ignoreDuplicates: false })
      if (error) {
        setError('Failed to save. Please check your permissions and RLS settings. ' + error.message)
        return
      }
      setError(null)
    } catch (e) {
      setError('Failed to save. Caught JS error.')
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
      await supabase.from('inspection_comments').insert({
        booking_id: bookingId,
        item_id: item_id,
        user_id: user?.id,
        comment: commentDraft,
        created_at: new Date().toISOString()
      } as any)
      setCommenting(null)
      setCommentDraft('')
      setError(null)
    } catch {
      setError('Failed to save comment. Please check your permissions.')
    } finally {
      setSaving(false)
    }
  }

  async function exportPDF() {
    if (!booking) return
    const { data: progress } = await supabase
      .from('inspection_progress')
      .select('*, user_profiles(first_name, last_name)')
      .eq('booking_id', bookingId)
    const doc = new jsPDF()
    doc.text(`Inspection: ${booking.inspection_types?.name ?? ""}`, 10, 10)
    doc.text(`Team: ${booking.teams?.name ?? ""} (${booking.teams?.code ?? "-"})`, 10, 20)
    doc.text(`Slot: ${booking.start_time} - ${booking.end_time}`, 10, 30)
    doc.text(`Status: ${booking.inspection_results?.[0]?.status ?? booking.status ?? '-'}`, 10, 40)
    doc.text(`Checklist:`, 10, 50)
    type ProgressItem = {
      item_id: string
      status?: string
      user_profiles?: { first_name?: string; last_name?: string } | null
      user_id?: string
    }
    ((progress ?? []) as ProgressItem[]).forEach((p, i: number) => {
      doc.text(
        `${i + 1}. ${p.item_id} (${p.status ?? '-'}) - ${p.user_profiles?.first_name ?? ''} ${p.user_profiles?.last_name ?? ''}`,
        10, 60 + i * 7
      )
    })
    doc.save(`${booking.teams?.name ?? ""}_${booking.inspection_types?.name ?? ""}_${booking.start_time}.pdf`)
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
      await supabase
        .from('inspection_progress')
        .update({ locked: true } as any)
        .eq('booking_id', bookingId)
      setError(null)
      alert(`Inspection marked as ${passed ? 'Passed' : 'Failed'}!`)
      router.push('/scrutineering/live')
    } catch {
      setError('Failed to complete inspection. Please check permissions.')
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
    setReinspectLoading(true)
    try {
      await supabase
        .from('inspection_results')
        .update({ status: 'failed', completed_at: null } as any)
        .eq('booking_id', bookingId)
      await supabase
        .from('inspection_progress')
        .update({ status: 'failed', comment: null, locked: false } as any)
        .eq('booking_id', bookingId)
      router.replace(`/scrutineering/live/${bookingId}`)
    } catch (err) {
      setError('Failed to reset for re-inspection. Please check RLS and permissions.')
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold mb-1">
            {booking?.inspection_types?.name ?? 'Inspection'}
            {booking?.status === "ongoing" && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded border border-yellow-300 text-xs font-semibold">Ongoing</span>
            )}
            {booking?.status === "completed" && booking?.inspection_results?.[0]?.status === 'passed' && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded border border-green-300 text-xs font-semibold">Passed</span>
            )}
            {booking?.status === "completed" && booking?.inspection_results?.[0]?.status === 'failed' && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded border border-red-300 text-xs font-semibold">Failed</span>
            )}
          </h1>
          <div className="text-sm text-gray-600">
            {booking?.teams?.name} ({booking?.teams?.code}) • {booking?.start_time}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-xs text-gray-700 mb-1">
            User: {user?.first_name} {user?.last_name} <span className="px-2 py-0.5 bg-blue-50 border text-blue-700 rounded">{role}</span>
          </div>
          <div className="text-sm text-gray-500">{completionCount} of {checklist.length} completed</div>
          {(role === 'scrutineer' || role === 'judge' || role === 'admin') && booking?.status === 'completed' &&
            <button className="mt-2 flex items-center text-red-700 border border-red-600 px-2 py-1 rounded hover:bg-red-50"
              onClick={exportPDF}>
              <FaFilePdf className="mr-2" /> Export PDF
            </button>
          }
          {canReinspect && (
            <button
              className="mt-2 flex items-center text-orange-700 border border-orange-300 px-3 py-1 rounded hover:bg-orange-50 font-bold"
              disabled={reinspectLoading}
              onClick={handleReinspect}
              title="Require team to redo all points. Unlocks checkpoints and resets status."
            >
              {reinspectLoading
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <FaUndo className="mr-2" />}
              Re-inspect
            </button>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${checklist.length > 0 ? (completionCount / checklist.length) * 100 : 0}%` }}
        />
      </div>
      <div className="space-y-8">
        {Object.entries(itemsBySection).map(([section, items]) =>
          <fieldset key={section} className="bg-neutral-50 border rounded mb-6">
            <legend className="font-bold px-4 py-2 text-lg">{section}</legend>
            <div className="space-y-2 px-4 py-2">
              {items.map((item, idx) => {
                const isLocked = status[item.id]?.locked ?? false
                const isDisabled = saving || readonly || (isLocked && !['admin','scrutineer'].includes(role))
                return (
                  <div key={item.id} className="flex items-center border-b py-3 justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={status[item.id]?.status === 'passed'}
                        onChange={e => markItem(item.id, e.target.checked)}
                        disabled={isDisabled}
                        className="mr-2"
                      />
                      <span className="font-semibold">{idx + 1}. {item.description}</span>
                      <button
                        className="ml-4 text-gray-400 hover:text-blue-900"
                        onClick={() => openComment(item.id)}
                        title="Add/View Comment"
                        disabled={isDisabled}
                      >
                        <FaRegCommentDots size={18} />
                      </button>
                      {isLocked && <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 border rounded text-gray-600">Locked</span>}
                    </div>
                    <div>
                      {status[item.id]?.checked_at && (
                        <span className="block text-xs text-gray-500 ml-2">
                          Checked by{' '}
                          <b>
                            {status[item.id]?.user_profiles
                              ? `${status[item.id].user_profiles?.first_name} ${status[item.id].user_profiles?.last_name} (${status[item.id].user_profiles?.app_role})`
                              : user?.email || user?.id}
                          </b>{' '}
                          at {new Date(status[item.id].checked_at as string).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </fieldset>
        )}
      </div>
      <div className="flex gap-4 justify-end mt-10">
        {!readonly && (
          <>
            <button
              className="bg-red-600 hover:bg-red-800 text-white px-5 py-2 rounded disabled:opacity-50"
              onClick={() => markInspectionComplete(false)}
              disabled={saving}
            >{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Mark as Failed
            </button>
            <button
              className="bg-green-700 hover:bg-green-900 text-white px-5 py-2 rounded disabled:opacity-50"
              onClick={() => markInspectionComplete(true)}
              disabled={!allChecked || saving}
            >{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Mark as Passed
            </button>
          </>
        )}
      </div>
      {commenting && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-4 min-w-[350px] max-w-sm">
            <div className="font-semibold mb-2">Comments for item</div>
            {(comments[commenting]?.length ?? 0) > 0 ? (
              <div className="space-y-2 mb-2">
                {comments[commenting]?.map(c =>
                  <div key={c.id} className="border rounded px-2 py-1 text-xs flex flex-col">
                    <div className="flex justify-between text-gray-700">
                      <span>
                        <b>
                          {c.user_profiles
                            ? `${c.user_profiles.first_name} ${c.user_profiles.last_name}`
                            : c.user_id}
                        </b>
                        {' '}at {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-blue-800">{c.comment}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 mb-2">No comments yet.</div>
            )}
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
              placeholder="Add your comment…"
              disabled={readonly}
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button
                className="px-3 py-1 bg-neutral-200 rounded"
                onClick={() => setCommenting(null)}
                disabled={saving}
              >Cancel</button>
              {!readonly && (
                <button
                  className="px-3 py-1 bg-blue-700 text-white rounded disabled:opacity-50"
                  onClick={() => saveComment(commenting!)}
                  disabled={saving || (!commentDraft && status[commenting!]?.status !== 'passed')}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Comment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {saving && <div className="text-xs text-gray-500 mt-2">Saving...</div>}
      {error && <div className="text-center text-red-500 mt-2">{error}</div>}
    </div>
  )
}
