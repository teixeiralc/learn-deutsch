import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoadStore } from '../stores/roadStore';
import { useAppStore } from '../stores/appStore';
import { submitAnswer } from '../services/api';
import type { CompleteRoadNodeResponse, ExerciseType, Level, SubmitAnswerResponse } from '../types';
import MCQ from '../exercises/MCQ';
import FillBlank from '../exercises/FillBlank';
import Translation from '../exercises/Translation';
import SentenceBuilding from '../exercises/SentenceBuilding';
import Listening from '../exercises/Listening';
import Speaking from '../exercises/Speaking';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAnswerAudio } from '../hooks/useAnswerAudio';

type AnswerEntry = {
  isCorrect: boolean;
  type: ExerciseType;
};

const VALID_LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

const CELEBRATION_PARTICLES = [
  { left: 6, delay: 0 },
  { left: 12, delay: 0.1 },
  { left: 18, delay: 0.28 },
  { left: 24, delay: 0.06 },
  { left: 31, delay: 0.16 },
  { left: 38, delay: 0.25 },
  { left: 46, delay: 0.14 },
  { left: 53, delay: 0.32 },
  { left: 60, delay: 0.05 },
  { left: 67, delay: 0.2 },
  { left: 74, delay: 0.1 },
  { left: 82, delay: 0.27 },
  { left: 90, delay: 0.18 },
  { left: 96, delay: 0.3 },
];

function UnitCelebration() {
  return (
    <div className="celebration-layer" aria-hidden>
      {CELEBRATION_PARTICLES.map((particle, index) => (
        <span
          key={`${particle.left}-${index}`}
          className="celebration-dot"
          style={{ left: `${particle.left}%`, animationDelay: `${particle.delay}s` }}
        />
      ))}
      <div className="celebration-ring" />
    </div>
  );
}

