import { useEffect, useState, useCallback, useRef } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'

type BookingStatus = Database['public']['Tables']['bookings']['Row']['status']
type InspectionProgress = Database['public']['Tables']['inspection_progress']['Row']

interface UseInspectionStatusProps {
  bookingId: string
  initialStatus?: BookingStatus
}

interface UseInspectionStatusReturn {
  status: BookingStatus | null
  isLoading: boolean
  error: string | null
  updateStatus: (newStatus: BookingStatus) => Promise<boolean>
  isUpdating: boolean
}

/**
 * Robust hook for managing inspection status transitions with retry logic and optimistic updates
 */
export function useInspectionStatus({ 
  bookingId, 
  initialStatus 
}: UseInspectionStatusProps): UseInspectionStatusReturn {
  const [status, setStatus] = useState<BookingStatus | null>(initialStatus || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const supabase = getSupabaseClient()
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const retryDelay = 1000 // 1 second

  // Load current status on mount
  useEffect(() => {
    if (!bookingId) return

    let cancelled = false
    const loadStatus = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single()

        if (fetchError) throw fetchError
        if (!cancelled) {
          setStatus((data as any)?.status || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load status')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStatus()
    return () => { cancelled = true }
  }, [bookingId, supabase])

  // Optimistic status update with retry logic
  const updateStatus = useCallback(async (newStatus: BookingStatus): Promise<boolean> => {
    if (!bookingId) return false

    setIsUpdating(true)
    setError(null)
    
    // Optimistic update
    const previousStatus = status
    setStatus(newStatus)

    const attemptUpdate = async (attempt: number): Promise<boolean> => {
      try {
        const { error: updateError } = await (supabase
          .from('bookings') as any)
          .update({
            status: newStatus,
            ...(newStatus === 'ongoing' && { started_at: new Date().toISOString() }),
            ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
          })
          .eq('id', bookingId)

        if (updateError) {
          throw updateError
        }

        // Verify the update was successful
        const { data: verification, error: verifyError } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single()

        if (verifyError) throw verifyError

        const verified = verification as any
        if (verified?.status === newStatus) {
          retryCountRef.current = 0
          return true
        } else {
          throw new Error('Status update verification failed')
        }
      } catch (err) {
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
          return attemptUpdate(attempt + 1)
        } else {
          // Revert optimistic update on final failure
          setStatus(previousStatus)
          setError(err instanceof Error ? err.message : 'Failed to update status')
          retryCountRef.current = 0
          return false
        }
      }
    }

    const success = await attemptUpdate(0)
    setIsUpdating(false)
    return success
  }, [bookingId, status, supabase])

  return {
    status,
    isLoading,
    error,
    updateStatus,
    isUpdating
  }
}
