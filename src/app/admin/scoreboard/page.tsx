'use client';
import { useState, useEffect } from 'react';
import { DatabaseService, Team, Score } from '@/lib/db';

interface TeamScore {
  team: Team;
  scores: Score[];
  totalScore: number;
  averageScore: number;
}

export default function ScoreboardPage() {
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'total' | 'average'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const loadScoreboard = async () => {
      try {
        const [teams, scores, items] = await Promise.all([
          DatabaseService.getTeams(),
          DatabaseService.getScores(),
          DatabaseService.getItems(),
        ]);

        // Create a map of itemId to teamId for quick lookup
        const itemTeamMap = new Map<string, string>();
        items.forEach(item => {
          itemTeamMap.set(item.id, item.teamId);
        });

        // Calculate team scores
        const teamScoreMap = new Map<string, TeamScore>();

        teams.forEach(team => {
          teamScoreMap.set(team.id, {
            team,
            scores: [],
            totalScore: 0,
            averageScore: 0,
          });
        });

        scores.forEach(score => {
          const teamId = itemTeamMap.get(score.itemId);
          if (teamId) {
            const teamScore = teamScoreMap.get(teamId);
            if (teamScore) {
              const scoreValue =
                score.taste + score.tenderness + score.appearance;
              teamScore.scores.push(score);
              teamScore.totalScore += scoreValue;
              teamScore.averageScore =
                teamScore.totalScore / teamScore.scores.length;
            }
          }
        });

        const sortedScores = Array.from(teamScoreMap.values()).sort((a, b) => {
          const aValue = sortBy === 'total' ? a.totalScore : a.averageScore;
          const bValue = sortBy === 'total' ? b.totalScore : b.averageScore;
          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });

        setTeamScores(sortedScores);
      } catch (error) {
        console.error('Error loading scoreboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadScoreboard();
    // Set up real-time updates
    const unsubscribe = DatabaseService.subscribeToScores(() => {
      loadScoreboard();
    });
    return unsubscribe;
  }, [sortBy, sortOrder]);

  const exportToCSV = () => {
    const headers = [
      'Rank',
      'Team Name',
      'Total Score',
      'Average Score',
      'Number of Scores',
    ];
    const csvData = teamScores.map((teamScore, index) => [
      index + 1,
      teamScore.team.name,
      teamScore.totalScore.toFixed(2),
      teamScore.averageScore.toFixed(2),
      teamScore.scores.length,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bbq-contest-scores-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (newSortBy: 'total' | 'average') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getScoreValue = (score: Score) => {
    return score.taste + score.tenderness + score.appearance;
  };

  if (loading) {
    return <div className="text-center py-8">Loading scoreboard...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Live Scoreboard</h1>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export to CSV
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Team Rankings</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort('total')}
                className={`px-3 py-1 rounded text-sm ${
                  sortBy === 'total'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Total Score{' '}
                {sortBy === 'total' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSort('average')}
                className={`px-3 py-1 rounded text-sm ${
                  sortBy === 'average'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Average Score{' '}
                {sortBy === 'average' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scores Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recent Scores
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamScores.map((teamScore, index) => (
                <tr
                  key={teamScore.team.id}
                  className={index < 3 ? 'bg-yellow-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0
                          ? 'bg-yellow-400'
                          : index === 1
                            ? 'bg-gray-300'
                            : index === 2
                              ? 'bg-orange-400'
                              : 'bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {teamScore.team.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teamScore.totalScore.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teamScore.averageScore.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teamScore.scores.length}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex gap-1">
                      {teamScore.scores
                        .slice(-5)
                        .reverse()
                        .map(score => (
                          <span
                            key={score.id}
                            className="inline-block w-8 h-6 bg-blue-100 text-blue-800 text-xs rounded flex items-center justify-center"
                            title={`${getScoreValue(score)} - ${score.taste}/${score.tenderness}/${score.appearance}`}
                          >
                            {getScoreValue(score)}
                          </span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Scoreboard Statistics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {teamScores.length}
              </div>
              <div className="text-sm text-gray-500">Total Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {teamScores.reduce((sum, team) => sum + team.scores.length, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Scores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {teamScores.length > 0
                  ? (
                      teamScores.reduce(
                        (sum, team) => sum + team.averageScore,
                        0
                      ) / teamScores.length
                    ).toFixed(2)
                  : '0.00'}
              </div>
              <div className="text-sm text-gray-500">Average Team Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
