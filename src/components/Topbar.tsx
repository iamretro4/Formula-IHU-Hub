'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Search,           // Magnifying glass
  Bell,             // Notification bell
  Plus,             // Plus icon for quick actions
  ChevronDown       // Down arrow
} from 'lucide-react'
import { Menu, Transition } from '@headlessui/react'
import { CreateTeamModal } from './CreateTeamModal'
import { CreateVehicleModal } from './CreateVehicleModal'
import { ScheduleScrutineeringModal } from './ScheduleScrutineeringModal'
import { useAuth } from '@/hooks/useAuth'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'

const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function Topbar() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showCreateVehicleModal, setShowCreateVehicleModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // LayoutWrapper ensures we only render when authenticated, so no need to check here

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  type Action = { name: string; action: () => void; roles: string[] }
  const quickActions: Action[] = [
    { name: 'Create Team', action: () => setShowCreateTeamModal(true), roles: ['admin','team_member'] },
    { name: 'Add Vehicle', action: () => setShowCreateVehicleModal(true), roles: ['admin','team_member'] },
    { name: 'Schedule Scrutineering', action: () => setShowScheduleModal(true), roles: ['admin','scrutineer'] },
  ]

  const userRole = profile?.app_role || 'viewer'
  const availableActions = quickActions.filter(a => a.roles.includes(userRole))

  const signOutSupabase = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully')
      router.push('/auth/signin')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign out')
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search teams, vehicles, or scrutineering..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {availableActions.length > 0 && (
              <Menu as="div" className="relative">
                <Menu.Button className="btn-primary flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Actions
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Menu.Button>
                <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                  <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      {availableActions.map(a => (
                        <Menu.Item key={a.name}>
                          {({ active }) => (
                            <button onClick={a.action} className={`${active ? 'bg-gray-50' : ''} block w-full text-left px-4 py-2 text-sm text-gray-700`}>
                              {a.name}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            {/* Notifications */}
            <button 
              aria-label="Notifications"
              className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" aria-hidden="true" />
            </button>

            {/* User Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
              </Menu.Button>
              <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-200">
                      <p className="font-medium text-gray-900">{profile?.first_name || ''} {profile?.last_name || ''}</p>
                      <p className="text-xs">{user?.email || ''}</p>
                      <p className="text-xs capitalize mt-1">{userRole.replace('_',' ')}</p>
                    </div>
                    <Menu.Item>{({ active }) => (<button onClick={() => router.push('/settings/profile')} className={`${active?'bg-gray-50':''} block w-full text-left px-4 py-2 text-sm text-gray-700`}>Profile Settings</button>)}</Menu.Item>
                    <Menu.Item>{({ active }) => (
                      <button 
                        onClick={signOutSupabase} 
                        disabled={isLoggingOut}
                        aria-label="Sign out"
                        aria-busy={isLoggingOut}
                        className={`${active?'bg-gray-50':''} ${isLoggingOut?'opacity-50 cursor-not-allowed':''} block w-full text-left px-4 py-2 text-sm text-gray-700`}
                      >
                        {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                      </button>
                    )}</Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </header>

      {/* Modals */}
      <CreateTeamModal isOpen={showCreateTeamModal} onClose={() => setShowCreateTeamModal(false)} />
      <CreateVehicleModal isOpen={showCreateVehicleModal} onClose={() => setShowCreateVehicleModal(false)} />
      <ScheduleScrutineeringModal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} />
    </>
  )
}
