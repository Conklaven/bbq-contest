'use client';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function DebugPage() {
  const { user, claims, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">
        Debug: User Authentication
      </h1>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2 text-gray-900">User Info:</h2>
        <p className="text-gray-800">
          <strong>Email:</strong> {user.email}
        </p>
        <p className="text-gray-800">
          <strong>UID:</strong> {user.uid}
        </p>
        <p className="text-gray-800">
          <strong>Display Name:</strong> {user.displayName || 'None'}
        </p>
        <p className="text-gray-800">
          <strong>Is Anonymous:</strong> {user.isAnonymous ? 'Yes' : 'No'}
        </p>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2 text-gray-900">Custom Claims:</h2>
        <pre className="bg-white p-2 rounded text-sm text-gray-800">
          {JSON.stringify(claims, null, 2)}
        </pre>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2 text-gray-900">Access Level:</h2>
        <p className="text-gray-800">
          <strong>Is Admin:</strong> {claims?.isAdmin ? '✅ Yes' : '❌ No'}
        </p>
        <p className="text-gray-800">
          <strong>Is Judge:</strong> {claims?.isJudge ? '✅ Yes' : '❌ No'}
        </p>
        <p className="text-gray-800">
          <strong>Is Team:</strong> {claims?.isTeam ? '✅ Yes' : '❌ No'}
        </p>
        <p className="text-gray-800">
          <strong>Team ID:</strong> {(claims?.teamId as string) || 'None'}
        </p>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2 text-gray-900">Navigation:</h2>
        <div className="flex gap-2">
          <Link
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Home
          </Link>
          {claims?.isAdmin && (
            <Link
              href="/admin/teams"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Admin Dashboard
            </Link>
          )}
          {claims?.isTeam && (
            <Link
              href="/team"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              Team Dashboard
            </Link>
          )}
          {claims?.isJudge && (
            <Link
              href="/judge"
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
            >
              Judge Dashboard
            </Link>
          )}
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2 text-gray-900">Token Analysis:</h2>
        <p className="text-gray-800">
          <strong>Expected Team ID:</strong> {user.uid}
        </p>
        <p className="text-gray-800">
          <strong>Claims Team ID:</strong>{' '}
          {(claims?.teamId as string) || 'None'}
        </p>
        <p className="text-gray-800">
          <strong>Match:</strong>{' '}
          {user.uid === (claims?.teamId as string) ? '✅ Yes' : '❌ No'}
        </p>
      </div>
    </div>
  );
}
