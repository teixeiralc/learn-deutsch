import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { getVocabularyProgress } from '../services/api';
import { useTTS } from '../hooks/useTTS';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Level, VocabularyWithProgress } from '../types';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];
const LEVEL_COLOR: Record<Level, string> = { A1: '#10b981', A2: '#38bdf8', B1: '#f59e0b', B2: '#f87171' };
const POS_COLORS: Record<string, string> = {
  noun: '#a78bfa', verb: '#38bdf8', adjective: '#34d399',
  adverb: '#fb923c', preposition: '#f472b6', conjunction: '#94a3b8', pronoun: '#fbbf24',
};
const strengthColor = (s: number | null) => s === null ? 'var(--text-muted)' : s >= 0.8 ? '#10b981' : s >= 0.5 ? '#f59e0b' : '#f87171';

function SpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? '#f59e0b' : 'currentColor' }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
}

export default function Vocabulary() {
  const { selectedLevel } = useAppStore();
  const [words, setWords] = useState<VocabularyWithProgress[]>([]);
  const [filter, setFilter] = useState<Level>(selectedLevel);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [playingWordId, setPlayingWordId] = useState<number | null>(null);
  const { speak, error: ttsError } = useTTS();

  useEffect(() => {
    setLoading(true);
    getVocabularyProgress(filter).then(setWords).finally(() => setLoading(false));
  }, [filter]);

  const filtered = words.filter(w =>
    !search || w.german.toLowerCase().includes(search.toLowerCase()) || w.english.toLowerCase().includes(search.toLowerCase())
  );
  const studied = words.filter(w => w.repetition_count && w.repetition_count > 0).length;

  const playWord = (wordId: number, german: string) => {
    speak(
      german,
      () => setPlayingWordId(wordId),
      () => setPlayingWordId(null),
    );
  };

  return (
    <div style={{ padding: '48px 56px', maxWidth: 860, margin: '0 auto' }}>
      <div className="animate-fade-in" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>Vocabulary</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 5, fontSize: 13 }}>{studied} of {words.length} words studied</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search words…"
          style={{
            flex: 1, minWidth: 160, fontFamily: 'inherit', fontSize: 13,
            padding: '9px 14px', borderRadius: 10,
            background: 'var(--bg-input)', border: '1px solid var(--border-muted)',
            color: 'var(--text-primary)', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {LEVELS.map(lv => {
            const isActive = filter === lv;
            const color = LEVEL_COLOR[lv];
            return (
              <button key={lv} onClick={() => setFilter(lv)} style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: 600, fontSize: 12,
                background: isActive ? color : 'var(--bg-card)',
                color: isActive ? '#0b1120' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? color : 'var(--border-muted)'}`,
                transition: 'all 0.15s ease',
              }}>{lv}</button>
            );
          })}
        </div>
      </div>

      {ttsError && (
        <p style={{ color: 'var(--accent-red-br)', fontSize: 12, marginBottom: 14 }}>{ttsError}</p>
      )}

      {loading ? <LoadingSpinner message="Loading vocabulary…" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No words found. Import vocabulary first.
            </div>
          )}
          {filtered.map((word, i) => {
            const sColor = strengthColor(word.strength_score);
            const posColor = POS_COLORS[word.part_of_speech] ?? 'var(--text-muted)';
            return (
              <div
                key={word.id}
                className="animate-fade-in"
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  borderRadius: 13, padding: '13px 17px',
                  display: 'flex', gap: 14, alignItems: 'center',
                  transition: 'border-color 0.15s ease, background 0.2s ease',
                  animationDelay: `${Math.min(i * 15, 180)}ms`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{word.german}</span>
                    <button
                      type="button"
                      onClick={() => playWord(word.id, word.german)}
                      title={`Hear ${word.german}`}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 99,
                        border: `1px solid ${playingWordId === word.id ? 'rgba(245,158,11,0.35)' : 'var(--border-muted)'}`,
                        background: playingWordId === word.id ? 'rgba(245,158,11,0.14)' : 'var(--bg-card)',
                        color: playingWordId === word.id ? '#f59e0b' : 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <SpeakerIcon active={playingWordId === word.id} />
                    </button>
                    {word.gender && <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>{word.gender}</span>}
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                      background: `${posColor}18`, color: posColor, textTransform: 'capitalize',
                    }}>{word.part_of_speech}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{word.english}</p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: sColor }}>
                    {word.strength_score !== null ? `${Math.round(word.strength_score * 100)}%` : 'New'}
                  </p>
                  {word.strength_score !== null && (
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: '#10b981' }}>{word.correct_count ?? 0}✓</span>
                      <span style={{ fontSize: 11, color: '#f87171' }}>{word.incorrect_count ?? 0}✗</span>
                    </div>
                  )}
                </div>

                {word.strength_score !== null && (
                  <div style={{ width: 40, flexShrink: 0 }}>
                    <div style={{ background: 'var(--border-subtle)', borderRadius: 99, height: 3, overflow: 'hidden' }}>
                      <div className="progress-fill" style={{ width: `${(word.strength_score ?? 0) * 100}%`, height: '100%', background: sColor, borderRadius: 99 }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
