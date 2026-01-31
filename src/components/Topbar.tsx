'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Bell,             // Notification bell
  ChevronDown,      // Down arrow
  Menu,             // Hamburger menu
  UserCircle,       // User profile icon
  LogOut,           // Logout icon
  X,                // Close icon
  CheckCircle2,     // Success icon
  AlertCircle,      // Warning icon
  Info,             // Info icon
  AlertTriangle     // Error icon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useAuth } from '@/hooks/useAuth'
import getSupabaseClient from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

type Notification = {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

type TopbarProps = {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const userRole = profile?.app_role || 'viewer'
  const supabase = getSupabaseClient()

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    setLoadingNotifications(true)
    try {
              const { data, error } = await supabase
                .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        logger.error('Failed to fetch notifications', error, { context: 'topbar' })
        return
      }

      const notificationsData = (data || []) as unknown as Notification[]
      setNotifications(notificationsData)
      setUnreadCount(notificationsData.filter(n => !n.read).length)
    } catch (error) {
      logger.error('Error fetching notifications', error, { context: 'topbar' })
    } finally {
      setLoadingNotifications(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      fetchNotifications()

      // Set up real-time subscription for notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, fetchNotifications, supabase])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        logger.error('Failed to mark notification as read', error, { context: 'topbar' })
        return
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      logger.error('Error marking notification as read', error, { context: 'topbar' })
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) {
        logger.error('Failed to mark all notifications as read', error, { context: 'topbar' })
        return
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      logger.error('Error marking all notifications as read', error, { context: 'topbar' })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />
      case 'error':
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getNotificationBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-amber-50 border-amber-200'
      case 'error':
      case 'critical':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

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
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 md:px-6 py-3.5 shadow-md sticky top-0 z-40">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Mobile: menu button + logo */}
          <div className="md:hidden flex items-center gap-2 min-w-0 flex-1">
            {onMenuClick && (
              <button
                type="button"
                onClick={onMenuClick}
                className="flex-shrink-0 p-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {logoError ? (
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            ) : (
              <Image 
                src="/formula-ihu-logo.png" 
                alt="Formula IHU" 
                width={240}
                height={64}
                className="h-8 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
                quality={90}
                priority
                onError={() => setLogoError(true)}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="relative p-2.5 text-gray-500 hover:text-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg transition-all duration-300 group"
                >
                  <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 block h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white shadow-lg animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] p-0 border-gray-200 shadow-2xl rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:text-primary-600 font-semibold transition-colors underline-offset-2 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <p className="mt-2 text-sm">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-all duration-200 ${
                            !notification.read ? 'bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold text-gray-900 ${!notification.read ? 'font-bold' : ''}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-primary mt-1 animate-pulse shadow-md"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 transition-all duration-300 hover:bg-gray-50 p-1.5 group">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center border-2 border-primary/20 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                  <span className="text-sm font-semibold text-white">
                    {profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors hidden sm:block group-hover:rotate-180 duration-300" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl border-gray-200 shadow-2xl p-0 overflow-hidden">
                <div className="px-4 py-3.5 text-sm border-b border-gray-100 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
                  <p className="font-bold text-gray-900">{profile?.first_name || ''} {profile?.last_name || ''}</p>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{user?.email || ''}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-md border border-gray-200 shadow-sm">
                    <span className="text-xs text-gray-600 capitalize font-semibold">{userRole.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="py-1.5">
                  <DropdownMenuItem
                    onClick={() => router.push('/settings/profile')}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span className="font-medium">Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={signOutSupabase}
                    disabled={isLoggingOut}
                    variant="destructive"
                    aria-label="Sign out"
                    aria-busy={isLoggingOut}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  )
}
