import { useState, useEffect } from 'react';
import { DatabaseService, ContestSettings } from '@/lib/db';

export function useSettings() {
  const [settings, setSettings] = useState<ContestSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await DatabaseService.getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      } else {
        // Default settings if none exist
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
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to default categories
      const fallbackSettings: ContestSettings = {
        id: 'contest-settings',
        contestName: 'BBQ Contest 2024',
        contestDate: new Date().toISOString().split('T')[0],
        maxScorePerCategory: 10,
        categories: ['Brisket', 'Ribs', 'Chicken', 'Pork', 'Turkey', 'Sausage'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSettings(fallbackSettings);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = () => {
    loadSettings();
  };

  return { settings, loading, refreshSettings };
}
