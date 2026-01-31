'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [status, setStatus] = useState('Checking authentication...')
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    if (loading) return
    if (user) {
      setStatus('Welcome back! Redirecting...')
      router.replace('/dashboard')
      router.refresh()
      return
    }
    setStatus('Redirecting to sign in...')
    router.replace('/auth/signin')
    router.refresh()
  }, [user, loading, router])

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-white to-primary/5">
      <div className="text-center space-y-6 px-4">
        <div className="mx-auto mb-8 animate-fade-in">
          <div className="relative flex justify-center">
            {logoError ? (
              <div className="h-20 w-20 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </div>
            ) : (
              <Image
                src="/formula-ihu-logo.png"
                alt="Formula IHU"
                width={240}
                height={160}
                className="h-20 w-auto mx-auto object-contain drop-shadow-lg"
                quality={90}
                priority
                onError={() => setLogoError(true)}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-semibold text-lg">{status}</p>
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Formula IHU 2026 Scrutineering Platform
        </p>
      </div>
    </div>
  )
}
