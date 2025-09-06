#!/usr/bin/env node

/**
 * Enhanced Credit Management CLI Script
 * Usage: node scripts/charge-credits.js <email> <amount> <reason>
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables.')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function chargeCredits(email, amount, reason) {
  if (!email || amount === undefined || !reason) {
    console.log('📖 Usage: node scripts/charge-credits.js <email> <amount> <reason>')
    console.log('  <amount> can be positive (add) or negative (deduct)')
    console.log('  <reason> should describe why credits are being added/deducted')
    console.log('')
    console.log('📝 Examples:')
    console.log('  node scripts/charge-credits.js user@example.com 100 "Initial credit"')
    console.log('  node scripts/charge-credits.js user@example.com -50 "Refund for failed transcription"')
    process.exit(1)
  }

  const parsedAmount = parseInt(amount, 10)
  if (isNaN(parsedAmount) || parsedAmount === 0) {
    console.error('❌ Error: Amount must be a non-zero number.')
    process.exit(1)
  }

  try {
    console.log('🔍 Looking up user...')
    
    // Find user by email using admin API
    const { data: usersData, error: listUsersError } = await supabase.auth.admin.listUsers()

    if (listUsersError) {
      console.error('❌ Error listing users:', listUsersError.message)
      process.exit(1)
    }

    const targetUser = usersData.users.find(user => user.email === email)

    if (!targetUser) {
      console.error(`❌ Error: User with email "${email}" not found.`)
      console.log('')
      console.log('💡 Available users:')
      usersData.users.slice(0, 5).forEach(user => {
        console.log(`  - ${user.email} (${user.id})`)
      })
      if (usersData.users.length > 5) {
        console.log(`  ... and ${usersData.users.length - 5} more users`)
      }
      process.exit(1)
    }

    console.log(`✅ Found user: ${targetUser.email} (${targetUser.id})`)

    // Get current balance
    const { data: currentCredits, error: creditsError } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', targetUser.id)
      .single()

    if (creditsError) {
      console.error('❌ Error getting current balance:', creditsError.message)
      process.exit(1)
    }

    const currentBalance = currentCredits?.balance || 0
    console.log(`💰 Current balance: ${currentBalance} credits`)

    // Call the RPC function to consume/add credits
    console.log('💳 Processing credit transaction...')
    
    const { data, error } = await supabase.rpc('consume_credits', {
      p_cost: -parsedAmount, // Invert amount for consume_credits function
      p_key: `admin_cli_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      p_reason: reason,
      p_ref: `admin_cli_charge`,
      p_metadata: {
        admin_action: 'cli_charge',
        timestamp: new Date().toISOString(),
        amount: parsedAmount,
        reason: reason
      }
    })

    if (error) {
      console.error('❌ Error calling consume_credits RPC:', error.message)
      process.exit(1)
    }

    if (data.success) {
      console.log('')
      console.log('🎉 Transaction completed successfully!')
      console.log(`�� User: ${email}`)
      console.log(`💵 Amount: ${parsedAmount > 0 ? '+' : ''}${parsedAmount} credits`)
      console.log(`📝 Reason: ${reason}`)
      console.log(`💰 Previous balance: ${currentBalance} credits`)
      console.log(`💰 New balance: ${data.new_balance} credits`)
      console.log(`�� Job ID: ${data.job_id}`)
      console.log('')
      
      // Show recent transactions
      console.log('📊 Recent transactions for this user:')
      const { data: recentTransactions } = await supabase
        .from('credit_ledger')
        .select('*')
        .eq('user_id', targetUser.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentTransactions && recentTransactions.length > 0) {
        recentTransactions.forEach((tx, index) => {
          const date = new Date(tx.created_at).toLocaleString()
          const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount.toString()
          console.log(`  ${index + 1}. ${amount} credits - ${tx.reason} (${date})`)
        })
      }
    } else {
      console.error(`❌ Failed to update credits for ${email}: ${data.message}`)
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ An unexpected error occurred:', error.message)
    console.error('')
    console.error('🔧 Troubleshooting:')
    console.error('  1. Check your Supabase connection')
    console.error('  2. Verify your service role key has proper permissions')
    console.error('  3. Ensure the database schema is up to date')
    process.exit(1)
  }
}

// Parse command line arguments
const [,, email, amount, reason] = process.argv

// Show help if no arguments provided
if (!email && !amount && !reason) {
  console.log('🚀 EzneShast Credit Management CLI')
  console.log('')
  console.log('📖 Usage: node scripts/charge-credits.js <email> <amount> <reason>')
  console.log('')
  console.log('📝 Examples:')
  console.log('  node scripts/charge-credits.js user@example.com 100 "Initial credit"')
  console.log('  node scripts/charge-credits.js user@example.com -50 "Refund for failed transcription"')
  console.log('')
  console.log('💡 Tips:')
  console.log('  - Use positive amounts to add credits')
  console.log('  - Use negative amounts to deduct credits')
  console.log('  - Provide a clear reason for audit purposes')
  console.log('')
  process.exit(0)
}

chargeCredits(email, amount, reason)
