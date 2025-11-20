// Helper utilities for Supabase operations with automatic retry and connection verification

import getSupabaseClient, { ensureSupabaseConnection } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

/**
 * Execute a Supabase query with automatic connection verification and retry logic
 * @param queryFn - Function that returns a Supabase query promise
 * @param retries - Number of retries on failure (default: 1)
 * @returns The query result
 */
export async function executeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries: number = 1
): Promise<{ data: T | null; error: any }> {
  // Ensure connection is valid before making query
  const connected = await ensureSupabaseConnection()
  if (!connected) {
    logger.warn('Supabase connection not available, attempting to reconnect...', { context: 'supabase_query' })
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 300))
    const retryConnected = await ensureSupabaseConnection()
    if (!retryConnected) {
      return {
        data: null,
        error: { message: 'Supabase connection unavailable. Please refresh the page.', code: 'CONNECTION_ERROR' }
      }
    }
  }

  let lastError: any = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await queryFn()
      
      // If we got an error, check if it's a connection/session issue
      if (result.error) {
        const errorCode = result.error.code || ''
        const errorMessage = result.error.message || ''
        
        // Check for session/connection errors
        if (
          errorCode === 'PGRST301' ||
          errorMessage.includes('JWT') ||
          errorMessage.includes('token') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('session')
        ) {
          logger.warn('Session error detected, attempting to refresh', { attempt, error: result.error, context: 'supabase_query' })
          
          // Try to refresh connection
          const refreshed = await ensureSupabaseConnection()
          if (refreshed && attempt < retries) {
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 200))
            lastError = result.error
            continue
          }
        }
        
        // If it's not a retryable error or we've exhausted retries, return the error
        return result
      }
      
      // Success - return the result
      return result
    } catch (err) {
      lastError = err
      logger.error('Query execution error', err, { attempt, context: 'supabase_query' })
      
      if (attempt < retries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
      }
    }
  }
  
  return {
    data: null,
    error: lastError || { message: 'Query failed after retries', code: 'QUERY_FAILED' }
  }
}


