// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'

// Lazy initialization to avoid build-time errors
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Clean up malformed cookies that might cause parsing errors
function cleanupMalformedCookies() {
  if (typeof window === 'undefined') return
  
  try {
    // Clear any cookies that might be malformed
    // Supabase uses cookies with specific patterns
    const cookies = document.cookie.split(';')
    cookies.forEach((cookie) => {
      const [name] = cookie.split('=')
      const trimmedName = name.trim()
      // Clear any Supabase-related cookies that might be malformed
      if (trimmedName.startsWith('sb-') || trimmedName.includes('supabase')) {
        // Try to parse the cookie value to see if it's valid
        const value = cookie.substring(name.length + 1)
        if (value) {
          try {
            // If it looks like JSON, try to parse it
            if (value.startsWith('{') || value.startsWith('[')) {
              JSON.parse(decodeURIComponent(value))
            }
          } catch {
            // If parsing fails, clear the cookie
            document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
          }
        }
      }
    })
  } catch (err) {
    // Silently fail - cookie cleanup is best effort
    console.debug('Cookie cleanup error:', err)
  }
}

export default function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // Clean up malformed cookies before creating client
    cleanupMalformedCookies()
    
    supabaseClient = createBrowserClient<Database>(url, key)
  }
  
  return supabaseClient
}
