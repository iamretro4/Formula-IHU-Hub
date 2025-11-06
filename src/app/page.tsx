'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'

export default function HomePage() {
  const router = useRouter()
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Use getUser() which validates the token with Supabase Auth server
        // This is more secure than getSession() which reads from cookies
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (user && !error) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard')
        } else {
          // No valid user, redirect to signin
          router.push('/auth/signin')
        }
      } catch (err) {
        // On error, redirect to signin
        console.warn('Auth check error:', err)
        router.push('/auth/signin')
      }
    }
    checkAuthAndRedirect()
  }, [router, supabase])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}