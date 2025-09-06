import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/') ||
    pathname === '/api/health' ||
    pathname === '/api/status'
  ) {
    return NextResponse.next()
  }

  // Routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/voice-transcribe',
    '/voice-meeting-minutes',
    '/admin',
    '/api/voice-transcribe',
    '/api/voice-meeting-minutes',
    '/api/admin'
  ]

  // Routes that are auth-related
  const authRoutes = ['/auth/signin', '/auth/callback']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Handle authentication for protected routes
  if (isProtectedRoute || isAuthRoute) {
    try {
      const supabase = createMiddlewareSupabaseClient(request)
      
      // Check if supabase client is properly initialized
      if (!supabase || !supabase.auth) {
        console.error('Supabase client not properly initialized in middleware')
        if (isProtectedRoute) {
          return NextResponse.redirect(new URL('/auth/signin', request.url))
        }
        return NextResponse.next()
      }

      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        console.error('Auth error in middleware:', error)
      }

      // Redirect unauthenticated users from protected routes
      if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/auth/signin', request.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Redirect authenticated users from auth routes
      if (isAuthRoute && user && pathname !== '/auth/callback') {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard'
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }

      // Add user info to headers for API routes
      if (isProtectedRoute && user && pathname.startsWith('/api/')) {
        const response = NextResponse.next()
        response.headers.set('X-User-ID', user.id)
        response.headers.set('X-User-Email', user.email || '')
        return response
      }

    } catch (error) {
      console.error('Middleware error:', error)
      
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
    }
  }

  // Add security headers
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', 
      process.env.NODE_ENV === 'production' 
        ? 'https://ezneshast.com' 
        : 'http://localhost:3000'
    )
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
