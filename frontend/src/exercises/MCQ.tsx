import { useEffect, useState } from 'react';
import type { GeneratedExercise, SubmitAnswerResponse } from '../types';
import { useTTS } from '../hooks/useTTS';
import ExerciseHeader from './ExerciseHeader';
import HintRevealComponent from './HintRevealComponent';

interface Props {
  exercise: GeneratedExercise;
  onSubmit: (answer: string) => Promise<void>;
  result: SubmitAnswerResponse | null;
  isSubmitting: boolean;
}

export default function MCQ({ exercise, onSubmit, result, isSubmitting }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const { speak, error: ttsError } = useTTS();

  const speakText = (exercise.metadata?.speak_text as string | undefined)?.trim() || null;

  useEffect(() => {
    setSelected(null);
  }, [exercise.id]);

  const handleSpeak = () => {
    if (!speakText) return;
    speak(
      speakText,
      () => setPlaying(true),
      () => setPlaying(false),
    );
  };

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
      <ExerciseHeader
        title={exercise.question}
        onSpeak={speakText ? handleSpeak : undefined}
        isSpeaking={playing}
        marginBottom={12}
      />

      {ttsError && (
        <p style={{ fontSize: 12, color: 'var(--accent-red-br)', marginBottom: 12 }}>{ttsError}</p>
      )}

      <HintRevealComponent
        hint={exercise.hint}
        correctAnswer={exercise.correct_answer}
        hasResult={!!result}
        onReveal={() => !result && !isSubmitting && handleSelect('[revealed]')}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16 }}>
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
