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
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2 text-gray-900">Available Routes:</h2>
        <ul className="list-disc list-inside text-gray-800">
          {claims?.isAdmin && (
            <li>
              <Link
                href="/admin/teams"
                className="text-blue-600 hover:underline"
              >
                Admin Teams
              </Link>
            </li>
          )}
          {claims?.isAdmin && (
            <li>
              <Link
                href="/admin/items"
                className="text-blue-600 hover:underline"
              >
                Admin Items
              </Link>
            </li>
          )}
          {claims?.isAdmin && (
            <li>
              <Link
                href="/admin/scoreboard"
                className="text-blue-600 hover:underline"
              >
                Admin Scoreboard
              </Link>
            </li>
          )}
          <li>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </li>
          <li>
            <Link href="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
