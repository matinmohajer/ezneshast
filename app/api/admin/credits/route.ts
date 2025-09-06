import { createServerSupabaseClient } from '@/lib/supabase'
import { getServerUser } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const isAdmin = await isAdminUser(user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { email, amount, reason } = await request.json()

    if (!email || amount === undefined || !reason) {
      return NextResponse.json(
        { error: 'Email, amount, and reason are required' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-zero number' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Find user by email using a different approach
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    const targetUser = users.users.find(user => user.email === email)
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userId = targetUser.id

    // Get current balance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentCredits, error: creditsError } = await (supabase as any)
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (creditsError) {
      console.error('Error fetching current credits:', creditsError)
      return NextResponse.json(
        { error: 'Failed to fetch current balance' },
        { status: 500 }
      )
    }

    const currentBalance = currentCredits?.balance || 0
    const newBalance = currentBalance + amount

    // Check if new balance would be negative
    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Insufficient credits to deduct this amount' },
        { status: 400 }
      )
    }

    // Update credits balance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('credits')
      .update({ balance: newBalance })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating credits:', updateError)
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      )
    }

    // Insert ledger entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: ledgerError } = await (supabase as any)
      .from('credit_ledger')
      .insert({
        user_id: userId,
        amount,
        reason: `${reason} (by admin: ${user.email})`,
        reference: `admin_${Date.now()}`
      })

    if (ledgerError) {
      console.error('Error inserting ledger entry:', ledgerError)
      // Note: We don't rollback the credits update here for simplicity
      // In production, you might want to implement proper transaction handling
    }

    return NextResponse.json({
      success: true,
      email,
      amount,
      previousBalance: currentBalance,
      newBalance,
      message: `Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits`
    })

  } catch (error) {
    console.error('Admin credit update error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
