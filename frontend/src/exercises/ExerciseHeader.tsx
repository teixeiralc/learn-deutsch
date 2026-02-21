interface Props {
  title: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  marginBottom?: number;
}

function HeaderSpeakerIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? '#f59e0b' : 'currentColor' }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
}

export default function ExerciseHeader({ title, onSpeak, isSpeaking = false, marginBottom = 12 }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0, flex: 1 }}>
        {title}
      </h2>
      {onSpeak && (
        <button
          type="button"
          onClick={onSpeak}
          title={isSpeaking ? 'Playing...' : 'Hear German pronunciation'}
          style={{
            width: 28,
            height: 28,
            borderRadius: 99,
            border: `1px solid ${isSpeaking ? 'rgba(245,158,11,0.35)' : 'var(--border-muted)'}`,
            background: isSpeaking ? 'rgba(245,158,11,0.14)' : 'var(--bg-card)',
            color: isSpeaking ? '#f59e0b' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            padding: 0,
            transition: 'all 0.18s ease',
            marginTop: 2,
          }}
        >
          <HeaderSpeakerIcon active={isSpeaking} />
        </button>
      )}
    </div>
  );
}
