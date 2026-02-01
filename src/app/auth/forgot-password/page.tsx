'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import getSupabaseClient, { hasSupabaseEnv } from '@/lib/supabase/client'
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const sendResetEmail = async (email: string) => {
    const supabase = getSupabaseClient()
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
    })
  }

  const onSubmit = async (data: ForgotPasswordInput) => {
    if (!hasSupabaseEnv()) {
      setError('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server.')
      return
    }
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const { error: resetError } = await sendResetEmail(data.email)

      if (resetError) {
        setError(resetError.message || 'Failed to send password reset email')
        setIsLoading(false)
        return
      }

      setIsSuccess(true)
      toast.success('Password reset email sent! Please check your inbox.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.'
      setError(errorMessage)
      toast.error('Something went wrong. Please try again.')
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  const onResend = async () => {
    const email = getValues('email')
    if (!email || !hasSupabaseEnv()) return
    setIsResending(true)
    setError(null)
    try {
      const { error: resetError } = await sendResetEmail(email)
      if (resetError) {
        setError(resetError.message || 'Failed to resend')
        toast.error(resetError.message || 'Failed to resend')
      } else {
        toast.success('Reset link sent again. Please check your inbox.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/5 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in">
          {/* Success Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 sm:p-10 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg mb-6 ring-4 ring-green-200">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Check Your Email
            </h2>
            
            <p className="text-gray-600 mb-6">
              We&rsquo;ve sent a password reset link to{' '}
              <span className="font-semibold text-gray-900">{getValues('email')}</span>
            </p>
            
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <Mail className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Please check your inbox and click the link to reset your password. The link will expire in 1 hour.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <button
                type="button"
                onClick={onResend}
                disabled={isResending}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Email'
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="w-full text-center text-sm text-gray-600 hover:text-primary transition-colors font-medium"
              >
                Use a different email
              </button>
              
              <Link
                href="/auth/signin"
                className="block w-full text-center text-primary hover:text-primary/80 font-semibold transition-colors underline-offset-2 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/5 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl flex items-center justify-center shadow-2xl mb-6 ring-4 ring-primary/20 transform hover:scale-105 transition-transform duration-300">
            <KeyRound className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Forgot Password?
          </h2>
          <p className="mt-3 text-base text-gray-600">
            No worries! Enter your email address and we&rsquo;ll send you a link to reset your password.
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full px-4 py-3 pl-11 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.email 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-300 bg-white focus:border-primary'
                  }`}
                  placeholder="your.email@university.gr"
                  autoComplete="email"
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                We&rsquo;ll send a password reset link to this email address.
              </p>
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
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
            <p className="text-center text-sm text-gray-600">
              Don&rsquo;t have an account?{' '}
              <Link 
                href="/auth/signup" 
                className="text-primary hover:text-primary/80 font-semibold transition-colors underline-offset-2 hover:underline"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-xs text-gray-500">
          If you don&rsquo;t receive an email, please check your spam folder or contact support.
        </p>
      </div>
    </div>
  )
}

