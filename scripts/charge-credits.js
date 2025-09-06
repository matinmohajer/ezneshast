#!/usr/bin/env node

/**
 * CLI script to charge user accounts
 * Usage: node scripts/charge-credits.js <email> <amount> <reason>
 * Example: node scripts/charge-credits.js user@example.com 100 "Initial credit allocation"
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function chargeCredits(email, amount, reason) {
  try {
    console.log(`🔍 Looking up user: ${email}`)
    
    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Failed to fetch users:', userError.message)
      return
    }

    const targetUser = users.users.find(user => user.email === email)
    
    if (!targetUser) {
      console.error(`❌ User not found: ${email}`)
      return
    }

    console.log(`✅ Found user: ${targetUser.email} (ID: ${targetUser.id})`)

    // Get current balance
    const { data: currentCredits, error: creditsError } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', targetUser.id)
      .single()

    if (creditsError) {
      console.error('❌ Failed to fetch current credits:', creditsError.message)
      return
    }

    const currentBalance = currentCredits?.balance || 0
    const newBalance = currentBalance + amount

    if (newBalance < 0) {
      console.error(`❌ Insufficient credits. Current: ${currentBalance}, Trying to deduct: ${Math.abs(amount)}`)
      return
    }

    console.log(`💰 Current balance: ${currentBalance}`)
    console.log(`💳 Transaction: ${amount > 0 ? '+' : ''}${amount}`)
    console.log(`💎 New balance: ${newBalance}`)

    // Update credits balance
    const { error: updateError } = await supabase
      .from('credits')
      .update({ balance: newBalance })
      .eq('user_id', targetUser.id)

    if (updateError) {
      console.error('❌ Failed to update credits:', updateError.message)
      return
    }

    // Insert ledger entry
    const { error: ledgerError } = await supabase
      .from('credit_ledger')
      .insert({
        user_id: targetUser.id,
        amount,
        reason: `${reason} (via CLI)`,
        reference: `cli_${Date.now()}`
      })

    if (ledgerError) {
      console.error('❌ Failed to insert ledger entry:', ledgerError.message)
      return
    }

    console.log(`✅ Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits`)
    console.log(`📝 Reason: ${reason}`)
    console.log(`🎯 Final balance: ${newBalance}`)

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length !== 3) {
  console.log('Usage: node scripts/charge-credits.js <email> <amount> <reason>')
  console.log('Example: node scripts/charge-credits.js user@example.com 100 "Initial credit allocation"')
  console.log('Example: node scripts/charge-credits.js user@example.com -50 "Refund for failed transcription"')
  process.exit(1)
}

const [email, amountStr, reason] = args
const amount = parseInt(amountStr)

if (isNaN(amount)) {
  console.error('❌ Amount must be a number')
  process.exit(1)
}

if (amount === 0) {
  console.error('❌ Amount cannot be zero')
  process.exit(1)
}

chargeCredits(email, amount, reason)
