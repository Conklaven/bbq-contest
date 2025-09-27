'use client';
import { useState, useEffect } from 'react';
import { DatabaseService, Team } from '@/lib/db';
import { generateQRPackPDF, downloadPDF } from '@/lib/qrGenerator';
import { useSettings } from '@/lib/useSettings';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    categories: [] as string[],
  });
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const teamsData = await DatabaseService.getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTeam(true);
    try {
      if (editingTeam) {
        // Update existing team
        // Note: You'll need to add updateTeam method to DatabaseService
        console.log('Update team:', editingTeam.id, formData);
      } else {
        // Create new team using API route
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create team');
        }

        const result = await response.json();
        console.log('Team created successfully:', result);
      }
      setFormData({ name: '', email: '', password: '', categories: [] });
      setShowForm(false);
      setEditingTeam(null);
      loadTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Error creating team: ' + (error as Error).message);
    } finally {
      setSavingTeam(false);
    }
  };

  const handleGenerateQRPack = async () => {
    setGeneratingPDF(true);
    try {
      const pdfBytes = await generateQRPackPDF();
      downloadPDF(pdfBytes, 'bbq-contest-qr-codes.pdf');
    } catch (error) {
      console.error('Error generating QR pack:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const generatePassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const editTeam = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      email: team.email,
      password: team.password,
      categories: team.categories,
    });
    setShowForm(true);
  };

  const deleteTeam = async (team: Team) => {
    if (
      !confirm(
        `Are you sure you want to delete team "${team.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE',
      });

      const responseText = await response.text();
      console.log('API Response:', response.status, responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to delete team';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} - ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      console.log('Team deleted successfully');
      loadTeams(); // Reload the teams list
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error deleting team: ' + (error as Error).message);
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="text-center py-8 text-gray-800">Loading teams...</div>
    );
  }

  const categories = settings?.categories || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teams Management</h1>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateQRPack}
            disabled={generatingPDF || savingTeam}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {generatingPDF ? 'Generating...' : 'Generate QR Codes (PDF)'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            disabled={savingTeam}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Add Team
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            {editingTeam ? 'Edit Team' : 'Add New Team'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Team Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full p-2 border rounded text-gray-900 disabled:bg-gray-100"
                disabled={savingTeam}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                }
                className="w-full p-2 border rounded text-gray-900 disabled:bg-gray-100"
                disabled={savingTeam}
                required
              />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  disabled={savingTeam}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  Generate Random
                </button>
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={e =>
                  setFormData(prev => ({ ...prev, password: e.target.value }))
                }
                className="w-full p-2 border rounded text-gray-900 disabled:bg-gray-100"
                disabled={savingTeam}
                required
                placeholder="Enter password or click 'Generate Random'"
              />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-900">
                  Categories
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = categories.every(cat =>
                      formData.categories.includes(cat)
                    );
                    setFormData(prev => ({
                      ...prev,
                      categories: allSelected ? [] : [...categories],
                    }));
                  }}
                  disabled={savingTeam}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {categories.every(cat => formData.categories.includes(cat))
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <label
                    key={category}
                    className="flex items-center text-gray-900"
                  >
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="mr-2"
                      disabled={savingTeam}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingTeam}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {editingTeam
                  ? savingTeam
                    ? 'Updating...'
                    : 'Update'
                  : savingTeam
                    ? 'Creating...'
                    : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTeam(null);
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    categories: [],
                  });
                }}
                disabled={savingTeam}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">All Teams</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Team Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teams.map(team => (
                <tr key={team.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {team.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {team.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {team.categories.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => editTeam(team)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTeam(team)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
