import { useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAppStore } from '../stores/appStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { fetchStats, theme } = useAppStore();

  // Apply saved theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    fetchStats();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
