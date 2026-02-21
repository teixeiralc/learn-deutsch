import { useState } from 'react';

interface Props {
  hint?: string;
  correctAnswer: string;
  hasResult: boolean;
  onReveal: () => void;
}

export default function HintReveal({ hint, correctAnswer, hasResult, onReveal }: Props) {
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);

  if (hasResult || (!hint && !correctAnswer)) return null;

  const handleReveal = () => {
    setRevealed(true);
    onReveal();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Buttons row */}
      {!revealed && (
        <div style={{ display: 'flex', gap: 8 }}>
          {hint && (
            <button
              onClick={() => setShowHint(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 13px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 12, fontWeight: 600,
                border: showHint ? '1px solid rgba(56,189,248,0.45)' : '1px solid var(--border-muted)',
                background: showHint ? 'rgba(56,189,248,0.08)' : 'var(--bg-card)',
                color: showHint ? '#38bdf8' : 'var(--text-muted)',
                transition: 'all 0.18s ease',
              }}
            >
              💡 {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
          )}

          <button
            onClick={handleReveal}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 13px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border-muted)',
              background: 'var(--bg-card)',
              color: 'var(--text-muted)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.45)';
              (e.currentTarget as HTMLElement).style.color = '#f87171';
              (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-muted)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
            }}
          >
            👁 Reveal Answer
          </button>
        </div>
      )}

      {/* Hint text */}
      {showHint && hint && !revealed && (
        <div style={{
          padding: '8px 13px', borderRadius: 10,
          background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)',
          fontSize: 13, color: '#38bdf8', fontStyle: 'italic',
        }}>
          {hint}
        </div>
      )}

      {/* Revealed answer */}
      {revealed && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Answer</span>
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{correctAnswer}</span>
        </div>
      )}
    </div>
  );
}
