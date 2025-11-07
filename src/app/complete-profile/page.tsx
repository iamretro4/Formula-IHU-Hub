'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function CompleteProfilePage() {
  const router = useRouter()
  const { profile, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      // Redirect to profile settings page
      router.replace('/settings/profile')
    }
  }, [loading, router])

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />
  }

  return null
}

