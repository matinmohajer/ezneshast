'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [authState, setAuthState] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[Debug] Checking Supabase connection...')
        
        // Check if Supabase client is properly configured
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('[Debug] Auth check result:', { user, error })
        
        setAuthState({
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          } : null,
          error: error ? error.message : null,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        })
        
        setLoading(false)
      } catch (err) {
        console.error('[Debug] Error checking auth:', err)
        setAuthState({
          error: err instanceof Error ? err.message : 'Unknown error',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        })
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  if (loading) {
    return <div className="p-8">Loading debug info...</div>
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <pre className="text-sm">
            {JSON.stringify({
              supabaseUrl: authState?.supabaseUrl,
              hasAnonKey: authState?.hasAnonKey
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Authentication State</h2>
          <pre className="text-sm">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Actions</h2>
          <div className="space-x-2">
            <button
              onClick={() => window.location.href = '/auth/signin'}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Go to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