export default function RoadLesson() {
  const { level, nodeId } = useParams<{ level: string; nodeId: string }>();
  const navigate = useNavigate();
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const setSelectedLevel = useAppStore((s) => s.setSelectedLevel);
  const { primeAudio, playCorrectCue, playWrongCue } = useAnswerAudio(soundEnabled);
  const {
    activeNode,
    activeTurns,
    activeExercises,
    activeRunId,
    activeIndex,
    isLoadingNode,
    nodeError,
    startNode,
    checkpointNode,
    completeNode,
    clearActiveNode,
  } = useRoadStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submittedResult, setSubmittedResult] = useState<SubmitAnswerResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [completion, setCompletion] = useState<CompleteRoadNodeResponse | null>(null);

  useEffect(() => {
    if (level && VALID_LEVELS.includes(level as Level)) {
      setSelectedLevel(level as Level);
    }
  }, [level]);

  useEffect(() => {
    const id = Number(nodeId);
    if (!Number.isFinite(id) || id <= 0) return;

    void startNode(id);
    setSubmittedResult(null);
    setAnswers([]);
    setCompletion(null);

    return () => {
      clearActiveNode();
    };
  }, [nodeId]);

  useEffect(() => {
    setCurrentIndex(activeIndex);
  }, [activeIndex]);

  const exercise = activeExercises[currentIndex];
  const progress = activeExercises.length ? (currentIndex / activeExercises.length) * 100 : 0;

  const currentTurnOrder = Number((exercise?.metadata?.turn_order as number | undefined) ?? 0);
  const stageLabel = (exercise?.metadata?.stage_label as string | undefined) ?? 'Step';
  const visibleTurns = useMemo(() => activeTurns, [activeTurns]);
  const translationHint = ((exercise?.metadata?.translation_hint as string | undefined) ?? '').trim();
  const contextTranslation = ((exercise?.metadata?.context_translation as string | undefined) ?? '').trim();
  const hideTranslationHint =
    (exercise?.metadata?.show_translation_hint as boolean | undefined) === false
    || stageLabel === 'Chunk • Meaning'
    || exercise?.question.startsWith('Select the English meaning of:');

  const handleSubmit = async (answer: string) => {
    if (!exercise || isSubmitting || completion) return;
    setIsSubmitting(true);
    try {
      primeAudio();
      const result = await submitAnswer({
        type: exercise.type,
        vocabulary_id: exercise.vocabulary_id,
        sentence_id: exercise.sentence_id,
        user_answer: answer,
        correct_answer: exercise.correct_answer,
      });
      setSubmittedResult(result);
      if (result.is_correct) playCorrectCue();
      else playWrongCue();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!exercise || !submittedResult || !activeRunId) return;

    const nextAnswers = [...answers, { isCorrect: submittedResult.is_correct, type: exercise.type }];
    setAnswers(nextAnswers);

    const checkpoint = await checkpointNode(Number(nodeId), {
      run_id: activeRunId,
      exercise_index: currentIndex,
      is_correct: submittedResult.is_correct,
      exercise_type: exercise.type,
    });

    if (!checkpoint.is_last) {
      setCurrentIndex(checkpoint.current_index);
      setSubmittedResult(null);
      return;
    }

    const result = await completeNode(Number(nodeId), {
      run_id: activeRunId,
    });

    setCompletion(result);
  };

  const renderedExercise = useMemo(() => {
    if (!exercise) return null;
    const props = { exercise, onSubmit: handleSubmit, result: submittedResult, isSubmitting };
    switch (exercise.type) {
      case 'mcq':
        return <MCQ key={exercise.id} {...props} />;
      case 'fill_blank':
        return <FillBlank key={exercise.id} {...props} />;
      case 'translation':
        return <Translation key={exercise.id} {...props} />;
      case 'sentence_building':
        return <SentenceBuilding key={exercise.id} {...props} />;
      case 'listening':
        return <Listening key={exercise.id} {...props} />;
      case 'speaking':
        return <Speaking key={exercise.id} {...props} />;
      default:
        return null;
    }
  }, [exercise, submittedResult, isSubmitting]);

  if (isLoadingNode) {
    return <div style={{ padding: 64 }}><LoadingSpinner message="Loading your story lesson..." /></div>;
  }

  if (nodeError) {
    return (
      <div style={{ padding: 64 }}>
        <ErrorMessage message={nodeError} onRetry={() => startNode(Number(nodeId))} />
      </div>
    );
  }

  if (!activeNode || !activeExercises.length || !exercise) {
    return <div style={{ padding: 64 }}><LoadingSpinner message="Preparing node..." /></div>;
  }

  if (completion) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '52px 56px' }}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          background: completion.passed ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
          borderRadius: 20,
          padding: '30px 28px',
          textAlign: 'center',
        }}>
          {completion.passed && <UnitCelebration />}

          <p style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            {completion.passed ? 'Unit Complete' : 'Node Result'}
          </p>
          <p style={{ fontSize: 34, color: 'var(--text-primary)', fontWeight: 800, marginTop: 6 }}>
            {completion.score}%
          </p>
          <p style={{ fontSize: 16, color: completion.passed ? '#10b981' : '#f87171', fontWeight: 700, marginTop: 8 }}>
            {completion.passed ? 'Node completed!' : 'Node not passed yet'}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            Stars earned: {'★'.repeat(completion.stars)}{'☆'.repeat(Math.max(0, 3 - completion.stars))}
          </p>

          {completion.thresholds && (
            <div style={{
              marginTop: 14,
              display: 'grid',
              gap: 6,
              textAlign: 'left',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '10px 12px',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Unlock Thresholds</p>
              <p style={{ fontSize: 12, color: completion.thresholds.reading.passed ? '#10b981' : '#f87171' }}>
                Reading: {completion.thresholds.reading.accuracy}% (need {completion.thresholds.reading.required}%+)
              </p>
              <p style={{ fontSize: 12, color: completion.thresholds.listening.passed ? '#10b981' : '#f87171' }}>
                Listening: {completion.thresholds.listening.accuracy}% (need {completion.thresholds.listening.required}%+)
              </p>
              <p style={{ fontSize: 12, color: completion.thresholds.speaking.passed ? '#10b981' : '#f87171' }}>
                Speaking: {completion.thresholds.speaking.attempts} attempts at {completion.thresholds.speaking.accuracy}%
                {' '}(need {completion.thresholds.speaking.required_attempts}+ attempts and {completion.thresholds.speaking.required_accuracy}%+)
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 14, marginTop: 24, justifyContent: 'center' }}>
            {!completion.passed && (
              <button
                type="button"
                className="btn-dly"
                onClick={() => startNode(Number(nodeId))}
                style={{
                  background: 'var(--dly-active-bg)',
                  borderColor: 'var(--dly-active-border)',
                  color: '#000',
                  padding: '12px 24px',
                  fontSize: 15,
                }}
              >
                Retry Node
              </button>
            )}
            <button
              type="button"
              className="btn-dly"
              onClick={() => navigate('/')}
              style={{
                background: 'var(--dly-locked-bg)',
                borderColor: 'var(--dly-locked-border)',
                color: 'var(--text-primary)',
                padding: '12px 24px',
                fontSize: 15,
              }}
            >
              Back to Road
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '30px 48px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, maxWidth: 760, margin: '0 auto 22px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            cursor: 'pointer',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-muted)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BackIcon />
        </button>

        <div className="progress-bar-wrap" style={{ flex: 1 }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            background: 'var(--dly-active-bg)', 
            borderRadius: 99, 
            transition: 'width 0.4s ease',
            boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.1)' 
          }} />
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
          {currentIndex + 1}/{activeExercises.length}
        </span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto 14px' }}>
         <p style={{ fontSize: 11, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>
          {activeNode.story_track_title} • {activeNode.chapter_title}
        </p>
        <h1 style={{ fontSize: 24, color: 'var(--text-primary)', fontWeight: 800, marginTop: 6 }}>{activeNode.title}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{activeNode.description}</p>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto 16px' }}>
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          background: 'var(--bg-card)',
          padding: '14px 14px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Conversation Context
            </p>
            <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>{stageLabel}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto', paddingRight: 2 }}>
            {visibleTurns.map((turn) => {
              const isCurrent = turn.turn_order === currentTurnOrder;
              const isSpeakerA = turn.speaker === 'A';
              return (
                <div
                  key={`${turn.turn_order}-${turn.speaker}`}
                  className="card-dly"
                  style={{
                    alignSelf: isSpeakerA ? 'flex-start' : 'flex-end',
                    maxWidth: '88%',
                    background: isCurrent ? 'var(--dly-active-bg)' : 'var(--bg-input)',
                    borderColor: isCurrent ? 'var(--dly-active-border)' : 'var(--border-subtle)',
                    color: isCurrent ? '#000' : 'var(--text-primary)',
                    padding: '12px 16px',
                    margin: '4px 0'
                  }}
                >
                  <p style={{ fontSize: 10, color: isCurrent ? 'rgba(0,0,0,0.6)' : (isSpeakerA ? '#38bdf8' : '#f87171'), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Speaker {turn.speaker}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: isCurrent ? 800 : 500, marginTop: 4 }}>{turn.german}</p>
                  <p style={{ fontSize: 13, color: isCurrent ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)', marginTop: 2 }}>{turn.english}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {translationHint && !hideTranslationHint && (
          <div style={{
            marginBottom: 12,
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            background: 'var(--bg-card)',
            padding: '10px 12px',
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Translation Hint
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 3 }}>{translationHint}</p>
            {contextTranslation && contextTranslation !== translationHint && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Context: {contextTranslation}
              </p>
            )}
          </div>
        )}

        {renderedExercise}

        {submittedResult && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: submittedResult.is_correct ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
              border: `1px solid ${submittedResult.is_correct ? 'var(--accent-green-br)' : 'var(--accent-red-br)'}`,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: submittedResult.is_correct ? '#10b981' : '#f87171' }}>
                {submittedResult.is_correct ? 'Correct' : 'Not quite yet'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{submittedResult.explanation}</p>
            </div>

            <button
              type="button"
              className="btn-dly"
              onClick={handleContinue}
              style={{
                marginTop: 14,
                width: '100%',
                background: submittedResult.is_correct ? 'var(--dly-completed-bg)' : '#f87171',
                borderColor: submittedResult.is_correct ? 'var(--dly-completed-border)' : '#dc2626',
                color: submittedResult.is_correct ? '#fff' : '#000',
                fontSize: 16,
                padding: '16px 0',
              }}
            >
              {currentIndex + 1 >= activeExercises.length ? 'Finish Node' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
