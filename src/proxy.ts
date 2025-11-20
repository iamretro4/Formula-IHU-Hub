import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const supabase = createServerClient(
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
  const isAuthRoute = pathname.startsWith('/auth')
  const isProtectedRoute = !isAuthRoute && pathname !== '/' && !pathname.startsWith('/api')

  // For auth routes, check if user is authenticated
  // Use getUser() directly to validate token with server
  if (isAuthRoute) {
    try {
      // Use getUser() which validates the token with Supabase Auth server
      const { data: { user }, error } = await supabase.auth.getUser()
      
      // Only redirect if we have a valid authenticated user (no error)
      if (user && !error) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
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
        const url = request.nextUrl.clone()
        url.pathname = '/auth/signin'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }
    } catch (err) {
      // On error, redirect to signin
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      return NextResponse.redirect(url)
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
