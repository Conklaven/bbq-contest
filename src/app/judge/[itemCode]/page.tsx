'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { DatabaseService, Item, Score } from '@/lib/db';
import toast, { Toaster } from 'react-hot-toast';
import { use } from 'react';

interface ScoreFormProps {
  params: Promise<{
    itemCode: string;
  }>;
}

export default function ScoreForm({ params }: ScoreFormProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { itemCode } = use(params);

  const [item, setItem] = useState<Item | null>(null);
  const [existingScore, setExistingScore] = useState<Score | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadItemAndCheckScore = useCallback(async () => {
    if (!user || !itemCode) return;

    try {
      setIsLoading(true);
      setError('');

      const itemData = await DatabaseService.getItemByCode(itemCode);
      if (!itemData) {
        setError('Item not found');
        return;
      }

      setItem(itemData);

      // Initialize scores based on item's judging criteria
      const initialScores: Record<string, number> = {};
      itemData.judgingCriteria.forEach(criteria => {
        initialScores[criteria.toLowerCase()] = 5;
      });
      setScores(initialScores);

      // Check if user has already scored this item
      const judgeScores = await DatabaseService.getScoresByJudge(user.uid);
      const existingScoreData = judgeScores.find(
        score => score.itemId === itemData.id
      );
      setExistingScore(existingScoreData || null);
    } catch (error) {
      console.error('Error loading item:', error);
      setError('Failed to load item');
    } finally {
      setIsLoading(false);
    }
  }, [user, itemCode]);

  useEffect(() => {
    // Redirect if not authenticated, but preserve the item code
    if (!loading && !user) {
      router.push(`/judge/signin?itemCode=${encodeURIComponent(itemCode)}`);
      return;
    }

    // Load item and check for existing score
    if (user && itemCode) {
      loadItemAndCheckScore();
    }
  }, [user, loading, itemCode, router, loadItemAndCheckScore]);

  const handleScoreChange = (criteria: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [criteria]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !item) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Create score
      await DatabaseService.createScore({
        itemId: item.id,
        judgeId: user.uid,
        scores: scores,
      });

      // Show success message
      toast.success('Score submitted successfully!');

      // Redirect back to scanner after a short delay
      setTimeout(() => {
        router.push('/judge');
      }, 1500);
    } catch (err) {
      console.error('Error submitting score:', err);
      setError('Failed to submit score. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="text-lg text-gray-800">Loading...</div>
      </div>
    );
  }

  // Show loading while redirecting to signin
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="text-lg text-gray-800">Redirecting to login...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <p className="text-gray-600 mb-4">
            The scanned QR code doesn&apos;t match any items in the database.
          </p>
          <button
            onClick={() => router.push('/judge')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-lg mb-4">Item not found</div>
          <button
            onClick={() => router.push('/judge')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (existingScore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-orange-600 text-lg mb-4">
            You have already scored this item
          </div>
          <div className="text-gray-600 mb-6">
            <p>Category: {item.category}</p>
            <p>Item Code: {item.itemCode}</p>
          </div>
          <button
            onClick={() => router.push('/judge')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Score Item</h1>
              <p className="text-gray-600">
                Rate the BBQ item on three criteria
              </p>
            </div>
            <button
              onClick={() => router.push('/judge')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Item Info */}
          <div className="mb-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {item.category}
            </h2>
            <p className="text-gray-600">Item Code: {item.itemCode}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dynamic Criteria Scores */}
            {item.judgingCriteria.map(criteria => (
              <div key={criteria}>
                <label className="block text-lg font-medium text-gray-900 mb-4">
                  {criteria}: {scores[criteria.toLowerCase()] || 5}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scores[criteria.toLowerCase()] || 5}
                  onChange={e =>
                    handleScoreChange(
                      criteria.toLowerCase(),
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  disabled={isSubmitting}
                />
                {/* Number labels below slider */}
                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <span key={num} className="w-0 flex-grow text-center">
                      {num}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>
            ))}

            {/* Total Score Display */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Total Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(scores).reduce((sum, score) => sum + score, 0)}/
                {item.judgingCriteria.length * 10}
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition text-lg font-semibold"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Score'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .slider {
          background: linear-gradient(
            to right,
            #e5e7eb 0%,
            #e5e7eb 10%,
            #d1d5db 10%,
            #d1d5db 20%,
            #e5e7eb 20%,
            #e5e7eb 30%,
            #d1d5db 30%,
            #d1d5db 40%,
            #e5e7eb 40%,
            #e5e7eb 50%,
            #d1d5db 50%,
            #d1d5db 60%,
            #e5e7eb 60%,
            #e5e7eb 70%,
            #d1d5db 70%,
            #d1d5db 80%,
            #e5e7eb 80%,
            #e5e7eb 90%,
            #d1d5db 90%,
            #d1d5db 100%
          );
          position: relative;
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-webkit-slider-track {
          background: transparent;
        }

        .slider::-moz-range-track {
          background: transparent;
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
