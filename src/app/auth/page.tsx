'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function AuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    const continueUrl = searchParams.get('continueUrl');

    if (mode === 'resetPassword' && oobCode) {
      // Redirect to our custom reset password page with the code
      if (continueUrl) {
        // If there's a continueUrl, use it (it should be our /reset-password page)
        try {
          const decodedUrl = decodeURIComponent(continueUrl);
          const url = new URL(decodedUrl);
          // Keep the oobCode in the URL
          url.searchParams.set('oobCode', oobCode);
          window.location.href = url.toString();
        } catch {
          // If URL parsing fails, redirect to our reset password page with the code
          router.replace(`/reset-password?oobCode=${oobCode}`);
        }
      } else {
        // No continueUrl, redirect directly to our reset password page
        router.replace(`/reset-password?oobCode=${oobCode}`);
      }
    } else if (mode === 'verifyEmail') {
      // Handle email verification if needed
      router.replace('/login?verified=true');
    } else if (mode === 'signIn' && oobCode) {
      // Handle magic link sign-in
      // Check if this is a valid sign-in link
      if (isSignInWithEmailLink(auth, window.location.href)) {
        // Redirect to login page with the magic link parameters
        // The MagicLinkAuth component will handle the actual sign-in
        const loginUrl = new URL('/login', window.location.origin);
        // Preserve all the magic link parameters
        searchParams.forEach((value, key) => {
          loginUrl.searchParams.set(key, value);
        });
        window.location.href = loginUrl.toString();
      } else {
        // Invalid magic link, redirect to login
        router.replace('/login');
      }
    } else {
      // Unknown mode, redirect to login
      router.replace('/login');
    }
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-lg text-gray-800">Redirecting...</div>
      </div>
    </main>
  );
}

export default function AuthPage() {
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
      <AuthHandler />
    </Suspense>
  );
}
