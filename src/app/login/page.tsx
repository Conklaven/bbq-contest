'use client';
import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import MagicLinkAuth from '@/components/MagicLinkAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic-link'>(
    'password'
  );
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const router = useRouter();
  const { user, claims, loading: authLoading } = useAuth();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !authLoading) {
      if (claims?.isAdmin) {
        router.replace('/admin/teams');
      } else if (claims?.isJudge) {
        router.replace('/judge'); // TODO: Create judge dashboard
      } else if (claims?.isTeam) {
        router.replace('/team');
      } else {
        router.replace('/');
      }
    }
  }, [user, claims, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The redirect will be handled by the useEffect above
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first');
      return;
    }

    setForgotPasswordLoading(true);
    setError('');
    setForgotPasswordSuccess('');

    try {
      await sendPasswordResetEmail(auth, email);
      setForgotPasswordSuccess('Password reset email sent! Check your inbox.');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to send password reset email';
      setError(errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-gray-800">Loading...</div>
        </div>
      </main>
    );
  }

  // Don't show login form if user is already logged in
  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-gray-800">Redirecting...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Login Method Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'password'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('magic-link')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'magic-link'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Magic Link
            </button>
          </div>
        </div>

        {/* Login Forms */}
        {loginMethod === 'password' ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded shadow-md w-full"
          >
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
              Admin Login
            </h1>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-800 bg-white"
                required
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-800 bg-white"
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="mb-4 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotPasswordLoading || loading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {forgotPasswordLoading ? 'Sending...' : 'Forgot Password?'}
              </button>
            </div>

            {error && <div className="text-red-600 mb-4">{error}</div>}
            {forgotPasswordSuccess && (
              <div className="text-green-600 mb-4 text-sm">
                {forgotPasswordSuccess}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <MagicLinkAuth
            onSuccess={() => {
              // The redirect will be handled by the useEffect above
            }}
            onError={error => setError(error)}
          />
        )}

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-800 underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
