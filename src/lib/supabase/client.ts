import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export function hasSupabaseEnv(): boolean {
  return Boolean(
    typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export default function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient<Database>(url, key)
}

/** Returns true if there is a valid session (middleware handles refresh; this is for optional checks). */
export async function ensureSupabaseConnection(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser()
    return !!user
  } catch {
    return false
  }
}

/** Refreshes session; returns true if successful. Middleware also refreshes on each request. */
export async function refreshSupabaseSession(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false
  try {
    const { error } = await getSupabaseClient().auth.refreshSession()
    return !error
  } catch {
    return false
  }
}
