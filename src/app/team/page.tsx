'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { DatabaseService, Team, Score } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface TeamScore {
  category: string;
  itemCode: string;
  scores: Score[];
  totalScore: number;
  averageScore: number;
  tasteScore: number;
  tendernessScore: number;
  appearanceScore: number;
}

export default function TeamDashboard() {
  const { user, claims, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true);
      const teamId = claims?.teamId as string;

      console.log('Debug - Claims:', claims);
      console.log('Debug - Team ID:', teamId);
      console.log('Debug - User:', user);

      if (!teamId || typeof teamId !== 'string') {
        setError('Team ID not found');
        return;
      }

      // Get team data
      const teamData = await DatabaseService.getTeam(teamId);
      console.log('Debug - Team data:', teamData);
      setTeam(teamData);

      // Get all items for this team
      const items = await DatabaseService.getItemsByTeam(teamId);
      console.log('Debug - Items:', items);

      // Get scores only for this team's items
      const teamScores = await DatabaseService.getScoresByTeam(teamId);
      console.log('Debug - Team scores:', teamScores);

      // Create a map of item scores
      const itemScoresMap = new Map<string, Score[]>();
      teamScores.forEach(score => {
        if (!itemScoresMap.has(score.itemId)) {
          itemScoresMap.set(score.itemId, []);
        }
        itemScoresMap.get(score.itemId)!.push(score);
      });

      // Calculate scores for each category
      const categoryScores: TeamScore[] = items.map(item => {
        const scores = itemScoresMap.get(item.id) || [];
        const totalScore = scores.reduce(
          (sum, score) =>
            sum + score.taste + score.tenderness + score.appearance,
          0
        );
        const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
        const tasteScore =
          scores.reduce((sum, score) => sum + score.taste, 0) /
          Math.max(scores.length, 1);
        const tendernessScore =
          scores.reduce((sum, score) => sum + score.tenderness, 0) /
          Math.max(scores.length, 1);
        const appearanceScore =
          scores.reduce((sum, score) => sum + score.appearance, 0) /
          Math.max(scores.length, 1);

        return {
          category: item.category,
          itemCode: item.itemCode,
          scores,
          totalScore,
          averageScore,
          tasteScore,
          tendernessScore,
          appearanceScore,
        };
      });

      // Sort by category name
      categoryScores.sort((a, b) => a.category.localeCompare(b.category));
      setTeamScores(categoryScores);
    } catch (error) {
      console.error('Error loading team data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [claims, user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/team/login');
        return;
      }

      if (!claims?.isTeam) {
        router.replace('/');
        return;
      }

      loadTeamData();
    }
  }, [user, claims, authLoading, router, loadTeamData]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-800">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/team/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Team not found</div>
          <button
            onClick={() => router.push('/team/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const totalScores = teamScores.reduce(
    (sum, category) => sum + category.scores.length,
    0
  );
  const overallAverage =
    teamScores.length > 0
      ? teamScores.reduce((sum, category) => sum + category.averageScore, 0) /
        teamScores.length
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {team.name} Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome to your BBQ Contest dashboard
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">
              {teamScores.length}
            </div>
            <div className="text-sm text-gray-700">Categories</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">
              {totalScores}
            </div>
            <div className="text-sm text-gray-700">Total Scores</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">
              {overallAverage.toFixed(2)}
            </div>
            <div className="text-sm text-gray-700">Overall Average</div>
          </div>
        </div>

        {/* Category Scores */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Scores by Category
            </h2>
          </div>
          <div className="overflow-x-auto">
            {teamScores.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No scores have been recorded yet. Check back later!
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {teamScores.map(categoryScore => (
                  <div key={categoryScore.category} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {categoryScore.category}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Item Code: {categoryScore.itemCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {categoryScore.averageScore.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Average Score
                        </div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700">
                          Taste
                        </div>
                        <div className="text-xl font-bold text-green-600">
                          {categoryScore.tasteScore.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700">
                          Tenderness
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {categoryScore.tendernessScore.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700">
                          Appearance
                        </div>
                        <div className="text-xl font-bold text-purple-600">
                          {categoryScore.appearanceScore.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700">
                          Total
                        </div>
                        <div className="text-xl font-bold text-gray-900">
                          {categoryScore.totalScore.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Individual Scores */}
                    {categoryScore.scores.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Individual Scores ({categoryScore.scores.length} judge
                          {categoryScore.scores.length !== 1 ? 's' : ''})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {categoryScore.scores.map((score, index) => (
                            <div
                              key={score.id}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                              title={`Judge ${index + 1}: Taste ${score.taste}, Tenderness ${score.tenderness}, Appearance ${score.appearance}`}
                            >
                              {(
                                score.taste +
                                score.tenderness +
                                score.appearance
                              ).toFixed(1)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Scores are updated in real-time as judges submit their evaluations.
          </p>
          <p className="mt-1">
            Final rankings will be announced at the awards ceremony.
          </p>
        </div>
      </div>
    </div>
  );
}
