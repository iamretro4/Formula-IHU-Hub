'use client'

import { usePathname } from 'next/navigation'
import { useMemo, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import Sidebar from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { logger } from '@/lib/utils/logger'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Always call hooks unconditionally (React rules)
  const { user, loading, error } = useAuth()
  
  // Check if we're on an auth route (memoized)
  const isAuthRoute = useMemo(() => {
    if (!pathname) return false
    return pathname.startsWith('/auth')
  }, [pathname])

  // All hooks must be called before any early returns
  // Debug logging to help diagnose
  useEffect(() => {
    if (typeof window !== 'undefined') {
      logger.debug('[LayoutWrapper]', {
        pathname,
        hasUser: !!user,
        userId: user?.id,
        loading,
        error,
      })
    }
  }, [user, loading, error, pathname, isAuthRoute])

  // Always show auth routes immediately - bypass loading check
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Show loading spinner while AuthContext is loading
  // Don't show loading if we've already checked and there's no user
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />
  }

  // Only show layout if we have a user from AuthContext
  // Don't rely on session check alone - we need the actual user object
  if (!user) {
    // No user - show children (which will handle redirect)
    // This prevents showing dashboard without authentication
    return <>{children}</>
  }

  // Show layout with sidebar and topbar for authenticated users
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

