'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { signInSchema, SignInInput } from '@/lib/validators'
import {
  ClipboardDocumentCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'

// Use createBrowserClient from @supabase/ssr for proper cookie handling in Next.js 15
const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const redirectHandled = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  // Check if already authenticated and redirect - but only if session is truly valid
  useEffect(() => {
    let mounted = true
    
    const checkAuth = async () => {
      try {
        // Use getUser() which validates the token with Supabase Auth server
        // This ensures we only redirect if there's a truly valid authenticated user
        const { data: { user }, error } = await supabase.auth.getUser()
        
        // Only redirect if we have a valid user (token is valid) and no error
        if (mounted && user && !error) {
          // User is actually authenticated, redirect
          window.location.href = '/dashboard'
        }
        // Otherwise, stay on sign-in page
      } catch (err) {
        // If there's an error checking auth, don't redirect - let user sign in
        console.warn('Auth check error:', err)
      }
    }
    
    // Delay to avoid race conditions and ensure page is mounted
    const timeoutId = setTimeout(() => {
      checkAuth()
    }, 300)

    // Listen for auth state changes and redirect on sign in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !redirectHandled.current) {
        redirectHandled.current = true
        // Small delay to ensure cookies are set
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 100)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [router])

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true)
    redirectHandled.current = false
    
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      
      if (error) {
        toast.error(error.message || 'Invalid email or password')
        setIsLoading(false)
        return
      }

      // If we have a session immediately, wait a moment for cookies to be set, then redirect
      if (authData.session) {
        redirectHandled.current = true
        toast.success('Signed in successfully!')
        // Wait a moment for cookies to be set by Supabase
        await new Promise(resolve => setTimeout(resolve, 200))
        // Force a full page reload to ensure cookies are set and middleware sees the session
        window.location.href = '/dashboard'
        return
      }

      // Fallback: wait a bit and check for session
      setTimeout(async () => {
        if (redirectHandled.current) return
        
        const { data: { session } } = await supabase.auth.getSession()
        if (session && !redirectHandled.current) {
          redirectHandled.current = true
          toast.success('Signed in successfully!')
          window.location.href = '/dashboard'
        } else {
          setIsLoading(false)
          toast.error('Session not established. Please try again.')
        }
      }, 1000)
    } catch (err) {
      toast.error('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
            <ClipboardDocumentCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to Scrutineer Hub
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Professional scrutineering platform for formula racing
          </p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                {...register('email')}
                className="form-input"
                placeholder="Enter your email"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="form-input pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary"
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign up here
              </Link>
            </p>
            <Link href="/auth/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
