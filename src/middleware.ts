import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // For auth routes, use getUser() to validate token with server
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
      // If there's an error or no user, clear cookies and allow access
      if (error || !user) {
        // Clear any invalid cookies that might cause issues
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
        // Also try to clear Supabase auth cookies
        const allCookies = request.cookies.getAll()
        allCookies.forEach((cookie) => {
          if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
            response.cookies.delete(cookie.name)
          }
        })
      }
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
