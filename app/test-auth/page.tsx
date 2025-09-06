'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    
    getUser()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      {user ? (
        <div>
          <p className="text-green-600">✅ User is authenticated!</p>
          <p>Email: {user.email}</p>
          <p>ID: {user.id}</p>
        </div>
      ) : (
        <div>
          <p className="text-red-600">❌ User is NOT authenticated</p>
          <a href="/auth/signin" className="text-blue-600 underline">Go to Sign In</a>
        </div>
      )}
    </div>
  )
}

