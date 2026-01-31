import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function proxy(request: NextRequest) {
  // Handle CORS for API routes
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'https://fihu.gr',
    'https://hub.fihu.gr',
    'https://flow.fihu.gr',
    'http://localhost:3000',
  ]
  
  const isAllowedOrigin = origin && allowedOrigins.includes(origin)
  const corsOrigin = isAllowedOrigin ? origin : allowedOrigins[0]

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add CORS headers to response for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Origin', corsOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // If env vars are missing, skip auth checks (allow all requests)
  // This prevents build-time errors during static generation
  if (!url || !key) {
    return response
  }

  const supabase = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const protectedPaths = ['/dashboard', '/admin', '/scrutineering', '/complete-profile', '/settings', '/judged-events', '/track', '/results', '/feedback']
  const isAuthRoute = pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')
  const isProtectedRoute = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // For auth routes, check if user is authenticated
  // Use getUser() directly to validate token with server
  if (isAuthRoute) {
    try {
      // Use getUser() which validates the token with Supabase Auth server
      const { data: { user }, error } = await supabase.auth.getUser()
      
      // Only redirect if we have a valid authenticated user (no error)
      if (user && !error) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
      
      // If there's no user or error, allow access to auth routes
    } catch (err) {
      // On any error, allow access to auth routes
      console.warn('Middleware auth check error:', err)
    }
    return response
  }

  // For protected routes, use getUser() to validate token
  if (isProtectedRoute) {
    try {
      // Use getUser() which validates the token with Supabase Auth server
      const { data: { user }, error } = await supabase.auth.getUser()
      const hasValidSession = user && !error
      
      if (!hasValidSession) {
        const signInUrl = request.nextUrl.clone()
        signInUrl.pathname = '/auth/signin'
        signInUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(signInUrl)
      }
    } catch (err) {
      const signInUrl = request.nextUrl.clone()
      signInUrl.pathname = '/auth/signin'
      return NextResponse.redirect(signInUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
