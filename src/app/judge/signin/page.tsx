'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { DatabaseService } from '@/lib/db';
import Link from 'next/link';

export default function JudgeSignIn() {
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Sign in anonymously
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      // Store judge info in Firestore
      await DatabaseService.createJudge({
        uid: user.uid,
        displayName: displayName.trim(),
      });

      // Redirect to judge dashboard
      router.push('/judge');
    } catch (err) {
      console.error('Sign-in error:', err);
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">
            Judge Sign-In
          </h1>

          <p className="text-gray-900 text-center mb-6">
            Enter your name to begin judging BBQ items
          </p>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-800 text-gray-900"
                placeholder="Enter your name"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading || !displayName.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Signing In...' : 'Start Judging'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
