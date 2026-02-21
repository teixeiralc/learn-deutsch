import { useState } from 'react';
import type { GeneratedExercise, SubmitAnswerResponse } from '../types';
import HintRevealComponent from './HintRevealComponent'; 

interface Props {
  exercise: GeneratedExercise;
  onSubmit: (answer: string) => Promise<void>;
  result: SubmitAnswerResponse | null;
  isSubmitting: boolean;
}

export default function Translation({ exercise, onSubmit, result, isSubmitting }: Props) {
  const [answer, setAnswer] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || result || isSubmitting) return;
    await onSubmit(answer.trim());
  };

  const borderColor = result
    ? result.is_correct ? 'var(--accent-green-br)' : 'rgba(245,158,11,0.4)'
    : focused ? 'rgba(245,158,11,0.5)' : 'var(--border-muted)';

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>
        {exercise.question}
      </h2>

      <HintRevealComponent
        hint={exercise.hint}
        correctAnswer={exercise.correct_answer}
        hasResult={!!result}
        onReveal={() => { if (!result && !isSubmitting) onSubmit('[revealed]'); }}
      />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          disabled={!!result || isSubmitting}
          placeholder="Type your translation…"
          rows={3}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            fontFamily: 'inherit', fontSize: 15, padding: '13px 17px', borderRadius: 13,
            background: result
              ? result.is_correct ? 'var(--accent-green-bg)' : 'rgba(245,158,11,0.06)'
              : 'var(--bg-input)',
            border: `1px solid ${borderColor}`,
            color: 'var(--text-primary)', outline: 'none',
            resize: 'vertical', lineHeight: 1.6,
            transition: 'border-color 0.2s ease, background 0.2s ease',
          }}
        />
        {!result && (
          <button type="submit" disabled={!answer.trim() || isSubmitting} style={{
            padding: '13px 0', borderRadius: 13, border: 'none',
            cursor: answer.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            background: !answer.trim() || isSubmitting ? 'rgba(245,158,11,0.3)' : '#f59e0b',
            color: '#0b1120', fontWeight: 700, fontSize: 15, transition: 'background 0.18s ease',
          }}>
            {isSubmitting ? 'Checking…' : 'Submit Translation'}
          </button>
        )}
        {result && (
          <div style={{
            padding: '12px 15px', borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border-muted)',
          }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 600 }}>Accepted answer</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{exercise.correct_answer}</p>
          </div>
        )}
      </form>
    </div>
  );
}
