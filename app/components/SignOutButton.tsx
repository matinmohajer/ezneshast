'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function SignOutButton({ className, children }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    
    try {
      // Sign out using the client
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        alert('Error signing out: ' + error.message)
        return
      }
      
      // Force a page reload to clear any cached state
      window.location.href = '/auth/signin'
      
    } catch (error) {
      console.error('Unexpected sign out error:', error)
      alert('An unexpected error occurred while signing out')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={className || "bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"}
    >
      {loading ? 'Signing out...' : (children || 'Sign Out')}
    </button>
  )
}
