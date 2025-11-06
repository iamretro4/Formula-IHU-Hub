'use client'

import { usePathname } from 'next/navigation'
import { useMemo, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import Sidebar from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
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
      console.log('[LayoutWrapper]', {
        pathname,
        hasUser: !!user,
        userId: user?.id,
        loading,
        error,
      })
      
      // Also log warning if no user on protected route
      if (!loading && !user && !isAuthRoute && pathname !== '/auth/signin') {
        console.warn('[LayoutWrapper] No user but on protected route:', pathname)
      }
    }
  }, [user, loading, error, pathname, isAuthRoute])

  // Always show auth routes immediately - bypass loading check
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Show loading spinner while checking auth on protected routes
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />
  }

  // Show layout with sidebar and topbar for authenticated users
  if (user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    )
  }

  // Redirect to signin if not authenticated (handled by middleware or page-level redirects)
  return <>{children}</>
}

