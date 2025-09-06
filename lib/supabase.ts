import { createClient } from '@supabase/supabase-js'

// Types for our database tables
export interface Database {
  public: {
    Tables: {
      credits: {
        Row: {
          id: string
          user_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      credit_ledger: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: string
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: string
          reference?: string | null
          created_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          type: string
          status: string
          cost: number
          reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          status: string
          cost: number
          reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          status?: string
          cost?: number
          reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      consume_credits: {
        Args: {
          p_cost: number
          p_key: string
          p_reason: string
          p_ref?: string | null
        }
        Returns: {
          success: boolean
          new_balance: number
          message: string
        }
      }
    }
  }
}

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for API routes)
export function createServerSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server operations')
  }
  
  return createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper to check if user is admin
export async function isAdminUser(userEmail?: string | null): Promise<boolean> {
  if (!userEmail) return false
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  return adminEmails.includes(userEmail.toLowerCase().trim())
}
