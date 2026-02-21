import { useState } from 'react';
import type { GeneratedExercise, SubmitAnswerResponse } from '../types';

interface Props {
  exercise: GeneratedExercise;
  onSubmit: (answer: string) => Promise<void>;
  result: SubmitAnswerResponse | null;
  isSubmitting: boolean;
}

export default function MCQ({ exercise, onSubmit, result, isSubmitting }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = async (option: string) => {
    if (result || isSubmitting) return;
    setSelected(option);
    await onSubmit(option);
  };

  const getStyle = (option: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '100%', padding: '13px 18px', borderRadius: 13,
      textAlign: 'left', fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
      transition: 'all 0.15s ease', cursor: result ? 'default' : 'pointer',
    };
    if (result) {
      if (option === exercise.correct_answer)
        return { ...base, background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green-br)', color: '#10b981' };
      if (option === selected)
        return { ...base, background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-br)', color: '#f87171' };
      return { ...base, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' };
    }
    if (option === selected)
      return { ...base, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' };
    return { ...base, background: 'var(--bg-card)', border: '1px solid var(--border-muted)', color: 'var(--text-secondary)' };
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 28 }}>
        {exercise.question}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {(exercise.options ?? []).map(option => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={!!result || isSubmitting}
            style={getStyle(option)}
            onMouseEnter={e => {
              if (!result && selected !== option) {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!result && selected !== option) {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-muted)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
