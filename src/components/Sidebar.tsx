'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import getSupabaseClient from '@/lib/supabase/client'
import {
  LayoutDashboard, Trophy, Calendar, CalendarCheck, CheckCircle2, Flag,
  Zap, FilePenLine, FileText, Building2, MessageSquare, User, LogOut,
  Users, Scale, Settings, ClipboardList, TrendingUp,
  UserCircle, LogOut as LogoutIcon, Shield, Wrench, X
} from "lucide-react"

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}
type NavSection = {
  label: string
  items: NavItem[]
  labelRoles?: string[] // Roles that can see this section title
  hideForRoles?: string[] // Roles that must not see this section at all
}

const navConfig: NavSection[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> }
      // Temporarily removed: Results
      // { label: 'Results', href: '/results', icon: <Trophy className="w-5 h-5" />, roles: ['admin'] }
    ]
  },
  // Temporarily removed: SCRUTINEERING (Calendar, Book Inspection, Live Inspections)
  // {
  //   label: 'SCRUTINEERING',
  //   labelRoles: ['admin', 'scrutineer', 'inspection_responsible', 'team_member'],
  //   hideForRoles: ['team_leader'],
  //   items: [
  //     { label: 'Calendar', href: '/scrutineering/calendar', icon: <Calendar className="w-5 h-5" />, roles: ['admin', 'scrutineer', 'inspection_responsible', 'team_member'] },
  //     { label: 'Book Inspection', href: '/scrutineering/book', icon: <CalendarCheck className="w-5 h-5" />, roles: ['admin', 'inspection_responsible', 'team_member'] },
  //     { label: 'Live Inspections', href: '/scrutineering/live', icon: <ClipboardList className="w-5 h-5" />, roles: ['admin', 'scrutineer', 'inspection_responsible'] }
  //   ]
  // },
  // Temporarily removed: TRACK EVENTS (Track Marshal, Live Track Data)
  // {
  //   label: 'TRACK EVENTS',
  //   labelRoles: ['admin', 'track_marshal', 'viewer'],
  //   hideForRoles: ['team_leader'],
  //   items: [
  //     { label: 'Track Marshal', href: '/track/marshal', icon: <Flag className="w-5 h-5" />, roles: ['admin', 'track_marshal'] },
  //     { label: 'Live Track Data', href: '/track', icon: <TrendingUp className="w-5 h-5" />, roles: ['admin'] }
  //   ]
  // },
  // Temporarily removed: JUDGED EVENTS (Design Event, Business Plan, Cost & Manufacturing)
  // {
  //   label: 'JUDGED EVENTS',
  //   labelRoles: ['admin'],
  //   hideForRoles: ['team_leader'],
  //   items: [
  //     { label: 'Design Event', href: '/judged-events/engineering-design', icon: <FilePenLine className="w-5 h-5" />, roles: ['admin'] },
  //     { label: 'Business Plan', href: '/judged-events/business-plan', icon: <FileText className="w-5 h-5" />, roles: ['admin'] },
  //     { label: 'Cost & Manufacturing', href: '/judged-events/cost-manufacturing', icon: <Building2 className="w-5 h-5" />, roles: ['admin'] }
  //   ]
  // },
  // Temporarily removed: TEAM FEATURES (Feedback Booking)
  // {
  //   label: 'TEAM FEATURES',
  //   labelRoles: ['admin', 'team_member', 'inspection_responsible'],
  //   hideForRoles: ['team_leader'],
  //   items: [
  //     { label: 'Feedback Booking', href: '/feedback', icon: <MessageSquare className="w-5 h-5" />, roles: ['admin', 'team_member', 'inspection_responsible'] }
  //   ]
  // },
  {
    label: 'ADMINISTRATION',
    labelRoles: ['admin', 'scrutineer', 'team_leader'],
    items: [
      { label: 'Admin Panel', href: '/admin', icon: <Shield className="w-5 h-5" />, roles: ['admin'] },
      { label: 'User Management', href: '/admin/users', icon: <Users className="w-5 h-5" />, roles: ['admin', 'team_leader'] },
      // Temporarily removed: Penalty Management
      // { label: 'Penalty Management', href: '/admin/penalties', icon: <Scale className="w-5 h-5" />, roles: ['admin', 'scrutineer'] }
    ]
  },
  {
    label: 'ACCOUNT',
    labelRoles: ['admin', 'scrutineer', 'team_leader', 'inspection_responsible', 'team_member', 'design_judge_software', 'design_judge_mechanical', 'design_judge_electronics', 'design_judge_overall', 'bp_judge', 'cm_judge', 'track_marshal', 'viewer'],
    items: [
      { label: 'My Profile', href: '/settings/profile', icon: <UserCircle className="w-5 h-5" /> },
      { label: 'Logout', href: '/account/logout', icon: <LogoutIcon className="w-5 h-5" /> }
    ]
  }
]

