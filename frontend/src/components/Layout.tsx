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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
