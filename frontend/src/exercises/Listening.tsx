import { useState } from 'react';
import type { GeneratedExercise, SubmitAnswerResponse } from '../types';
import { useTTS } from '../hooks/useTTS';
import HintRevealComponent from './HintRevealComponent';

interface Props {
  exercise: GeneratedExercise;
  onSubmit: (answer: string) => Promise<void>;
  result: SubmitAnswerResponse | null;
  isSubmitting: boolean;
}

function SpeakerIcon({ playing }: { playing: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: playing ? '#f59e0b' : 'currentColor' }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      {playing
        ? <><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></>
        : <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      }
    </svg>
  );
}

export default function Listening({ exercise, onSubmit, result, isSubmitting }: Props) {
  const [answer, setAnswer] = useState('');
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [focused, setFocused] = useState(false);
  const { speak, playUrl, error: ttsError } = useTTS();

  const textToSpeak = (exercise.metadata?.text_to_speak as string) ?? exercise.correct_answer;
  const audioUrl = (exercise.metadata?.audio_url as string) ?? null;

  const handlePlay = () => {
    const handleStart = () => setPlaying(true);
    const handleEnd = (didPlay: boolean) => {
      setPlaying(false);
      if (didPlay) setPlayCount(c => c + 1);
    };

    if (audioUrl) {
      playUrl(audioUrl, handleStart, handleEnd);
      return;
    }

    speak(textToSpeak, handleStart, handleEnd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || result || isSubmitting) return;
    await onSubmit(answer.trim());
  };

  const borderColor = result
    ? result.is_correct ? 'var(--accent-green-br)' : 'var(--accent-red-br)'
    : focused ? 'rgba(245,158,11,0.5)' : 'var(--border-muted)';

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>
        {exercise.question}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Listen carefully and type what you hear</p>

      <HintRevealComponent
        hint={exercise.hint}
        correctAnswer={exercise.correct_answer}
        hasResult={!!result}
        onReveal={() => { if (!result && !isSubmitting) onSubmit('[revealed]'); }}
      />

      {/* Play button */}
      <button
        onClick={handlePlay}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 16,
          padding: '18px 24px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
          width: '100%', marginBottom: 20,
          background: playing ? 'rgba(245,158,11,0.1)' : 'var(--bg-card)',
          border: `1px solid ${playing ? 'rgba(245,158,11,0.3)' : 'var(--border-muted)'}`,
          color: 'var(--text-primary)', fontSize: 15, fontWeight: 500,
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: playing ? '#f59e0b' : 'rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: playing ? '#0b1120' : '#f59e0b',
          transition: 'all 0.2s ease',
          boxShadow: playing ? '0 0 0 8px rgba(245,158,11,0.1)' : 'none',
        }}>
          <SpeakerIcon playing={playing} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            {playing ? 'Playing…' : playCount ? 'Play Again' : 'Play Audio'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>German pronunciation ({playCount} plays)</p>
        </div>
      </button>

      {ttsError && (
        <p style={{ fontSize: 12, color: 'var(--accent-red-br)', marginTop: -10, marginBottom: 12 }}>{ttsError}</p>
      )}

      {playCount > 0 && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text" value={answer} onChange={e => setAnswer(e.target.value)}
            disabled={!!result || isSubmitting}
            placeholder="Type what you heard…" autoFocus={playCount > 0}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              fontFamily: 'inherit', fontSize: 15, padding: '13px 17px', borderRadius: 13,
              background: result
                ? result.is_correct ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)'
                : 'var(--bg-input)',
              border: `1px solid ${borderColor}`,
              color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
          />
          {!result && (
            <button type="submit" disabled={!answer.trim() || isSubmitting} style={{
              padding: '13px 0', borderRadius: 13, border: 'none', fontFamily: 'inherit',
              cursor: answer.trim() ? 'pointer' : 'not-allowed',
              background: !answer.trim() || isSubmitting ? 'rgba(245,158,11,0.3)' : '#f59e0b',
              color: '#0b1120', fontWeight: 700, fontSize: 15, transition: 'background 0.18s ease',
            }}>
              {isSubmitting ? 'Checking…' : 'Submit'}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
