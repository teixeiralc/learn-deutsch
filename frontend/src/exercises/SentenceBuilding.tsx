import { useState } from 'react';
import type { GeneratedExercise, SubmitAnswerResponse } from '../types';

interface Props {
  exercise: GeneratedExercise;
  onSubmit: (answer: string) => Promise<void>;
  result: SubmitAnswerResponse | null;
  isSubmitting: boolean;
}

export default function SentenceBuilding({ exercise, onSubmit, result, isSubmitting }: Props) {
  const words: string[] = exercise.options ?? [];
  const [selected, setSelected] = useState<string[]>([]);

  const available = words.filter((w, i) => !selected.includes(w) || words.indexOf(w) !== i
    ? !selected.slice(0, selected.filter(s => s === w).length + 1).includes(w)
    : false
  );

  // Proper multi-instance tracking
  const wordPool = [...words];
  const usedIndices = new Set<number>();
  const getAvailable = () => wordPool.filter((_, idx) => !usedIndices.has(idx));

  const addWord = (word: string) => {
    if (result || isSubmitting) return;
    const idx = wordPool.findIndex((w, i) => w === word && !usedIndices.has(i));
    if (idx === -1) return;
    usedIndices.add(idx);
    setSelected(prev => [...prev, word]);
  };

  const removeWord = (pos: number) => {
    if (result || isSubmitting) return;
    setSelected(prev => prev.filter((_, i) => i !== pos));
  };

  const handleSubmit = async () => {
    if (!selected.length || result || isSubmitting) return;
    await onSubmit(selected.join(' '));
  };

  const isCorrect = result?.is_correct;
  const wordBtnBase: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 14, fontWeight: 500, transition: 'all 0.15s ease',
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>
        {exercise.question}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Tap words to build the sentence</p>

      {/* Assembly area */}
      <div style={{
        minHeight: 56, padding: '12px 14px', borderRadius: 13, marginBottom: 18,
        background: result
          ? isCorrect ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)'
          : 'var(--bg-input)',
        border: `1px solid ${result
          ? isCorrect ? 'var(--accent-green-br)' : 'var(--accent-red-br)'
          : 'var(--border-muted)'}`,
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', transition: 'all 0.2s ease',
      }}>
        {selected.length === 0 && (
          <span style={{ color: 'var(--text-faint)', fontSize: 14, fontStyle: 'italic' }}>Your sentence appears here…</span>
        )}
        {selected.map((w, i) => (
          <button
            key={i} onClick={() => removeWord(i)} disabled={!!result}
            style={{
              ...wordBtnBase,
              background: result
                ? isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(248,113,113,0.15)'
                : 'rgba(245,158,11,0.12)',
              border: `1px solid ${result
                ? isCorrect ? 'var(--accent-green-br)' : 'var(--accent-red-br)'
                : 'rgba(245,158,11,0.3)'}`,
              color: result
                ? isCorrect ? '#10b981' : '#f87171'
                : '#f59e0b',
              cursor: result ? 'default' : 'pointer',
            }}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Word bank */}
      {!result && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {words.map((word, i) => {
            const usedCount = selected.filter(s => s === word).length;
            const totalCount = words.filter(w => w === word).length;
            const isUsed = usedCount >= totalCount;
            return (
              <button
                key={i} onClick={() => !isUsed && addWord(word)} disabled={isUsed || !!result || isSubmitting}
                style={{
                  ...wordBtnBase,
                  background: isUsed ? 'var(--bg-card)' : 'var(--bg-card)',
                  border: `1px solid ${isUsed ? 'var(--border-subtle)' : 'var(--border-strong)'}`,
                  color: isUsed ? 'var(--text-faint)' : 'var(--text-primary)',
                  opacity: isUsed ? 0.4 : 1,
                  cursor: isUsed ? 'not-allowed' : 'pointer',
                }}
              >
                {word}
              </button>
            );
          })}
        </div>
      )}

      {!result && (
        <button
          onClick={handleSubmit} disabled={!selected.length || isSubmitting}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 13, border: 'none', fontFamily: 'inherit',
            cursor: selected.length ? 'pointer' : 'not-allowed',
            background: !selected.length || isSubmitting ? 'rgba(245,158,11,0.3)' : '#f59e0b',
            color: '#0b1120', fontWeight: 700, fontSize: 15, transition: 'background 0.18s ease',
          }}
        >
          {isSubmitting ? 'Checking…' : 'Submit Sentence'}
        </button>
      )}
    </div>
  );
}
