import { createServerSupabaseClient } from '@/lib/supabase'
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

  if (code) {
    const supabase = createServerSupabaseClient()
    
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
    console.log('[auth/callback] No code provided in callback')
  }

  console.log('[auth/callback] Redirecting to:', redirectTo)
  // Redirect to the intended destination or dashboard
  return NextResponse.redirect(new URL(redirectTo, request.url))
}
