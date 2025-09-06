import { cookies } from 'next/headers'

export default async function DebugCookiesPage() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Debug Cookies</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">All Cookies:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(allCookies, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  )
}
