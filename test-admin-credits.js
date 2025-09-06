#!/usr/bin/env node

/**
 * Test Admin Credits API
 * Usage: node test-admin-credits.js <email> <amount> <reason>
 */

require('dotenv').config({ path: '.env.local' })

async function testAdminCredits(email, amount, reason) {
  if (!email || !amount || !reason) {
    console.log('Usage: node test-admin-credits.js <email> <amount> <reason>')
    console.log('Example: node test-admin-credits.js user@example.com 100 "Test credit"')
    process.exit(1)
  }

  try {
    console.log('🧪 Testing Admin Credits API...')
    console.log(`📧 Email: ${email}`)
    console.log(`💰 Amount: ${amount}`)
    console.log(`📝 Reason: ${reason}`)
    console.log('')

    const response = await fetch('http://localhost:3002/api/admin/credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, amount: Number(amount), reason }),
    })

    const data = await response.json()

    console.log('📊 Response Status:', response.status)
    console.log('📋 Response Data:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('✅ Success!')
    } else {
      console.log('❌ Error!')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

const [,, email, amount, reason] = process.argv
testAdminCredits(email, amount, reason)
