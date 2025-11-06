'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, Trophy, CalendarDays, ClipboardCheck, CheckSquare, Flag,
  ActivitySquare, PenSquare, FileText, Factory, MessageCircle, User, LogOut,
  Users2, Gavel, BookOpenCheck, Settings, ListChecks, BarChart3, Book, History,
  SquareUser, LogOut as LogoutIcon
} from "lucide-react"

const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}
type NavSection = {
  label: string
  items: NavItem[]
}

const navConfig: NavSection[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard /> },
      { label: 'Results', href: '/results', icon: <Trophy /> }
    ]
  },
  {
    label: 'SCRUTINEERING',
    items: [
      { label: 'Calendar', href: '/scrutineering/calendar', icon: <CalendarDays /> },
      { label: 'Book Inspection', href: '/scrutineering/book', icon: <ClipboardCheck /> },
      { label: 'Live Inspections', href: '/scrutineering/live', icon: <ListChecks /> }
    ]
  },
  {
    label: 'TRACK EVENTS',
    items: [
      { label: 'Track Marshal', href: '/track/marshal', icon: <Flag /> },
      { label: 'Live Track Data', href: '/track', icon: <BarChart3 /> }
    ]
  },
  {
    label: 'JUDGED EVENTS',
    items: [
      { label: 'Design Event', href: '/judged-events/engineering-design', icon: <PenSquare />,
        roles: ['admin', 'design_judge_software', 'design_judge_mechanical', 'design_judge_electronics', 'design_judge_overall', 'team_leader', 'viewer']
      },
      { label: 'Business Plan', href: '/judged-events/business-plan', icon: <FileText />,
        roles: ['admin', 'bp_judge', 'design_judge_overall', 'team_leader', 'viewer']
      },
      { label: 'Cost & Manufacturing', href: '/judged-events/cost-manufacturing', icon: <Factory />,
        roles: ['admin', 'cm_judge', 'design_judge_overall', 'team_leader', 'viewer']
      }
    ]
  },
  {
    label: 'TEAM FEATURES',
    items: [
      { label: 'Feedback Booking', href: '/feedback', icon: <MessageCircle /> }
    ]
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Admin Panel', href: '/admin', icon: <Settings />, roles: ['admin'] },
      { label: 'User Management', href: '/admin/users', icon: <Users2 />, roles: ['admin'] },
      { label: 'System Reports', href: '/admin/reports', icon: <BookOpenCheck />, roles: ['admin', 'scrutineer'] },
      { label: 'Penalty Management', href: '/admin/penalties', icon: <Gavel />, roles: ['admin', 'scrutineer'] }
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'My Profile', href: '/settings/profile', icon: <SquareUser /> },
      { label: 'Logout', href: '/account/logout', icon: <LogoutIcon /> }
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile: authProfile } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const role = authProfile?.app_role || null
  const profile = authProfile ? { first_name: authProfile.first_name, last_name: authProfile.last_name } : null

  // LayoutWrapper ensures we only render when authenticated, so no need to check here

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully')
      router.push('/auth/signin')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign out')
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden p-2 z-30 fixed top-4 left-3 rounded-full bg-primary text-white shadow focus:outline-none"
        onClick={() => setSidebarOpen(x => !x)}
        aria-label="Toggle sidebar"
      >
        <LayoutDashboard className="w-6 h-6" />
      </button>
      {/* Overlay for mobile only */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-20 z-20 transition-opacity ${sidebarOpen ? 'block' : 'hidden'} md:hidden`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-64 h-screen bg-white border-r dark:bg-neutral-900 flex flex-col`}
        style={{ transition: 'transform 200ms' }}
      >
        <div className="px-6 py-5 flex items-center gap-2 border-b">
          <Flag className="text-primary w-7 h-7" />
          <div>
            <div className="font-bold text-lg">Formula IHU</div>
            <div className="text-xs text-gray-500">Competition Hub</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {navConfig.map((section, i) => (
            <div key={i} className="mb-4">
              {section.label && <div className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">{section.label}</div>}
              <ul>
                {section.items
                  .filter(item => !item.roles || (role && item.roles.includes(role)))
                  .map(item => (
                    <li key={item.href}>
      {item.href === '/account/logout' ? (
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Sign out"
          aria-busy={isLoggingOut}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition w-full text-left
            hover:bg-primary/5 dark:hover:bg-neutral-800
            ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <span className="w-5 h-5">{item.icon}</span>
          <span>{isLoggingOut ? 'Signing out...' : item.label}</span>
        </button>
      ) : (
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition
                            hover:bg-primary/5 dark:hover:bg-neutral-800
                            ${pathname.startsWith(item.href) ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
                          <span className="w-5 h-5">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-4 mt-auto flex items-center gap-2 border-t">
          <div className="rounded-full h-8 w-8 bg-primary/20 flex items-center justify-center text-base font-bold">
            {profile?.first_name?.[0] ?? '?'}
          </div>
          <div>
            <div className="text-xs font-semibold">{profile?.first_name} {profile?.last_name}</div>
            <div className="text-xs text-gray-500 capitalize">{role}</div>
          </div>
        </div>
      </aside>
    </>
  )
}
