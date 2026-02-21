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
  soundEnabled: boolean;

  setSelectedLevel: (level: Level) => void;
  fetchStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  toggleTheme: () => void;
  toggleSound: () => void;
}

const savedTheme = (localStorage.getItem('theme') as Theme | null) ?? 'dark';
const savedSound = localStorage.getItem('soundEnabled');
const initialSoundEnabled = savedSound === null ? true : savedSound !== 'false';

export const useAppStore = create<AppStore>((set, get) => ({
  selectedLevel: 'A1',
  stats: null,
  lessonHistory: [],
  isLoadingStats: false,
  theme: savedTheme,
  soundEnabled: initialSoundEnabled,

  setSelectedLevel: (level) => set({ selectedLevel: level }),

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
    set({ theme: next });
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    localStorage.setItem('soundEnabled', String(next));
    set({ soundEnabled: next });
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
