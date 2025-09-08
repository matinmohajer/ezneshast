// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      console.log('[HomePage] Checking authentication...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      console.log('[HomePage] Auth result:', {
        user: user ? 'present' : 'missing',
        error: error ? error.message : 'none',
        userEmail: user?.email
      });
      
      setUser(user ? { id: user.id, email: user.email ?? null } : null);
      setLoading(false);
      
      // Redirect to dashboard if user is authenticated
      if (user) {
        console.log('[HomePage] User authenticated, redirecting to dashboard...');
        router.push('/dashboard');
      } else {
        console.log('[HomePage] User not authenticated, showing landing page');
      }
    };
    
    getUser();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 mt-4">Loading...</p>
      </main>
    );
  }

  if (user) {
    // User is authenticated, show loading while redirecting
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 mt-4">Redirecting to dashboard...</p>
      </main>
    );
  }

  // User is not authenticated, show landing page
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Voice Transcription App</h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Professional voice transcription with speaker diarization powered by ElevenLabs AI
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Get Started</h2>
          <p className="text-gray-600">Sign in to access voice transcription features</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center block font-medium"
          >
            Sign In
          </Link>
          
          <div className="text-center text-sm text-gray-500">
            <p>New to our service? Just enter your email to get started!</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              High-quality voice transcription
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Speaker diarization (identify different speakers)
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Persian language support
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Credit-based usage system
            </li>
          </ul>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Powered by ElevenLabs AI • Secure & Private</p>
      </div>
    </main>
  );
}
