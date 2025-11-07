// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'

// Lazy initialization to avoid build-time errors
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export default function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    
    supabaseClient = createBrowserClient<Database>(url, key)
  }
  
  return supabaseClient
}
