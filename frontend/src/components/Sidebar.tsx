import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import type { Level } from '../types';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

const LEVEL_CFG: Record<Level, { color: string; label: string; desc: string }> = {
  A1: { color: '#10b981', label: 'A1', desc: 'Beginner' },
  A2: { color: '#38bdf8', label: 'A2', desc: 'Elementary' },
  B1: { color: '#f59e0b', label: 'B1', desc: 'Intermediate' },
  B2: { color: '#f87171', label: 'B2', desc: 'Upper Int.' },
};

function FlagIcon() {
  return (
    <svg viewBox="0 0 900 600" width="22" height="15" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 2, flexShrink: 0 }}>
      <rect width="900" height="600" fill="#000"/>
      <rect y="200" width="900" height="200" fill="#d00"/>
      <rect y="400" width="900" height="200" fill="#FFCE00"/>
    </svg>
  );
}
function DashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function RoadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19c3-6 13-6 16-12"/>
      <circle cx="4" cy="19" r="2"/>
      <circle cx="20" cy="7" r="2"/>
    </svg>
  );
}
function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  );
}

export default function Sidebar() {
  const { stats, selectedLevel, setSelectedLevel, theme, toggleTheme, soundEnabled, toggleSound } = useAppStore();
  const navigate = useNavigate();

  const handleLevel = (level: Level) => {
    setSelectedLevel(level);
    navigate('/');
  };

  return (
    <aside
      className="animate-slide-in"
      style={{
        width: 220,
        height: '100vh',
        overflowY: 'auto',
        background: 'linear-gradient(180deg, var(--sidebar-from) 0%, var(--sidebar-to) 100%)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 14px',
        gap: 26,
        flexShrink: 0,
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Logo + quick toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'linear-gradient(135deg, #d97706, #f59e0b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(217,119,6,0.35)', flexShrink: 0,
        }}>
          <FlagIcon />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.2 }}>Learn Deutsch</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>Meistere Deutsch</p>
        </div>
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Disable answer sounds' : 'Enable answer sounds'}
          style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-muted)',
            background: 'var(--bg-pill)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: soundEnabled ? '#f59e0b' : 'var(--text-secondary)', transition: 'all 0.18s ease', flexShrink: 0,
          }}
        >
          {soundEnabled ? <VolumeIcon /> : <MuteIcon />}
        </button>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-muted)',
            background: 'var(--bg-pill)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', transition: 'all 0.18s ease', flexShrink: 0,
          }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {/* XP / Streak */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { value: stats?.total_xp ?? 0, label: 'Total XP', color: '#f59e0b' },
          { value: `${stats?.streak ?? 0}${stats?.streak ? '🔥' : ''}`, label: 'Streak', color: '#f97316' },
        ].map(({ value, label, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 10, padding: '10px 8px', textAlign: 'center',
            transition: 'background 0.2s ease',
          }}>
            <p style={{ fontWeight: 700, fontSize: 17, color, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Levels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 6px', marginBottom: 4 }}>Levels</p>
        {LEVELS.map(level => {
          const { color, label, desc } = LEVEL_CFG[level];
          const isActive = selectedLevel === level;
          return (
            <button
              key={level}
              onClick={() => handleLevel(level)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                border: isActive ? `1px solid ${color}35` : '1px solid transparent',
                background: isActive ? `${color}12` : 'transparent',
                textAlign: 'left', width: '100%',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                transition: 'box-shadow 0.2s ease',
              }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 12, color: isActive ? color : 'var(--text-secondary)', lineHeight: 1.2 }}>{label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>{desc}</p>
              </div>
              {isActive && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 6px', marginBottom: 4 }}>Navigate</p>
        {[
          { to: '/', icon: <RoadIcon />, label: 'Road', end: true },
          { to: '/practice', icon: <DashIcon />, label: 'Practice', end: true },
          { to: '/vocabulary', icon: <BookIcon />, label: 'Vocabulary', end: false },
        ].map(({ to, icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, textDecoration: 'none',
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#f59e0b' : 'var(--text-secondary)',
              background: isActive ? 'rgba(245,158,11,0.08)' : 'transparent',
              border: isActive ? '1px solid rgba(245,158,11,0.18)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.18s ease',
            })}
          >
            {icon} {label}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px', transition: 'background 0.2s ease',
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{stats?.sessions_completed ?? 0} sessions</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Best streak: {stats?.longest_streak ?? 0}</p>
        </div>
      </div>
    </aside>
  );
}
