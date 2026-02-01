'use client'
import Image from 'next/image'
import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { signInSchema, SignInInput } from '@/lib/validators'
import { Mail, Lock, LogIn, Loader2, AlertCircle, ClipboardCheck, Eye, EyeOff } from 'lucide-react'
import getSupabaseClient, { hasSupabaseEnv } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'


export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirectHandled = useRef(false)
  const formSubmitInProgress = useRef(false)
  const [logoError, setLogoError] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  const emailValue = watch('email')
  const passwordValue = watch('password')
  const isFirstRender = useRef(true)

  // Clear inline error when user edits email or password (not on initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setError(null)
  }, [emailValue, passwordValue])

  // Check if already authenticated and redirect - but only if session is truly valid
  useEffect(() => {
    if (!hasSupabaseEnv()) return
    let mounted = true

    const checkAuth = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!mounted || !user || error) return
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('login_approved')
          .eq('id', user.id)
          .single() as { data: { login_approved: boolean } | null }
        if (profile && profile.login_approved === false) {
          await supabase.auth.signOut()
          return
        }
        window.location.assign('/dashboard')
      } catch (err) {
        console.warn('Auth check error:', err)
      }
    }

    const timeoutId = setTimeout(() => {
      checkAuth()
    }, 300)

    const supabase = getSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED') || !session?.user || redirectHandled.current) return
      // If the form just submitted, don't redirect or sign out here – let the form set the error or redirect
      if (formSubmitInProgress.current) return
      // Only redirect if we have a profile and it is approved; otherwise sign out
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('login_approved')
          .eq('id', session.user.id)
          .single() as { data: { login_approved: boolean } | null; error: unknown }
        if (profileError || !profile) {
          await supabase.auth.signOut()
          return
        }
        if (profile.login_approved === false) {
          await supabase.auth.signOut()
          return
        }
      } catch {
        await supabase.auth.signOut()
        return
      }
      redirectHandled.current = true
      setTimeout(() => {
        window.location.assign('/dashboard')
      }, 100)
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const onSubmit = useCallback(async (data: SignInInput) => {
    if (!hasSupabaseEnv()) {
      setError('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server.')
      return
    }
    setIsLoading(true)
    setError(null)
    redirectHandled.current = false
    formSubmitInProgress.current = true

    try {
      const supabase = getSupabaseClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      
      if (error) {
        formSubmitInProgress.current = false
        setError(error.message || 'Invalid email or password')
        setIsLoading(false)
        return
      }

      // Check if admin has approved this account (login_approved)
      if (authData.session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('login_approved')
          .eq('id', authData.session.user.id)
          .single() as { data: { login_approved: boolean } | null }
        if (profile && profile.login_approved === false) {
          await supabase.auth.signOut()
          formSubmitInProgress.current = false
          setError('Your account is pending admin approval. You will be able to sign in once an administrator approves your request.')
          setIsLoading(false)
          return
        }
      }

      // If we have a session and approved, wait a moment for cookies to be set, then redirect
      if (authData.session) {
        redirectHandled.current = true
        formSubmitInProgress.current = false
        toast.success('Signed in successfully!')
        await new Promise(resolve => setTimeout(resolve, 200))
        window.location.assign('/dashboard')
        return
      }

      // Fallback: wait a bit and check for session
      setTimeout(async () => {
        if (redirectHandled.current) return
        const supabase = getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session && !redirectHandled.current) {
          redirectHandled.current = true
          formSubmitInProgress.current = false
          toast.success('Signed in successfully!')
          window.location.assign('/dashboard')
        } else {
          formSubmitInProgress.current = false
          setIsLoading(false)
          setError('Session not established. Please try again.')
        }
      }, 1000)
    } catch (err) {
      formSubmitInProgress.current = false
      const rawMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.'
      const isNetworkError =
        rawMessage === 'Failed to fetch' ||
        rawMessage.includes('NetworkError') ||
        rawMessage.includes('network') ||
        (err instanceof TypeError && rawMessage.includes('fetch'))
      const errorMessage = isNetworkError
        ? 'Cannot reach Supabase. 1) Restart the dev server (npm run dev) if you changed .env.local. 2) In Supabase Dashboard → Project Settings → General, ensure the project is not paused. 3) Check NEXT_PUBLIC_SUPABASE_URL has no typo or trailing slash.'
        : rawMessage
      setError(errorMessage)
      toast.error('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }, [])

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void handleSubmit(onSubmit)(event)
    },
    [handleSubmit, onSubmit]
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/5 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration: soft gradient orbs only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-gray-100 mb-6 p-3 transform hover:scale-105 transition-transform duration-300">
            {logoError ? (
              <ClipboardCheck className="w-12 h-12 text-primary" />
            ) : (
              <Image
                src="/formula-ihu-logo.png"
                alt="Formula IHU"
                width={88}
                height={88}
                className="w-full h-full object-contain"
                quality={90}
                priority
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Welcome Back
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Sign in to access your Formula IHU Hub account
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 sm:p-10 hover:shadow-3xl transition-all duration-300">
          {!hasSupabaseEnv() && (
            <Alert variant="destructive" className="mb-6 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server (npm run dev).
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-6 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="signin-email" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                Email Address
              </label>
              <div className="relative">
                <input
                  id="signin-email"
                  type="email"
                  {...register('email')}
                  className={`w-full px-4 py-3 pl-11 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.email 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="your.email@university.gr"
                  autoComplete="email"
                  autoFocus
                  disabled={isLoading}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'signin-email-error' : undefined}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {errors.email && (
                <p id="signin-email-error" className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in" role="alert">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="signin-password" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" />
                Password
              </label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full px-4 py-3 pl-11 pr-12 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.password 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'signin-password-error' : undefined}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="signin-password-error" className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in" role="alert">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 text-white font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
            <p className="text-center text-sm text-gray-600">
              Don&rsquo;t have an account?{' '}
              <Link 
                href="/auth/signup" 
                className="text-primary hover:text-primary/80 font-semibold transition-colors underline-offset-2 hover:underline"
              >
                Sign up here
              </Link>
            </p>
            <Link 
              href="/auth/forgot-password" 
              className="block text-center text-sm text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline font-medium"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our terms of service and privacy policy
        </p>
      </div>
    </div>
  )
}
