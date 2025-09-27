'use client';
import { useState } from 'react';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface MagicLinkAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function MagicLinkAuth({
  onSuccess,
  onError,
}: MagicLinkAuthProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  // Check if this is a magic link callback
  const isMagicLinkCallback = isSignInWithEmailLink(auth, window.location.href);

  const actionCodeSettings = {
    // URL you want to redirect back to. The domain (www.example.com) for this
    // URL must be in the authorized domains list in the Firebase Console.
    url: window.location.origin + '/login',
    // This must be true for email link sign-in.
    handleCodeInApp: true,
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // Save the email locally so you don't need to ask the user for it again
      // if they open the link on the same device.
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send magic link';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const completeSignIn = async (email: string) => {
    setLoading(true);
    setError('');

    try {
      await signInWithEmailLink(auth, email, window.location.href);

      // Clear the email from storage.
      window.localStorage.removeItem('emailForSignIn');
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to complete sign in';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // If this is a magic link callback, handle the sign-in
  if (isMagicLinkCallback) {
    const emailForSignIn = window.localStorage.getItem('emailForSignIn');

    if (emailForSignIn) {
      completeSignIn(emailForSignIn);
      return (
        <div className="text-center">
          <div className="text-lg text-gray-800">Completing sign in...</div>
        </div>
      );
    } else {
      // User opened the link on a different device. To prevent session fixation
      // attacks, ask the user to provide the associated email again.
      return (
        <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-900">
            Complete Sign In
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Please enter the email address you used to request the magic link.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (email.trim()) {
                completeSignIn(email.trim());
              }
            }}
          >
            <div className="mb-4">
              <label
                htmlFor="callback-email"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Email
              </label>
              <input
                id="callback-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-800 bg-white"
                required
              />
            </div>
            {error && <div className="text-red-600 mb-4">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Complete Sign In'}
            </button>
          </form>
        </div>
      );
    }
  }

  // If email was sent successfully
  if (emailSent) {
    return (
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm text-center">
        <div className="mb-4">
          <div className="text-green-600 text-4xl mb-2">✓</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h2>
          <p className="text-gray-600">
            We&apos;ve sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Click the link in your email to sign in. The link will expire in 1
            hour.
          </p>
        </div>
        <button
          onClick={() => {
            setEmailSent(false);
            setEmail('');
          }}
          className="text-blue-600 hover:text-blue-800 underline text-sm"
        >
          Send to a different email
        </button>
      </div>
    );
  }

  // Initial form to request magic link
  return (
    <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-900">
        Sign in with Magic Link
      </h2>
      <p className="text-sm text-gray-600 mb-4 text-center">
        Enter your email address and we&apos;ll send you a secure link to sign
        in.
      </p>
      <form onSubmit={sendMagicLink}>
        <div className="mb-4">
          <label
            htmlFor="magic-email"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            Email
          </label>
          <input
            id="magic-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-2 border rounded text-gray-900 placeholder-gray-800 bg-white"
            required
          />
        </div>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
    </div>
  );
}
