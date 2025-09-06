import { createServerSupabaseClientWithCookies, getServerUser } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = await isAdminUser(user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { email, amount, reason } = body

    if (!email || !amount || !reason) {
      return NextResponse.json({ error: 'Email, amount, and reason are required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClientWithCookies()

    // Use a simpler approach - directly update credits using a custom RPC function
    // that handles user lookup by email
    const { data: creditResult, error: creditError } = await supabase.rpc('admin_update_credits', {
      p_email: email,
      p_amount: amount,
      p_reason: reason,
      p_admin_user_id: user.id
    })

    if (creditError) {
      console.error('Credit update error:', creditError)
      return NextResponse.json({ 
        error: `Failed to update credits: ${creditError.message}` 
      }, { status: 500 })
    }

    if (!creditResult.success) {
      return NextResponse.json({ 
        error: `Credit update failed: ${creditResult.message}` 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits for ${email}`,
      new_balance: creditResult.new_balance
    })

  } catch (error) {
    console.error('Admin credits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
