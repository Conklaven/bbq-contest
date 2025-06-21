'use client';
import { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/db';

interface ContestSettings {
  id: string;
  categories: string[];
  contestName: string;
  contestDate: string;
  maxScorePerCategory: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function SettingsPage() {
  const [, setSettings] = useState<ContestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [formData, setFormData] = useState({
    contestName: '',
    contestDate: '',
    maxScorePerCategory: 10,
    categories: [] as string[],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await DatabaseService.getSettings();

      if (savedSettings) {
        setSettings(savedSettings);
        setFormData({
          contestName: savedSettings.contestName,
          contestDate: savedSettings.contestDate,
          maxScorePerCategory: savedSettings.maxScorePerCategory,
          categories: [...savedSettings.categories],
        });
      } else {
        // Create default settings if none exist
        const defaultSettings: ContestSettings = {
          id: 'contest-settings',
          contestName: 'BBQ Contest 2024',
          contestDate: new Date().toISOString().split('T')[0],
          maxScorePerCategory: 10,
          categories: [
            'Brisket',
            'Ribs',
            'Chicken',
            'Pork',
            'Turkey',
            'Sausage',
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setSettings(defaultSettings);
        setFormData({
          contestName: defaultSettings.contestName,
          contestDate: defaultSettings.contestDate,
          maxScorePerCategory: defaultSettings.maxScorePerCategory,
          categories: [...defaultSettings.categories],
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DatabaseService.saveSettings(formData);

      // Update local state
      setSettings(prev =>
        prev
          ? {
              ...prev,
              ...formData,
              updatedAt: new Date(),
            }
          : null
      );

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (
      newCategory.trim() &&
      !formData.categories.includes(newCategory.trim())
    ) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()],
      }));
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category),
    }));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...formData.categories];
    if (direction === 'up' && index > 0) {
      [newCategories[index], newCategories[index - 1]] = [
        newCategories[index - 1],
        newCategories[index],
      ];
    } else if (direction === 'down' && index < newCategories.length - 1) {
      [newCategories[index], newCategories[index + 1]] = [
        newCategories[index + 1],
        newCategories[index],
      ];
    }
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-800">Loading settings...</div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contest Settings</h1>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            General Settings
          </h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Contest Name
                </label>
                <input
                  type="text"
                  value={formData.contestName}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      contestName: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Contest Date
                </label>
                <input
                  type="date"
                  value={formData.contestDate}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      contestDate: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded text-gray-900"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Maximum Score Per Category
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.maxScorePerCategory}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    maxScorePerCategory: parseInt(e.target.value) || 10,
                  }))
                }
                className="w-full p-2 border rounded text-gray-900"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Contest Categories
              </label>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                  className="flex-1 p-2 border rounded text-gray-900"
                  onKeyPress={e =>
                    e.key === 'Enter' && (e.preventDefault(), addCategory())
                  }
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {formData.categories.map((category, index) => (
                  <div
                    key={category}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                  >
                    <span className="flex-1 text-gray-900">{category}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveCategory(index, 'up')}
                        disabled={index === 0}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCategory(index, 'down')}
                        disabled={index === formData.categories.length - 1}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="px-2 py-1 text-xs bg-red-200 text-red-700 rounded hover:bg-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {formData.categories.length === 0 && (
                <p className="text-gray-600 text-sm">
                  No categories added yet. Add at least one category.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || formData.categories.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={loadSettings}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Current Settings
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong className="text-gray-900">Contest Name:</strong>
              <p className="text-gray-800">{formData.contestName}</p>
            </div>
            <div>
              <strong className="text-gray-900">Contest Date:</strong>
              <p className="text-gray-800">{formData.contestDate}</p>
            </div>
            <div>
              <strong className="text-gray-900">Max Score Per Category:</strong>
              <p className="text-gray-800">{formData.maxScorePerCategory}</p>
            </div>
            <div>
              <strong className="text-gray-900">Total Categories:</strong>
              <p className="text-gray-800">{formData.categories.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
