'use client';
import { useState, useEffect } from 'react';
import { DatabaseService, Team, Score } from '@/lib/db';

interface TeamScore {
  team: Team;
  scores: Score[];
  totalScore: number;
  averageScore: number;
}

interface CategoryScore {
  team: Team;
  category: string;
  scores: Score[];
  totalScore: number;
  averageScore: number;
  itemCode: string;
}

export default function ScoreboardPage() {
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'total' | 'average'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overall' | 'category'>('overall');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadScoreboard = async () => {
      try {
        const [teams, scores, items, settings] = await Promise.all([
          DatabaseService.getTeams(),
          DatabaseService.getScores(),
          DatabaseService.getItems(),
          DatabaseService.getSettings(),
        ]);

        // Create maps for quick lookup
        const itemTeamMap = new Map<string, string>();
        const itemCategoryMap = new Map<string, string>();
        const itemCodeMap = new Map<string, string>();

        items.forEach(item => {
          itemTeamMap.set(item.id, item.teamId);
          itemCategoryMap.set(item.id, item.category);
          itemCodeMap.set(item.id, item.itemCode);
        });

        // Get categories from contest settings instead of items
        const contestCategories = settings?.categories || [];
        setCategories(contestCategories);

        // Calculate overall team scores
        const teamScoreMap = new Map<string, TeamScore>();

        teams.forEach(team => {
          teamScoreMap.set(team.id, {
            team,
            scores: [],
            totalScore: 0,
            averageScore: 0,
          });
        });

        // Calculate category-specific scores (only for contest categories)
        const categoryScoreMap = new Map<string, CategoryScore>();

        scores.forEach(score => {
          const teamId = itemTeamMap.get(score.itemId);
          const category = itemCategoryMap.get(score.itemId);
          const itemCode = itemCodeMap.get(score.itemId);

          if (teamId && category && itemCode) {
            const team = teams.find(t => t.id === teamId);
            if (team) {
              // Add to overall team score
              const teamScore = teamScoreMap.get(teamId);
              if (teamScore) {
                const scoreValue = Object.values(score.scores).reduce(
                  (sum, value) => sum + (value as number),
                  0
                );
                teamScore.scores.push(score);
                teamScore.totalScore += scoreValue;
                teamScore.averageScore =
                  teamScore.totalScore / teamScore.scores.length;
              }

              // Only add to category score if it's a contest category
              if (contestCategories.includes(category)) {
                const categoryKey = `${teamId}-${category}`;
                let categoryScore = categoryScoreMap.get(categoryKey);
                if (!categoryScore) {
                  categoryScore = {
                    team,
                    category,
                    scores: [],
                    totalScore: 0,
                    averageScore: 0,
                    itemCode,
                  };
                  categoryScoreMap.set(categoryKey, categoryScore);
                }

                const scoreValue = Object.values(score.scores).reduce(
                  (sum, value) => sum + (value as number),
                  0
                );
                categoryScore.scores.push(score);
                categoryScore.totalScore += scoreValue;
                categoryScore.averageScore =
                  categoryScore.totalScore / categoryScore.scores.length;
              }
            }
          }
        });

        // Sort overall team scores
        const sortedTeamScores = Array.from(teamScoreMap.values()).sort(
          (a, b) => {
            const aValue = sortBy === 'total' ? a.totalScore : a.averageScore;
            const bValue = sortBy === 'total' ? b.totalScore : b.averageScore;
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
          }
        );

        // Sort category scores
        const sortedCategoryScores = Array.from(categoryScoreMap.values()).sort(
          (a, b) => {
            const aValue = sortBy === 'total' ? a.totalScore : a.averageScore;
            const bValue = sortBy === 'total' ? b.totalScore : b.averageScore;
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
          }
        );

        setTeamScores(sortedTeamScores);
        setCategoryScores(sortedCategoryScores);
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
    if (viewMode === 'overall') {
      // Export overall team scores
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
      a.download = `bbq-contest-overall-scores-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      // Export category scores
      const filteredCategoryScores =
        selectedCategory === 'all'
          ? categoryScores
          : categoryScores.filter(score => score.category === selectedCategory);

      const headers = [
        'Rank',
        'Team Name',
        'Category',
        'Item Code',
        'Total Score',
        'Average Score',
        'Number of Scores',
      ];
      const csvData = filteredCategoryScores.map((categoryScore, index) => [
        index + 1,
        categoryScore.team.name,
        categoryScore.category,
        categoryScore.itemCode,
        categoryScore.totalScore.toFixed(2),
        categoryScore.averageScore.toFixed(2),
        categoryScore.scores.length,
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const categoryName =
        selectedCategory === 'all' ? 'all-categories' : selectedCategory;
      a.download = `bbq-contest-${categoryName}-scores-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
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
    return Object.values(score.scores).reduce(
      (sum, value) => sum + (value as number),
      0
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-800">
        Loading scoreboard...
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Live Scoreboard</h1>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export to CSV
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setViewMode('overall')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                viewMode === 'overall'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overall Team Rankings
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                viewMode === 'category'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Category Rankings
            </button>
          </nav>
        </div>
      </div>

      {/* Category Filter (only show in category view) */}
      {viewMode === 'category' && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Filter by Category
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedCategory === 'all'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              {viewMode === 'overall'
                ? 'Team Rankings'
                : `${selectedCategory === 'all' ? 'All Categories' : selectedCategory} Rankings`}
            </h3>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Team
                </th>
                {viewMode === 'category' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                )}
                {viewMode === 'category' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Item Code
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Total Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Average Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Scores Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Recent Scores
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {viewMode === 'overall'
                ? // Overall team rankings
                  teamScores.map((teamScore, index) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {teamScore.totalScore.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {teamScore.averageScore.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {teamScore.scores.length}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        <div className="flex gap-1">
                          {teamScore.scores
                            .slice(-5)
                            .reverse()
                            .map(score => (
                              <span
                                key={score.id}
                                className="inline-block w-8 h-6 bg-blue-100 text-blue-800 text-xs rounded flex items-center justify-center"
                                title={`${getScoreValue(score)} - ${Object.entries(
                                  score.scores
                                )
                                  .map(
                                    ([criteria, value]) =>
                                      `${criteria}:${value}`
                                  )
                                  .join('/')}`}
                              >
                                {getScoreValue(score)}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))
                : // Category rankings
                  (selectedCategory === 'all'
                    ? categoryScores
                    : categoryScores.filter(
                        score => score.category === selectedCategory
                      )
                  ).map((categoryScore, index) => (
                    <tr
                      key={`${categoryScore.team.id}-${categoryScore.category}`}
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
                        {categoryScore.team.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {categoryScore.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-mono">
                        {categoryScore.itemCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {categoryScore.totalScore.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {categoryScore.averageScore.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {categoryScore.scores.length}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        <div className="flex gap-1">
                          {categoryScore.scores
                            .slice(-5)
                            .reverse()
                            .map(score => (
                              <span
                                key={score.id}
                                className="inline-block w-8 h-6 bg-blue-100 text-blue-800 text-xs rounded flex items-center justify-center"
                                title={`${getScoreValue(score)} - ${Object.entries(
                                  score.scores
                                )
                                  .map(
                                    ([criteria, value]) =>
                                      `${criteria}:${value}`
                                  )
                                  .join('/')}`}
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

        {/* Summary Stats */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {viewMode === 'overall'
                  ? teamScores.length
                  : selectedCategory === 'all'
                    ? categoryScores.length
                    : categoryScores.filter(
                        score => score.category === selectedCategory
                      ).length}
              </div>
              <div className="text-sm text-gray-700">
                {viewMode === 'overall' ? 'Total Teams' : 'Total Entries'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {viewMode === 'overall'
                  ? teamScores.reduce(
                      (sum, team) => sum + team.scores.length,
                      0
                    )
                  : selectedCategory === 'all'
                    ? categoryScores.reduce(
                        (sum, score) => sum + score.scores.length,
                        0
                      )
                    : categoryScores
                        .filter(score => score.category === selectedCategory)
                        .reduce((sum, score) => sum + score.scores.length, 0)}
              </div>
              <div className="text-sm text-gray-700">Total Scores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {viewMode === 'overall'
                  ? teamScores.length > 0
                    ? (
                        teamScores.reduce(
                          (sum, team) => sum + team.averageScore,
                          0
                        ) / teamScores.length
                      ).toFixed(2)
                    : '0.00'
                  : (() => {
                      const filteredScores =
                        selectedCategory === 'all'
                          ? categoryScores
                          : categoryScores.filter(
                              score => score.category === selectedCategory
                            );
                      return filteredScores.length > 0
                        ? (
                            filteredScores.reduce(
                              (sum, score) => sum + score.averageScore,
                              0
                            ) / filteredScores.length
                          ).toFixed(2)
                        : '0.00';
                    })()}
              </div>
              <div className="text-sm text-gray-700">
                {viewMode === 'overall'
                  ? 'Average Team Score'
                  : 'Average Entry Score'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
