import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLessonStore } from '../stores/lessonStore';
import { useAppStore } from '../stores/appStore';
import type { Level, SubmitAnswerResponse } from '../types';
import MCQ from '../exercises/MCQ';
import FillBlank from '../exercises/FillBlank';
import Translation from '../exercises/Translation';
import SentenceBuilding from '../exercises/SentenceBuilding';
import Listening from '../exercises/Listening';
import Speaking from '../exercises/Speaking';
import { useAnswerAudio } from '../hooks/useAnswerAudio';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const TYPE_CFG: Record<string, { label: string; color: string }> = {
  mcq:               { label: 'Multiple Choice', color: '#38bdf8' },
  fill_blank:        { label: 'Fill in the Blank', color: '#a78bfa' },
  translation:       { label: 'Translation', color: '#10b981' },
  sentence_building: { label: 'Sentence Building', color: '#f59e0b' },
  listening:         { label: 'Listening', color: '#38bdf8' },
  speaking:          { label: 'Speaking', color: '#f87171' },
};

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}

export default function Lesson() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { exercises, currentIndex, isLoading, isComplete, error, loadExercises, submitCurrentAnswer, nextExercise, finishLesson } = useLessonStore();
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const { primeAudio, playCorrectCue, playWrongCue } = useAnswerAudio(soundEnabled);
  const [submittedResult, setSubmittedResult] = useState<SubmitAnswerResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (level && exercises.length === 0 && !isLoading && !error) loadExercises(level as Level);
  }, [level]);

  useEffect(() => {
    if (isComplete) finishLesson(level as Level).then(() => navigate('/results'));
  }, [isComplete]);

  if (isLoading) return <div style={{ padding: 64 }}><LoadingSpinner message="Building your exercises…" /></div>;
  if (error)     return <div style={{ padding: 64 }}><ErrorMessage message={error} onRetry={() => loadExercises(level as Level)} /></div>;
  if (!exercises.length) return <div style={{ padding: 64 }}><LoadingSpinner message="Preparing…" /></div>;

  const exercise = exercises[currentIndex];
  const cfg = TYPE_CFG[exercise.type] ?? { label: exercise.type, color: '#94a3b8' };
  const progress = (currentIndex / exercises.length) * 100;

  const handleSubmit = async (answer: string) => {
    setIsSubmitting(true);
    try {
      primeAudio();
      const result = await submitCurrentAnswer(answer);
      setSubmittedResult(result);
      if (result.is_correct) playCorrectCue();
      else playWrongCue();
    }
    finally { setIsSubmitting(false); }
  };
  const handleNext = () => { setSubmittedResult(null); nextExercise(); };

  const renderExercise = () => {
    const props = { exercise, onSubmit: handleSubmit, result: submittedResult, isSubmitting };
    switch (exercise.type) {
      case 'mcq':               return <MCQ {...props} />;
      case 'fill_blank':        return <FillBlank {...props} />;
      case 'translation':       return <Translation {...props} />;
      case 'sentence_building': return <SentenceBuilding {...props} />;
      case 'listening':         return <Listening {...props} />;
      case 'speaking':          return <Speaking {...props} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '36px 48px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 48, maxWidth: 660, margin: '0 auto 48px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
            background: 'var(--bg-card)', border: '1px solid var(--border-muted)',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
        >
          <BackIcon />
        </button>

        <div style={{ flex: 1, background: 'var(--border-subtle)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
          <div
            className="progress-fill"
            style={{ width: `${progress}%`, height: '100%', background: '#f59e0b', borderRadius: 99, transition: 'width 0.5s ease' }}
          />
        </div>

        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {currentIndex + 1} / {exercises.length}
        </span>
      </div>

      {/* Exercise */}
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 12px', borderRadius: 99,
            background: `${cfg.color}12`, border: `1px solid ${cfg.color}28`,
            fontSize: 11, fontWeight: 600, color: cfg.color,
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {cfg.label}
          </span>
        </div>

        <div className="animate-fade-in">{renderExercise()}</div>

        {submittedResult && (
          <div className="animate-bounce-in" style={{ marginTop: 24 }}>
            <div style={{
              padding: '14px 18px', borderRadius: 14, marginBottom: 12,
              background: submittedResult.is_correct ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
              border: `1px solid ${submittedResult.is_correct ? 'var(--accent-green-br)' : 'var(--accent-red-br)'}`,
            }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: submittedResult.is_correct ? '#10b981' : '#f87171', marginBottom: 4 }}>
                {submittedResult.is_correct ? `✓ Correct! +${submittedResult.xp_earned} XP` : `✗ ${submittedResult.similarity_score}% match`}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{submittedResult.explanation}</p>
            </div>
            <button
              onClick={handleNext}
              style={{
                width: '100%', padding: '14px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                borderRadius: 14, background: '#f59e0b', color: '#0b1120',
                fontWeight: 700, fontSize: 15, transition: 'background 0.18s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fbbf24'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f59e0b'; }}
            >
              {currentIndex + 1 >= exercises.length ? 'See Results →' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
