import { useState, useEffect } from 'react';
import type { GeneratedExercise, SubmitAnswerResponse } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTTS } from '../hooks/useTTS';
import HintRevealComponent from './HintRevealComponent'; 

interface Props {
  exercise: GeneratedExercise;
  onSubmit: (answer: string) => Promise<void>;
  result: SubmitAnswerResponse | null;
  isSubmitting: boolean;
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

export default function Speaking({ exercise, onSubmit, result, isSubmitting }: Props) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { speak } = useTTS();

  // Extract the German text from the question (format: "Say this sentence aloud:\n"text" (english)")
  const germanText = (exercise.metadata?.expected_german as string) ?? exercise.correct_answer;

  const handleSpeak = () => {
    speak(
      germanText,
      () => setPlaying(true),
      () => { setPlaying(false); setHasPlayed(true); },
    );
  };

  useEffect(() => {
    if (transcript && !isListening && !result && !isSubmitting) {
      onSubmit(transcript);
    }
  }, [isListening]);

  const handleMic = () => isListening ? stopListening() : startListening();
  const skip = () => onSubmit('[skipped]');

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>
        Say this sentence aloud:
      </h2>

      {/* German sentence */}
      <div style={{
        padding: '18px 22px', borderRadius: 14, marginBottom: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border-muted)',
      }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>{germanText}</p>
        <button
          onClick={handleSpeak}
          style={{
            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: playing ? 'rgba(245,158,11,0.15)' : 'var(--bg-pill)',
            color: playing ? '#f59e0b' : 'var(--text-muted)', fontSize: 12, fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          ▶ {playing ? 'Playing…' : hasPlayed ? 'Play again' : 'Hear pronunciation'}
        </button>
      </div>

      <HintRevealComponent
        hint={exercise.hint}
        correctAnswer={exercise.correct_answer}
        hasResult={!!result}
        onReveal={() => { if (!result && !isSubmitting) onSubmit('[revealed]'); }}
      />

      {isSupported ? (
        <>
          {/* Mic button */}
          <div style={{ textAlign: 'center', marginBottom: 20, marginTop: 16 }}>
            <button
              onClick={handleMic}
              disabled={!!result || isSubmitting}
              className={isListening ? 'animate-pulse-glow' : ''}
              style={{
                width: 72, height: 72, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: isListening ? '#f87171' : result ? 'var(--bg-card)' : 'rgba(245,158,11,0.12)',
                color: isListening ? '#fff' : result ? 'var(--text-muted)' : '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
                boxShadow: isListening ? '0 0 0 12px rgba(248,113,113,0.15)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <MicIcon />
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 10 }}>
              {isListening ? 'Listening… tap to stop' : result ? 'Done' : 'Tap to speak'}
            </p>
          </div>

          {/* Transcript */}
          {transcript && (
            <div style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border-muted)',
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>You said</p>
              <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>"{transcript}"</p>
            </div>
          )}

          {!result && !isListening && (
            <button onClick={skip} style={{
              width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid var(--border-subtle)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit', transition: 'all 0.18s ease',
            }}>
              Skip (no microphone)
            </button>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 14 }}>Speech recognition not available in your browser.</p>
          <button onClick={skip} style={{
            padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: '#f59e0b', color: '#0b1120', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
          }}>
            Skip Exercise
          </button>
        </div>
      )}
    </div>
  );
}
