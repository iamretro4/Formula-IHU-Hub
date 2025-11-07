// src/lib/supabase/server.ts
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

// Import from @supabase/ssr (new package replacing auth-helpers)
import { 
  createBrowserClient, 
  createServerClient
} from '@supabase/ssr'

// ----------
// Client-side (for components)
// ----------
export function createClientSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  
  return createBrowserClient<Database>(url, key)
}

// ----------
// Server-side (for RSC, API routes)
// ----------
export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  
  const cookieStore = await cookies()
  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

// ----------
// Middleware (for edge/middleware.ts)
// ----------
export function createMiddlewareSupabaseClient(req: NextRequest, res: any) {
  // createMiddlewareClient was removed in newer versions of @supabase/ssr
  // Use createServerClient instead for middleware
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }
  
  return createServerClient<Database>(
    url,
    key,
    { 
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res?.cookies?.set(name, value, options)
        },
        remove(name: string, options: any) {
          res?.cookies?.set(name, '', { ...options, maxAge: 0 })
        }
      }
    }
  )
}
