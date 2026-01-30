'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import getSupabaseClient, { hasSupabaseEnv, ensureSupabaseConnection, refreshSupabaseSession } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle, Copy, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function SupabaseDebugger() {
  const [isOpen, setIsOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking')
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [errorInfo, setErrorInfo] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const { user, profile, loading: authLoading } = useAuth()

  const checkConnection = useCallback(async () => {
    setConnectionStatus('checking')
    setErrorInfo(null)
    
    if (!hasSupabaseEnv()) {
      setConnectionStatus('error')
      setErrorInfo('Missing Supabase environment variables')
      setSessionInfo(null)
      return
    }
    
    try {
      const supabase = getSupabaseClient()
      
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setConnectionStatus('error')
        setErrorInfo(`Session Error: ${sessionError.message}`)
        setSessionInfo(null)
        logger.error('[Debugger] Session check failed', sessionError, { context: 'supabase_debugger' })
        return
      }

      if (!session) {
        setConnectionStatus('disconnected')
        setErrorInfo('No active session')
        setSessionInfo(null)
        return
      }

      // Check user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        setConnectionStatus('error')
        setErrorInfo(`User Error: ${userError.message}`)
        setSessionInfo({
          session: {
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            expiresIn: session.expires_at ? Math.max(0, Math.floor((session.expires_at * 1000 - Date.now()) / 1000 / 60)) : null,
          },
          user: null,
        })
        logger.error('[Debugger] User check failed', userError, { context: 'supabase_debugger' })
        return
      }

      // Test a simple query
      const connectionValid = await ensureSupabaseConnection()
      
      setConnectionStatus(connectionValid ? 'connected' : 'disconnected')
      setSessionInfo({
        session: {
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          expiresIn: session.expires_at ? Math.max(0, Math.floor((session.expires_at * 1000 - Date.now()) / 1000 / 60)) : null,
          accessToken: session.access_token ? `${session.access_token.substring(0, 20)}...` : null,
        },
        user: currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          role: profile?.app_role || 'unknown',
        } : null,
      })
      setLastCheck(new Date())
      
      if (connectionValid) {
        logger.debug('[Debugger] Connection check successful', { context: 'supabase_debugger' })
      } else {
        logger.warn('[Debugger] Connection check failed', { context: 'supabase_debugger' })
      }
    } catch (err) {
      setConnectionStatus('error')
      setErrorInfo(err instanceof Error ? err.message : 'Unknown error')
      setSessionInfo(null)
      logger.error('[Debugger] Connection check error', err, { context: 'supabase_debugger' })
    }
  }, [profile])

  const handleRefreshSession = async () => {
    if (!hasSupabaseEnv()) {
      toast.error('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local')
      return
    }
    try {
      const refreshed = await refreshSupabaseSession()
      if (refreshed) {
        toast.success('Session refreshed successfully')
        await checkConnection()
      } else {
        toast.error('Failed to refresh session')
      }
    } catch (err) {
      toast.error('Error refreshing session')
      logger.error('[Debugger] Session refresh error', err, { context: 'supabase_debugger' })
    }
  }

  const handleClearCookies = () => {
    if (typeof window === 'undefined') return
    
    const cookies = document.cookie.split(';')
    cookies.forEach(cookie => {
      const [name] = cookie.split('=')
      const trimmedName = name.trim()
      if (trimmedName.startsWith('sb-') || trimmedName.includes('supabase')) {
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`
      }
    })
    toast.success('Supabase cookies cleared. Please refresh the page.')
  }

  const copyDebugInfo = () => {
    const debugInfo = {
      connectionStatus,
      sessionInfo,
      errorInfo,
      authContext: {
        hasUser: !!user,
        userId: user?.id,
        profileRole: profile?.app_role,
        authLoading,
      },
      timestamp: new Date().toISOString(),
    }
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
    toast.success('Debug info copied to clipboard')
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const timeoutId = setTimeout(() => {
      void checkConnection()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [isOpen, checkConnection])

  if (process.env.NODE_ENV === 'production') {
    return null // Don't show in production
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary-600 transition-all"
        aria-label="Supabase Debugger"
      >
        {connectionStatus === 'connected' ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : connectionStatus === 'error' ? (
          <XCircle className="w-5 h-5" />
        ) : (
          <AlertTriangle className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] overflow-auto">
          <Card className="shadow-2xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Supabase Debugger</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyDebugInfo}
                    className="h-8"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="h-8"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Connection Status</span>
                  <Badge
                    variant={
                      connectionStatus === 'connected'
                        ? 'default'
                        : connectionStatus === 'error'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {connectionStatus === 'checking' && 'Checking...'}
                    {connectionStatus === 'connected' && 'Connected'}
                    {connectionStatus === 'disconnected' && 'Disconnected'}
                    {connectionStatus === 'error' && 'Error'}
                  </Badge>
                </div>
                {lastCheck && (
                  <p className="text-xs text-gray-500">Last check: {lastCheck.toLocaleTimeString()}</p>
                )}
              </div>

              {/* Error Info */}
              {errorInfo && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">Error:</p>
                  <p className="text-xs text-red-600 mt-1">{errorInfo}</p>
                </div>
              )}

              {/* Session Info */}
              {sessionInfo && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Session Info</p>
                  <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                    {sessionInfo.session.expiresIn !== null && (
                      <p>
                        <span className="font-medium">Expires in:</span> {sessionInfo.session.expiresIn} minutes
                      </p>
                    )}
                    {sessionInfo.session.expiresAt && (
                      <p>
                        <span className="font-medium">Expires at:</span>{' '}
                        {new Date(sessionInfo.session.expiresAt).toLocaleString()}
                      </p>
                    )}
                    {sessionInfo.user && (
                      <>
                        <p>
                          <span className="font-medium">User ID:</span> {sessionInfo.user.id}
                        </p>
                        <p>
                          <span className="font-medium">Email:</span> {sessionInfo.user.email}
                        </p>
                        <p>
                          <span className="font-medium">Role:</span> {sessionInfo.user.role}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Auth Context Info */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Auth Context</p>
                <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                  <p>
                    <span className="font-medium">Has User:</span> {user ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <span className="font-medium">Loading:</span> {authLoading ? 'Yes' : 'No'}
                  </p>
                  {profile && (
                    <p>
                      <span className="font-medium">Profile Role:</span> {profile.app_role}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={checkConnection}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Connection
                </Button>
                <Button
                  size="sm"
                  onClick={handleRefreshSession}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Session
                </Button>
                <Button
                  size="sm"
                  onClick={handleClearCookies}
                  className="w-full"
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cookies
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}


