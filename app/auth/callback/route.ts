import { createServerSupabaseClientWithCookies } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  console.log('[auth/callback] Received callback:', {
    code: code ? 'present' : 'missing',
    redirectTo,
    fullUrl: requestUrl.toString()
  })

  const supabase = await createServerSupabaseClientWithCookies()

  // For OAuth flows (with code parameter)
  if (code) {
    try {
      console.log('[auth/callback] Exchanging code for session...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[auth/callback] Auth callback error:', error)
        return NextResponse.redirect(new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, request.url))
      }
      
      console.log('[auth/callback] Session exchange successful:', {
        user: data.user ? 'present' : 'missing',
        session: data.session ? 'present' : 'missing'
      })
    } catch (error) {
      console.error('[auth/callback] Unexpected auth callback error:', error)
      return NextResponse.redirect(new URL('/auth/signin?error=unexpected_error', request.url))
    }
  } else {
    // For magic link flows (no code parameter)
    console.log('[auth/callback] Magic link flow - checking existing session...')
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('[auth/callback] Error getting user:', error)
        // For magic links, redirect to signin page where tokens will be handled
        return NextResponse.redirect(new URL(`/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`, request.url))
      }
      
      if (user) {
        console.log('[auth/callback] User authenticated via magic link:', user.email)
      } else {
        console.log('[auth/callback] No user found in session')
        return NextResponse.redirect(new URL(`/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`, request.url))
      }
    } catch (error) {
      console.error('[auth/callback] Unexpected error checking session:', error)
      return NextResponse.redirect(new URL(`/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`, request.url))
    }
  }

  console.log('[auth/callback] Redirecting to:', redirectTo)
  // Redirect to the intended destination or dashboard
  return NextResponse.redirect(new URL(redirectTo, request.url))
}
