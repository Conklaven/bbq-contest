'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Toaster } from 'react-hot-toast';

export default function JudgeDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [itemCode, setItemCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle manual item code submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim()) return;

    setIsSubmitting(true);
    try {
      // Navigate to the scoring page for this item code
      router.push(`/judge/${itemCode.trim()}`);
    } catch (error) {
      console.error('Error navigating to item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if not authenticated
  if (!loading && !user) {
    router.push('/judge/signin');
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="text-lg text-gray-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Judge Dashboard
              </h1>
              <p className="text-gray-600">
                Enter the item code to begin scoring
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Welcome, {user?.displayName || user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Score BBQ Item
            </h2>
            <p className="text-gray-600 mb-6">
              Use your phone&apos;s camera to scan the QR code, then enter the
              item code below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Code
              </label>
              <input
                type="text"
                value={itemCode}
                onChange={e => setItemCode(e.target.value.toUpperCase())}
                placeholder="Enter item code (e.g., ABC123)"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                required
                disabled={isSubmitting}
              />
              <p className="text-sm text-gray-500 mt-2">
                The item code is displayed on the QR code or provided by the
                team.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !itemCode.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition text-lg font-semibold"
            >
              {isSubmitting ? 'Loading...' : 'Start Scoring'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Instructions:
            </h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>
                1. Use your phone&apos;s camera to scan the QR code on the item
              </li>
              <li>2. Copy the item code from the QR code</li>
              <li>
                3. Enter the item code above and click &quot;Start Scoring&quot;
              </li>
              <li>4. Rate the item on the provided criteria</li>
              <li>5. Submit your scores</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Powered by Magnivents */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="text-center">
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
      </div>
    </div>
  );
}
