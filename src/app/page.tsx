'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, claims, loading } = useAuth();

  // Only redirect users with specific admin claims
  useEffect(() => {
    if (!loading && user && claims?.isAdmin) {
      router.replace('/admin/teams');
    } else if (!loading && user && claims?.isTeam) {
      router.replace('/team');
    }
  }, [user, claims, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The AuthContext will automatically update and redirect to home
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="text-lg text-gray-800">Loading...</div>
      </div>
    );
  }

  // Show home page for all users (including anonymous judges)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mb-4 sm:mb-6">
        <img
          src="/2026logo.png"
          alt="ASBEE World Kosher BBQ Contest & Festival 2026"
          className="max-w-xs sm:max-w-sm w-full h-auto rounded-lg shadow-lg"
        />
      </div>
      <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 text-center text-gray-900">
        Welcome to the ASBEE Kosher BBQ Contest Judging App
      </h1>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full max-w-sm sm:max-w-md mb-4 sm:mb-6">
        <a
          href="/login"
          className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-blue-700 transition text-center"
        >
          Admin Login
        </a>
        <Link
          href="/judge/signin/"
          className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-green-700 transition-colors text-center"
        >
          Judge Login
        </Link>
        <Link
          href="/team/login"
          className="bg-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-purple-700 transition-colors text-center"
        >
          Team Login
        </Link>
      </div>

      <div className="mt-4 sm:mt-6 text-center">
        <a
          href="https://magnivents.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 sm:gap-3 text-sm sm:text-lg font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          <span>Powered by</span>
          <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Magnivents
          </span>
        </a>
      </div>

      {/* Show current user status if signed in */}
      {user && (
        <div className="mt-4 text-center text-sm text-gray-800">
          <p>
            Signed in as: {user.isAnonymous ? 'Anonymous Judge' : user.email}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
            <button
              onClick={() => router.push('/judge')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Go to Judge Dashboard
            </button>
            <span className="hidden sm:inline text-gray-400">|</span>
            <button
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-800 underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
