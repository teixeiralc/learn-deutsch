import { useEffect, useRef } from 'react';

let cachedVoice: SpeechSynthesisVoice | null = null;

function findBestGermanVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const german = voices.filter(v => v.lang.startsWith('de'));
  if (!german.length) return null;

  // Prefer high-quality voices by name keywords
  const quality = ['Neural', 'Online', 'Natural', 'Google', 'Microsoft'];
  for (const kw of quality) {
    const match = german.find(v => v.name.includes(kw));
    if (match) return match;
  }
  return german[0] ?? null;
}

export function useTTS() {
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(false);
  const setPlayingRef = useRef<((v: boolean) => void) | null>(null);

  // Preload voices on mount
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => { cachedVoice = findBestGermanVoice(); };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (!cachedVoice) cachedVoice = findBestGermanVoice();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'de-DE';
    utt.rate = 0.82;
    utt.pitch = 1.05;
    if (cachedVoice) utt.voice = cachedVoice;

    utt.onstart = () => { isPlayingRef.current = true; onStart?.(); };
    utt.onend = () => { isPlayingRef.current = false; onEnd?.(); };
    utt.onerror = () => { isPlayingRef.current = false; onEnd?.(); };

    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    isPlayingRef.current = false;
  };

  return { speak, stop, setPlayingRef };
}
