#!/usr/bin/env node

/**
 * Test Voice Transcription API
 * Usage: node test-voice-transcribe.js
 */

require('dotenv').config({ path: '.env.local' })

async function testVoiceTranscribe() {
  try {
    console.log('🧪 Testing Voice Transcription API...')
    console.log('')

    // First, let's test if we can get the user's current balance
    console.log('1. Testing user authentication and balance...')
    
    const response = await fetch('http://localhost:3002/api/voice-transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }), // This should fail with "audio required"
    })

    const data = await response.json()
    console.log('Response Status:', response.status)
    console.log('Response Data:', JSON.stringify(data, null, 2))

    if (response.status === 401) {
      console.log('❌ Authentication failed - make sure you are signed in')
      return
    }

    if (response.status === 402) {
      console.log('✅ Authentication working, but insufficient credits')
      console.log('Current balance:', data.balance)
      console.log('Required credits:', data.required)
      return
    }

    if (response.status === 400 && data.error === '`audio` field required') {
      console.log('✅ Authentication and credits working!')
      console.log('The API is ready to accept audio files')
      return
    }

    console.log('Response:', data)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testVoiceTranscribe()
