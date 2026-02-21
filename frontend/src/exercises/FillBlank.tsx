import { useState } from 'react';
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

export default function FillBlank({ exercise, onSubmit, result, isSubmitting }: Props) {
  const [answer, setAnswer] = useState('');
  const [focused, setFocused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { speak, error: ttsError } = useTTS();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || result || isSubmitting) return;
    await onSubmit(answer.trim());
  };

  const [question, hint] = exercise.question.includes('\n')
    ? exercise.question.split('\n')
    : [exercise.question, ''];

  const speakText = (exercise.metadata?.speak_text as string | undefined)?.trim()
    || exercise.correct_answer;

  const handleSpeak = () => {
    if (!speakText) return;
    speak(
      speakText,
      () => setPlaying(true),
      () => setPlaying(false),
    );
  };

  const borderColor = result
    ? result.is_correct ? 'var(--accent-green-br)' : 'var(--accent-red-br)'
    : focused ? 'rgba(245,158,11,0.5)' : 'var(--border-muted)';

  return (
    <div>
      <ExerciseHeader
        title={question}
        onSpeak={handleSpeak}
        isSpeaking={playing}
        marginBottom={hint ? 8 : 12}
      />

      {ttsError && (
        <p style={{ fontSize: 12, color: 'var(--accent-red-br)', marginBottom: 10 }}>{ttsError}</p>
      )}

      {hint && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12, fontStyle: 'italic' }}>{hint}</p>}

      <HintRevealComponent
        hint={exercise.hint}
        correctAnswer={exercise.correct_answer}
        hasResult={!!result}
        onReveal={() => { if (!result && !isSubmitting) onSubmit('[revealed]'); }}
      />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <input
          type="text" value={answer} onChange={e => setAnswer(e.target.value)}
          disabled={!!result || isSubmitting}
          placeholder="Type your answer…" autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            fontFamily: 'inherit', fontSize: 15, padding: '13px 17px', borderRadius: 13,
            background: result
              ? result.is_correct ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)'
              : 'var(--bg-input)',
            border: `1px solid ${borderColor}`,
            color: 'var(--text-primary)', outline: 'none', width: '100%',
            transition: 'border-color 0.2s ease, background 0.2s ease',
          }}
        />
        {!result && (
          <button type="submit" disabled={!answer.trim() || isSubmitting} style={{
            padding: '13px 0', borderRadius: 13, border: 'none', cursor: answer.trim() ? 'pointer' : 'not-allowed',
            background: !answer.trim() || isSubmitting ? 'rgba(245,158,11,0.3)' : '#f59e0b',
            color: '#0b1120', fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
            transition: 'background 0.18s ease',
          }}>
            {isSubmitting ? 'Checking…' : 'Submit'}
          </button>
        )}
      </form>
    </div>
  );
}
