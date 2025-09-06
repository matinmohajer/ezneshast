import { createServerSupabaseClientWithCookies, getServerUser } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from '../components/SignOutButton'

export default async function DashboardPage() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  const supabase = await createServerSupabaseClientWithCookies()
  
  // Get user's credit balance
  const { data: credits } = await supabase
    .from('credits')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  // Get recent credit ledger entries
  const { data: ledgerEntries } = await supabase
    .from('credit_ledger')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get recent jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const balance = credits?.balance || 0

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/voice-transcribe"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Transcription
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>

        {/* Credit Balance Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Credit Balance</h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">{balance}</p>
              <p className="text-sm text-gray-500 mt-1">Available credits</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Cost per transcription</div>
              <div className="text-2xl font-semibold text-gray-900">10</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="p-6">
              {ledgerEntries && ledgerEntries.length > 0 ? (
                <div className="space-y-4">
                  {ledgerEntries.map((entry: any) => (
                    <div key={entry.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.reason}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold ${
                        entry.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entry.amount > 0 ? '+' : ''}{entry.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No transactions yet</p>
              )}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
            </div>
            <div className="p-6">
              {jobs && jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map((job: any) => (
                    <div key={job.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">{job.type}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'failed' ? 'bg-red-100 text-red-800' :
                          job.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                        <span className="text-sm text-gray-600">-{job.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No jobs yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/voice-transcribe"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🎤</div>
                <h4 className="font-medium text-gray-900">Voice Transcription</h4>
                <p className="text-sm text-gray-500 mt-1">Transcribe audio files</p>
              </div>
            </Link>
            
            <Link
              href="/voice-meeting-minutes"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📝</div>
                <h4 className="font-medium text-gray-900">Meeting Minutes</h4>
                <p className="text-sm text-gray-500 mt-1">Generate meeting summaries</p>
              </div>
            </Link>

            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <h4 className="font-medium text-gray-900">Analytics</h4>
                <p className="text-sm text-gray-500 mt-1">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
