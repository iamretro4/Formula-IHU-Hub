import { useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/types/database'

type ChecklistTemplate = Database['public']['Tables']['checklist_templates']['Row']
type InspectionProgress = Database['public']['Tables']['inspection_progress']['Row']

interface ChecklistItem extends ChecklistTemplate {
  progress?: InspectionProgress
  isChecked: boolean
  comment: string
  checkedBy?: string
  checkedAt?: string
}

interface UseChecklistManagerProps {
  bookingId: string
  inspectionTypeId: string
}

interface UseChecklistManagerReturn {
  items: ChecklistItem[]
  isLoading: boolean
  error: string | null
  updateItem: (itemId: string, checked: boolean, comment?: string) => Promise<boolean>
  isUpdating: boolean
  completionStatus: {
    total: number
    completed: number
    percentage: number
    canPass: boolean
  }
}

/**
 * Robust hook for managing checklist state with optimistic updates and conflict resolution
 */
export function useChecklistManager({ 
  bookingId, 
  inspectionTypeId 
}: UseChecklistManagerProps): UseChecklistManagerReturn {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const supabase = createClientComponentClient<Database>()
  const pendingUpdatesRef = useRef<Map<string, { checked: boolean; comment: string }>>(new Map())
  const retryCountRef = useRef(0)
  const maxRetries = 3

  // Load checklist items and progress
  useEffect(() => {
    if (!bookingId || !inspectionTypeId) return

    let cancelled = false
    const loadChecklist = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Load checklist templates
        const { data: templates, error: templatesError } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('inspection_type_id', inspectionTypeId)
          .order('section')
          .order('order_index')

        if (templatesError) throw templatesError

        // Load progress data
        const { data: progress, error: progressError } = await supabase
          .from('inspection_progress')
          .select(`
            *,
            user_profiles!inspection_progress_user_id_fkey(first_name, last_name)
          `)
          .eq('booking_id', bookingId)

        if (progressError) throw progressError

        // Merge templates with progress data
        const progressMap = new Map((progress as any)?.map((p: any) => [p.item_id, p]) || [])
        
        const checklistItems: ChecklistItem[] = ((templates || []) as any[]).map((template: any) => {
          const progressData = progressMap.get(template.id) as any
          return {
            ...template,
            progress: progressData,
            isChecked: progressData?.status === 'pass' || false,
            comment: progressData?.comment || '',
            checkedBy: progressData?.user_profiles ? 
              `${progressData.user_profiles.first_name} ${progressData.user_profiles.last_name}` : 
              undefined,
            checkedAt: progressData?.checked_at || undefined
          }
        })

        if (!cancelled) {
          setItems(checklistItems)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load checklist')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadChecklist()
    return () => { cancelled = true }
  }, [bookingId, inspectionTypeId, supabase])

  // Calculate completion status
  const completionStatus = {
    total: items.length,
    completed: items.filter(item => item.isChecked).length,
    percentage: items.length > 0 ? Math.round((items.filter(item => item.isChecked).length / items.length) * 100) : 0,
    canPass: items.length > 0 && items.every(item => item.isChecked)
  }

  // Update individual checklist item with optimistic updates and retry logic
  const updateItem = useCallback(async (
    itemId: string, 
    checked: boolean, 
    comment?: string
  ): Promise<boolean> => {
    if (!bookingId) return false

    setIsUpdating(true)
    setError(null)

    // Store pending update for retry logic
    pendingUpdatesRef.current.set(itemId, { checked, comment: comment || '' })

    // Optimistic update
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              isChecked: checked,
              comment: comment !== undefined ? comment : item.comment,
              checkedAt: checked ? new Date().toISOString() : undefined
            }
          : item
      )
    )

    const attemptUpdate = async (attempt: number): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const now = new Date().toISOString()
        const payload = {
          booking_id: bookingId,
          item_id: itemId,
          user_id: user.id,
          checked_at: checked ? now : null,
          status: checked ? 'pass' : null,
          comment: comment || ''
        }

        const { error: upsertError } = await (supabase
          .from('inspection_progress') as any)
          .upsert([payload], {
            onConflict: 'booking_id,item_id',
            ignoreDuplicates: false
          })

        if (upsertError) throw upsertError

        // Verify the update was successful
        const { data: verification, error: verifyError } = await supabase
          .from('inspection_progress')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('item_id', itemId)
          .single()

        if (verifyError) throw verifyError

        // Check if the verification matches our update
        const verified = verification as any
        const isVerified = verified?.status === (checked ? 'pass' : null) &&
                          verified?.checked_at === (checked ? now : null)

        if (isVerified) {
          pendingUpdatesRef.current.delete(itemId)
          retryCountRef.current = 0
          return true
        } else {
          throw new Error('Update verification failed')
        }
      } catch (err) {
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
          return attemptUpdate(attempt + 1)
        } else {
          // Revert optimistic update on final failure
          setItems(prevItems => 
            prevItems.map(item => 
              item.id === itemId 
                ? { 
                    ...item, 
                    isChecked: !checked, // Revert to previous state
                    comment: comment !== undefined ? '' : item.comment
                  }
                : item
            )
          )
          setError(err instanceof Error ? err.message : 'Failed to update checklist item')
          retryCountRef.current = 0
          return false
        }
      }
    }

    const success = await attemptUpdate(0)
    setIsUpdating(false)
    return success
  }, [bookingId, supabase])

  // Retry failed updates
  const retryFailedUpdates = useCallback(async () => {
    if (pendingUpdatesRef.current.size === 0) return

    const failedUpdates = Array.from(pendingUpdatesRef.current.entries())
    
    for (const [itemId, { checked, comment }] of failedUpdates) {
      await updateItem(itemId, checked, comment)
    }
  }, [updateItem])

  // Auto-retry failed updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(retryFailedUpdates, 30000)
    return () => clearInterval(interval)
  }, [retryFailedUpdates])

  return {
    items,
    isLoading,
    error,
    updateItem,
    isUpdating,
    completionStatus
  }
}
