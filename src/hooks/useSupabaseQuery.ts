'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseSupabaseQueryOptions<T> {
  queryFn: () => Promise<{ data: T | null; error: any }>
  enabled?: boolean
  refetchInterval?: number
}

interface UseSupabaseQueryReturn<T> {
  data: T | null
  loading: boolean
  error: any
  refetch: () => Promise<void>
}

/**
 * Generic hook for Supabase queries with automatic loading and error handling
 * @param queryFn - Function that returns a Supabase query result
 * @param enabled - Whether the query should run (default: true)
 * @param refetchInterval - Optional interval in ms to refetch data
 */
export function useSupabaseQuery<T>({
  queryFn,
  enabled = true,
  refetchInterval,
}: UseSupabaseQueryOptions<T>): UseSupabaseQueryReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await queryFn()
      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result.data)
        setError(null)
      }
    } catch (err) {
      setError(err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [queryFn, enabled])

  useEffect(() => {
    let cancelled = false
    let intervalId: NodeJS.Timeout | null = null

    if (!cancelled) {
      fetchData()
    }

    if (refetchInterval && refetchInterval > 0) {
      intervalId = setInterval(() => {
        if (!cancelled) {
          fetchData()
        }
      }, refetchInterval)
    }

    return () => {
      cancelled = true
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [fetchData, refetchInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

