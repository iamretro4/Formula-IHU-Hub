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
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ----------
// Server-side (for RSC, API routes)
// ----------
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
