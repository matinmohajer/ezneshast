import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/upload', '/admin', '/voice-transcribe', '/voice-meeting-minutes']

// Routes that should redirect authenticated users
const authRoutes = ['/auth/signin']

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareSupabaseClient(request)
  
  // Get the current path
  const pathname = request.nextUrl.pathname
  
  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute || isAuthRoute) {
    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Auth error in middleware:', error)
    }
    
    // Handle protected routes
    if (isProtectedRoute) {
      if (!user) {
        // For protected routes, redirect to signin if no user found
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(signInUrl)
      }
      
      // Check admin access for /admin routes
      if (pathname.startsWith('/admin')) {
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
        const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase().trim())
        
        if (!isAdmin) {
          // Redirect to dashboard if not admin
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
    
    // Handle auth routes (redirect if already authenticated)
    if (isAuthRoute && user) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
