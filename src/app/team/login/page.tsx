'use client';
import { useState, useEffect } from 'react';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function TeamLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCheckingLink, setIsCheckingLink] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'magic-link' | 'password'>(
    'magic-link'
  );
  const router = useRouter();
  const { user, claims, loading: authLoading } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    if (user && !authLoading) {
      if (claims?.isTeam) {
        router.replace('/team');
      } else if (claims?.isAdmin) {
        router.replace('/admin/teams');
      } else if (claims?.isJudge) {
        router.replace('/judge');
      } else {
        router.replace('/');
      }
    }
  }, [user, claims, authLoading, router]);

  // Check for email link on page load
  useEffect(() => {
    const checkEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setIsCheckingLink(true);
        setError('');

        try {
          // Get the email from localStorage or prompt user
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            email = window.prompt('Please provide your email for confirmation');
          }

          if (!email) {
            setError('Email is required to complete sign in');
            setIsCheckingLink(false);
            return;
          }

          // Sign in with email link
          await signInWithEmailLink(auth, email, window.location.href);

          // Clear the email from localStorage
          window.localStorage.removeItem('emailForSignIn');

          // Redirect to team dashboard
          router.replace('/team');
        } catch (error) {
          console.error('Error signing in with email link:', error);
          setError('Failed to sign in. Please try again.');
          setIsCheckingLink(false);
        }
      }
    };

    checkEmailLink();
  }, [router]);

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const actionCodeSettings = {
        url: window.location.origin + '/team/login',
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // Save the email for later use
      window.localStorage.setItem('emailForSignIn', email);

      setSuccess('Check your email for a sign-in link!');
      setEmail('');
    } catch (error) {
      console.error('Error sending sign-in link:', error);
      if (error instanceof Error) {
        if (error.message.includes('user-not-found')) {
          setError('No team account found with this email address.');
        } else if (error.message.includes('invalid-email')) {
          setError('Please enter a valid email address.');
        } else if (error.message.includes('operation-not-allowed')) {
          setError(
            'Email link sign-in is not enabled. Please use password login instead.'
          );
          setLoginMethod('password');
        } else {
          setError('Failed to send sign-in link. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The redirect will be handled by the useEffect above
    } catch (error) {
      console.error('Error signing in with password:', error);
      if (error instanceof Error) {
        if (error.message.includes('user-not-found')) {
          setError('No team account found with this email address.');
        } else if (error.message.includes('wrong-password')) {
          setError('Incorrect password. Please try again.');
        } else if (error.message.includes('invalid-email')) {
          setError('Please enter a valid email address.');
        } else {
          setError('Failed to sign in. Please check your credentials.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth state or email link
  if (authLoading || isCheckingLink) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-gray-800">
            {isCheckingLink ? 'Signing you in...' : 'Loading...'}
          </div>
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team Login</h1>
          <p className="text-gray-600 mt-2">
            Sign in to access your team dashboard
          </p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLoginMethod('magic-link')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMethod === 'magic-link'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Magic Link
          </button>
          <button
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMethod === 'password'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Password
          </button>
        </div>

        {loginMethod === 'magic-link' ? (
          <form onSubmit={handleMagicLinkSubmit}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Team Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="your-team@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-green-600 text-sm">{success}</div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Sending Link...' : 'Send Sign-In Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label
                htmlFor="email-password"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Team Email
              </label>
              <input
                id="email-password"
                type="email"
                placeholder="your-team@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
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
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have a team account? Contact the contest organizers.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
