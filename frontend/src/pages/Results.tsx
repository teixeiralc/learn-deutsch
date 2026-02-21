import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessonStore } from '../stores/lessonStore';
import { useAppStore } from '../stores/appStore';

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function RepeatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const { answers, exercises, lastXpEarned, reset } = useLessonStore();
  const { refreshAll } = useAppStore();

  useEffect(() => { refreshAll(); }, []);

  if (!answers.length) { navigate('/'); return null; }

  const correct = answers.filter(a => a.result.is_correct).length;
  const total = exercises.length;
  const pct = Math.round((correct / total) * 100);
  const headline = pct === 100 ? 'Perfect!' : pct >= 80 ? 'Great job!' : pct >= 60 ? 'Good effort!' : 'Keep going!';
  const scoreColor = pct === 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : pct >= 60 ? '#38bdf8' : '#f87171';

  return (
    <div style={{ padding: '48px 56px', maxWidth: 680, margin: '0 auto' }}>
      {/* Hero */}
      <div className="animate-bounce-in" style={{
        background: `${scoreColor}0a`, border: `1px solid ${scoreColor}22`,
        borderRadius: 24, padding: '40px 32px', textAlign: 'center', marginBottom: 28,
      }}>
        <p style={{ fontSize: 60, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{pct}%</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>{headline}</p>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>{correct} of {total} correct</p>
        {lastXpEarned > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18,
            padding: '9px 18px', borderRadius: 99,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>+{lastXpEarned}</span>
            <span style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>XP earned</span>
          </div>
        )}
      </div>

      {/* Mistakes */}
      {answers.some(a => !a.result.is_correct) && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Review Mistakes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {answers.filter(a => !a.result.is_correct).map((a, i) => (
              <div key={i} className="animate-fade-in" style={{
                background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-br)',
                borderRadius: 13, padding: '13px 17px',
              }}>
                <p style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, fontWeight: 600 }}>
                  {a.exercise.type.replace('_', ' ')}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 7 }}>{a.exercise.question.split('\n')[0]}</p>
                <p style={{ fontSize: 13, color: '#f87171' }}>You: <b>"{a.userAnswer}"</b></p>
                <p style={{ fontSize: 13, color: '#10b981' }}>Correct: <b>"{a.exercise.correct_answer}"</b></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct */}
      {answers.some(a => a.result.is_correct) && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Correct Answers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {answers.filter(a => a.result.is_correct).map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green-br)',
                borderRadius: 10, padding: '9px 13px',
              }}>
                <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.exercise.question.split('\n')[0]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => { reset(); navigate('/'); }}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit',
            background: 'var(--bg-card)', border: '1px solid var(--border-muted)',
            color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
        >
          <HomeIcon /> Dashboard
        </button>
        <button
          onClick={() => { reset(); navigate(-2); }}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit',
            background: '#f59e0b', border: 'none', color: '#0b1120',
            fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'background 0.18s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fbbf24'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f59e0b'; }}
        >
          <RepeatIcon /> Practice Again
        </button>
      </div>
    </div>
  );
}
