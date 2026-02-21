import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { useLessonStore } from '../stores/lessonStore';
import type { Level, LessonResult } from '../types';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

const LEVEL_CFG: Record<Level, { color: string; label: string; sublabel: string }> = {
  A1: { color: '#10b981', label: 'A1', sublabel: 'Beginner Basics' },
  A2: { color: '#38bdf8', label: 'A2', sublabel: 'Elementary' },
  B1: { color: '#f59e0b', label: 'B1', sublabel: 'Intermediate' },
  B2: { color: '#f87171', label: 'B2', sublabel: 'Upper Intermediate' },
};

function StatCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 16, padding: '20px 24px', flex: 1,
      transition: 'background 0.2s ease',
    }}>
      <p style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function LevelCard({ level, result }: { level: Level; result?: LessonResult }) {
  const navigate = useNavigate();
  const loadExercises = useLessonStore(s => s.loadExercises);
  const { color, label, sublabel } = LEVEL_CFG[level];
  const pct = result ? Math.round((result.best_score / result.total_exercises) * 100) : 0;

  const handleStart = async () => {
    await loadExercises(level);
    navigate(`/lesson/${level}`);
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        background: `${color}0a`, border: `1px solid ${color}28`,
        borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        cursor: 'default', transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${color}1a`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ fontSize: 22, fontWeight: 800, color }}>{label}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sublabel}</p>
        </div>
        {result && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{result.attempts} sessions</p>
          </div>
        )}
      </div>

      {result && (
        <div style={{ background: 'var(--border-subtle)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
          <div className="progress-fill" style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
        </div>
      )}

      <button
        onClick={handleStart}
        style={{
          width: '100%', border: 'none', cursor: 'pointer',
          padding: '12px 0', borderRadius: 12,
          fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
          background: color, color: '#0b1120',
          transition: 'opacity 0.18s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        {result ? '↺ Practice Again' : '▶ Start Learning'}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { stats, lessonHistory, isLoadingStats, fetchStats } = useAppStore();
  const getResult = (level: Level) => lessonHistory.find(r => r.lesson_level === level);

  return (
    <div style={{ padding: '48px 56px', maxWidth: 860, margin: '0 auto' }}>
      <div className="animate-fade-in" style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>Guten Morgen!</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Keep your streak alive — practice every day.</p>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 40 }}>
        <StatCard value={stats?.total_xp ?? 0} label="Total XP" color="#f59e0b" />
        <StatCard value={`${stats?.streak ?? 0}${stats?.streak ? ' 🔥' : ''}`} label="Day Streak" color="#f97316" />
        <StatCard value={stats?.sessions_completed ?? 0} label="Sessions" color="#38bdf8" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Learning Levels
        </h2>
        <button
          onClick={fetchStats}
          disabled={isLoadingStats}
          style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {LEVELS.map(level => <LevelCard key={level} level={level} result={getResult(level)} />)}
      </div>
    </div>
  );
}
