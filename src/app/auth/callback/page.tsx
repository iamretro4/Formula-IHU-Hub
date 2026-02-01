'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const loadingFallback = (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-white to-primary/5">
    <div className="text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="text-gray-600">Completing sign in...</p>
    </div>
  </div>
)

/**
 * Supabase can be configured to redirect to /auth/callback after email confirmation.
 * This page forwards to the API route that exchanges the code and sets the session.
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    const url = query ? `/api/auth/callback?${query}` : '/api/auth/callback'
    window.location.replace(url)
  }, [searchParams])

  return loadingFallback
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={loadingFallback}>
      <AuthCallbackContent />
    </Suspense>
  )
}
