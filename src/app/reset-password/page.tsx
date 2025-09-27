'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [code, setCode] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyResetCode = async () => {
      try {
        // Get the action code from URL parameters
        const actionCode = searchParams.get('oobCode');

        if (!actionCode) {
          setError('Invalid or expired password reset link');
          setVerifying(false);
          return;
        }

        // Verify the password reset code
        await verifyPasswordResetCode(auth, actionCode);
        setCode(actionCode);
        setVerifying(false);
      } catch (error) {
        console.error('Error verifying reset code:', error);
        setError('Invalid or expired password reset link');
        setVerifying(false);
      }
    };

    verifyResetCode();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!code) {
      setError('Invalid reset code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await confirmPasswordReset(auth, code, password);
      setSuccess(true);

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-gray-800">Verifying reset link...</div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Password Reset Successful
          </h1>
          <p className="text-gray-600 mb-4">
            Your password has been successfully reset. You can now log in with
            your new password.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirecting to login page in a few seconds...
          </p>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
              minLength={6}
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
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-lg text-gray-800">Loading...</div>
          </div>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
