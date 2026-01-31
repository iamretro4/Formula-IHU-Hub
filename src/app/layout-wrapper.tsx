'use client'

import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import Sidebar from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading } = useAuth()

  const isAuthRoute = useMemo(
    () => (pathname ? pathname.startsWith('/auth') : false),
    [pathname]
  )

  if (isAuthRoute) {
    return <>{children}</>
  }

  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <LoadingSpinner text="Loading..." />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
