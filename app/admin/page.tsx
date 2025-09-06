import { createServerSupabaseClientWithCookies, getServerUser } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import AdminCreditManager from './components/AdminCreditManager'

export default async function AdminPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  const isAdmin = await isAdminUser(user.email)
  if (!isAdmin) {
    redirect('/dashboard')
  }

  const supabase = await createServerSupabaseClientWithCookies()

  // Get all users with their credit balances
  const { data: users } = await supabase
    .from('credits')
    .select(`
      *,
      user:user_id (
        id,
        email
      )
    `)
    .order('balance', { ascending: false }) as { data: Array<{
      id: string;
      user_id: string;
      balance: number;
      created_at: string;
      updated_at: string;
      user: { id: string; email: string } | null;
    }> | null }

  // Get recent credit ledger entries across all users
  const { data: recentTransactions } = await supabase
    .from('credit_ledger')
    .select(`
      *,
      user:user_id (
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20) as { data: Array<{
      id: string;
      user_id: string;
      amount: number;
      reason: string;
      reference: string | null;
      created_at: string;
      user: { email: string } | null;
    }> | null }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-1">Credit Management System</p>
            </div>
            <div className="flex space-x-4">
              <a
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </a>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Credit Management Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Management</h2>
          <AdminCreditManager />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Balances */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">User Balances</h3>
            </div>
            <div className="p-6">
              {users && users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((userCredit) => (
                    <div key={userCredit.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {userCredit.user?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {userCredit.user_id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">
                          {userCredit.balance} credits
                        </p>
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(userCredit.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No users found</p>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="p-6">
              {recentTransactions && recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{transaction.reason}</p>
                        <p className="text-xs text-gray-500">
                          {transaction.user?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No transactions found</p>
              )}
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {users?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {users?.reduce((sum, user) => sum + user.balance, 0) || 0}
              </div>
              <div className="text-sm text-gray-600">Total Credits</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {recentTransactions?.filter(t => t.amount < 0).length || 0}
              </div>
              <div className="text-sm text-gray-600">Debits Today</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {recentTransactions?.filter(t => t.amount > 0).length || 0}
              </div>
              <div className="text-sm text-gray-600">Credits Today</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
