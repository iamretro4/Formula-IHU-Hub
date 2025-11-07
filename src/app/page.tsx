'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import getSupabaseClient from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if environment variables are available
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (!url || !key) {
          // If env vars are missing, redirect to signin
          router.push('/auth/signin')
          return
        }
        
        const supabase = getSupabaseClient()
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
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}