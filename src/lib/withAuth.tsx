import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export function withAuth<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  WrappedComponent: React.ComponentType<T>,
  requiredRole: 'admin' | 'judge' | 'team' = 'admin',
  redirectTo: string = '/login'
) {
  return function AuthGuard(props: T) {
    const { user, claims, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.replace(redirectTo);
        } else if (
          (requiredRole === 'admin' && !claims?.isAdmin) ||
          (requiredRole === 'judge' && !claims?.isJudge) ||
          (requiredRole === 'team' && !claims?.isTeam)
        ) {
          router.replace('/'); // or a "not authorized" page
        }
      }
    }, [user, claims, loading, router]);

    if (
      loading ||
      !user ||
      (requiredRole === 'admin' && !claims?.isAdmin) ||
      (requiredRole === 'judge' && !claims?.isJudge) ||
      (requiredRole === 'team' && !claims?.isTeam)
    ) {
      return (
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      );
    }

    return <WrappedComponent {...(props as T)} />;
  };
}
