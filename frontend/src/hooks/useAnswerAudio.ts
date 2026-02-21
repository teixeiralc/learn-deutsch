import { useCallback, useEffect, useRef } from 'react';

const CORRECT_CUE_GAIN = 0.13;
const CORRECT_CUE_ACCENT_GAIN = 0.11;
const WRONG_CUE_GAIN = 0.12;

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  type: OscillatorType,
  startAt: number,
  duration: number,
  gainLevel: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainLevel, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

export function useAnswerAudio(soundEnabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!soundEnabled) return null;
    if (!ctxRef.current) ctxRef.current = createAudioContext();
    return ctxRef.current;
  }, [soundEnabled]);

  const primeAudio = useCallback(() => {
    const ctx = getContext();
    if (!ctx || ctx.state !== 'suspended') return;
    void ctx.resume().catch(() => {});
  }, [getContext]);

  const playCorrectCue = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getContext();
    if (!ctx) return;

    const schedule = () => {
      const now = ctx.currentTime + 0.01;
      playTone(ctx, 520, 'sine', now, 0.11, CORRECT_CUE_GAIN);
      playTone(ctx, 740, 'triangle', now + 0.12, 0.14, CORRECT_CUE_ACCENT_GAIN);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(schedule).catch(() => {});
      return;
    }
    schedule();
  }, [getContext, soundEnabled]);

  const playWrongCue = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getContext();
    if (!ctx) return;

    const schedule = () => {
      const now = ctx.currentTime + 0.01;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(WRONG_CUE_GAIN, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(schedule).catch(() => {});
      return;
    }
    schedule();
  }, [getContext, soundEnabled]);

  useEffect(() => {
    if (soundEnabled) return;
    if (!ctxRef.current) return;
    ctxRef.current.close().catch(() => {});
    ctxRef.current = null;
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      if (!ctxRef.current) return;
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  return { primeAudio, playCorrectCue, playWrongCue };
}
