import { create } from 'zustand';
import type { Level, UserStats, LessonResult } from '../types';
import { getStats, getLessonProgress } from '../services/api';

type Theme = 'dark' | 'light';

interface AppStore {
  selectedLevel: Level;
  stats: UserStats | null;
  lessonHistory: LessonResult[];
  isLoadingStats: boolean;
  theme: Theme;

  setSelectedLevel: (level: Level) => void;
  fetchStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  toggleTheme: () => void;
}

const savedTheme = (localStorage.getItem('theme') as Theme | null) ?? 'dark';

export const useAppStore = create<AppStore>((set, get) => ({
  selectedLevel: 'A1',
  stats: null,
  lessonHistory: [],
  isLoadingStats: false,
  theme: savedTheme,

  setSelectedLevel: (level) => set({ selectedLevel: level }),

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
    set({ theme: next });
  },

  fetchStats: async () => {
    set({ isLoadingStats: true });
    try {
      const [stats, history] = await Promise.all([getStats(), getLessonProgress()]);
      set({ stats, lessonHistory: history });
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      set({ isLoadingStats: false });
    }
  },

  refreshAll: async () => {
    const [stats, history] = await Promise.all([getStats(), getLessonProgress()]);
    set({ stats, lessonHistory: history });
  },
}));