type SidebarProps = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile: authProfile } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const role = authProfile?.app_role || null
  const profile = authProfile ? { first_name: authProfile.first_name, last_name: authProfile.last_name } : null

  // LayoutWrapper ensures we only render when authenticated, so no need to check here

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const supabase = getSupabaseClient()
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
      {/* Overlay for mobile only */}
      <div
        className={`fixed inset-0 bg-black/30 z-20 transition-opacity ${sidebarOpen ? 'block' : 'hidden'} md:hidden`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-64 md:w-64 sm:w-56 h-screen bg-gradient-to-b from-white via-white to-gray-50/30 border-r border-gray-200 shadow-xl flex flex-col`}
        style={{ transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="px-4 py-5 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-white to-gray-50/50">
          <div className="flex-1 flex items-center justify-center min-w-0">
            {logoError ? (
              <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
            ) : (
              <Image
                src="/formula-ihu-logo.png"
                alt="Formula IHU Logo"
                width={192}
                height={96}
                className="h-12 w-auto object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
                quality={90}
                priority
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          {/* Close button - mobile only */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {navConfig.map((section, i) => {
            // Team leaders and other roles: hide entire section when in hideForRoles
            if (role && section.hideForRoles?.includes(role)) return null

            // Filter items by role
            const visibleItems = section.items.filter(item => !item.roles || (role && item.roles.includes(role)))
            
            // Don't show section if no items are visible
            if (visibleItems.length === 0) return null
            
            // Check if section label should be visible
            const showLabel = section.label && (!section.labelRoles || (role && section.labelRoles.includes(role)))
            
            return (
            <div key={i} className="mb-5">
              {showLabel && (
                <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <span className="text-[10px]">{section.label}</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>
              )}
              <ul className="space-y-1">
                {visibleItems.map(item => (
                    <li key={item.href}>
      {item.href === '/account/logout' ? (
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Sign out"
          aria-busy={isLoggingOut}
          className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full text-left
            hover:bg-red-50 hover:text-red-600
            ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'text-gray-700'}`}>
          <span className="w-5 h-5 flex-shrink-0 text-gray-500 group-hover:text-red-600 transition-colors">{item.icon}</span>
          <span className="flex-1">{isLoggingOut ? 'Signing out...' : item.label}</span>
        </button>
      ) : (
                                <Link
                                  href={item.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`group flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-300
                                    hover:bg-primary/10 hover:text-primary hover:shadow-md hover:translate-x-1
                                    ${pathname.startsWith(item.href) ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold shadow-md border-l-4 border-primary' : 'text-gray-700'}`}>
                                  <span className={`flex-shrink-0 transition-all duration-300 ${pathname.startsWith(item.href) ? 'text-primary scale-110' : 'text-gray-500 group-hover:text-primary group-hover:scale-110'}`}>{item.icon}</span>
                                  <span className="flex-1 truncate">{item.label}</span>
                                </Link>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
            )
          })}
        </nav>
        <div className="p-4 mt-auto flex items-center gap-3 border-t-2 border-gray-200 bg-gradient-to-r from-white to-gray-50/50">
          <div className="rounded-full h-11 w-11 bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-sm font-bold text-white shadow-lg ring-2 ring-primary/20 transition-transform duration-300 hover:scale-110">
            {profile?.first_name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{profile?.first_name} {profile?.last_name}</div>
            <div className="text-xs text-gray-500 capitalize font-medium">{role?.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </aside>
    </>
  )
}
