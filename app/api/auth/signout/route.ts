import { createServerSupabaseClientWithCookies } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClientWithCookies()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Create a response that redirects to signin page
    const response = NextResponse.redirect(new URL('/auth/signin', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
    
    // Clear any remaining auth cookies
    response.cookies.delete('sb-mrbqjvqjfmljtvtecirf-auth-token')
    response.cookies.delete('sb-mrbqjvqjfmljtvtecirf-auth-token.0')
    response.cookies.delete('sb-mrbqjvqjfmljtvtecirf-auth-token.1')
    
    return response
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
