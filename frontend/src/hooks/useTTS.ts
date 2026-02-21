import { useEffect, useRef, useState } from 'react';
import { synthesizeSpeech } from '../services/api';

const AUDIO_ERROR_MESSAGE = 'Audio unavailable right now. Please try again.';
const AUDIO_CACHE_LIMIT = 80;

const ttsAudioCache = new Map<string, ArrayBuffer>();

function getCacheKey(text: string, voiceId?: string) {
  return `${voiceId ?? 'default'}::${text}`;
}

function getCachedAudio(cacheKey: string): ArrayBuffer | null {
  const cached = ttsAudioCache.get(cacheKey);
  if (!cached) return null;

  ttsAudioCache.delete(cacheKey);
  ttsAudioCache.set(cacheKey, cached);
  return cached;
}

function setCachedAudio(cacheKey: string, audioData: ArrayBuffer) {
  if (ttsAudioCache.has(cacheKey)) {
    ttsAudioCache.delete(cacheKey);
  }
  ttsAudioCache.set(cacheKey, audioData);

  while (ttsAudioCache.size > AUDIO_CACHE_LIMIT) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (!oldestKey) break;
    ttsAudioCache.delete(oldestKey);
  }
}

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

export function useTTS() {
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onEndRef = useRef<((didPlay: boolean) => void) | null>(null);
  const playbackIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  const getAudioContext = () => {
    if (!contextRef.current) contextRef.current = createAudioContext();
    return contextRef.current;
  };

  const clearWebAudioPlayback = () => {
    if (!sourceRef.current) return;
    sourceRef.current.onended = null;
    sourceRef.current.disconnect();
    sourceRef.current = null;
  };

  const clearHtmlAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const clearPlayback = () => {
    clearWebAudioPlayback();
    clearHtmlAudioPlayback();
  };

  const finalizePlayback = (didPlay: boolean, playbackId: number) => {
    if (playbackIdRef.current !== playbackId) return;
    clearPlayback();
    onEndRef.current?.(didPlay);
    onEndRef.current = null;
  };

  const playWithWebAudio = async (
    context: AudioContext,
    audioData: ArrayBuffer,
    playbackId: number,
    onStart?: () => void,
  ) => {
    if (context.state === 'suspended') {
      await context.resume();
    }

    const decoded = await context.decodeAudioData(audioData.slice(0));
    if (playbackIdRef.current !== playbackId) return;

    const source = context.createBufferSource();
    source.buffer = decoded;
    source.connect(context.destination);
    sourceRef.current = source;

    source.onended = () => {
      finalizePlayback(true, playbackId);
    };

    onStart?.();
    source.start(0);
  };

  const playWithHtmlAudio = async (
    audioData: ArrayBuffer,
    playbackId: number,
    onStart?: () => void,
  ) => {
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const objectUrl = URL.createObjectURL(blob);
    objectUrlRef.current = objectUrl;

    const audio = new Audio(objectUrl);
    audioRef.current = audio;

    audio.onended = () => {
      finalizePlayback(true, playbackId);
    };
    audio.onerror = () => {
      if (playbackIdRef.current !== playbackId) return;
      setError(AUDIO_ERROR_MESSAGE);
      finalizePlayback(false, playbackId);
    };

    onStart?.();
    await audio.play();
  };

  const stop = (emitEnd = true) => {
    playbackIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // noop
      }
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    clearPlayback();
    if (emitEnd) onEndRef.current?.(false);
    onEndRef.current = null;
  };

  const speak = async (text: string, onStart?: () => void, onEnd?: (didPlay: boolean) => void) => {
    const normalized = text.trim();
    if (!normalized) {
      onEnd?.(false);
      return;
    }

    stop(false);
    const playbackId = playbackIdRef.current + 1;
    playbackIdRef.current = playbackId;

    setError(null);
    onEndRef.current = onEnd ?? null;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const cacheKey = getCacheKey(normalized);
      const cachedAudio = getCachedAudio(cacheKey);

      let audioData = cachedAudio;
      if (!audioData) {
        audioData = await synthesizeSpeech(normalized, undefined, controller.signal);
        if (controller.signal.aborted || playbackIdRef.current !== playbackId) return;
        setCachedAudio(cacheKey, audioData);
      }

      const context = getAudioContext();
      if (context) {
        try {
          await playWithWebAudio(context, audioData, playbackId, onStart);
          return;
        } catch (webAudioError) {
          console.warn('WebAudio playback failed, using HTMLAudioElement', webAudioError);
          clearWebAudioPlayback();
        }
      }

      await playWithHtmlAudio(audioData, playbackId, onStart);
    } catch (err: unknown) {
      if (controller.signal.aborted || playbackIdRef.current !== playbackId) return;
      setError(AUDIO_ERROR_MESSAGE);
      finalizePlayback(false, playbackId);
      console.error('TTS playback failed', err);
    }
  };

  const playUrl = async (url: string, onStart?: () => void, onEnd?: (didPlay: boolean) => void) => {
    const normalized = url.trim();
    if (!normalized) {
      onEnd?.(false);
      return;
    }

    stop(false);
    const playbackId = playbackIdRef.current + 1;
    playbackIdRef.current = playbackId;

    setError(null);
    onEndRef.current = onEnd ?? null;

    try {
      const audio = new Audio(normalized);
      audioRef.current = audio;

      audio.onended = () => {
        finalizePlayback(true, playbackId);
      };

      audio.onerror = () => {
        if (playbackIdRef.current !== playbackId) return;
        setError(AUDIO_ERROR_MESSAGE);
        finalizePlayback(false, playbackId);
      };

      onStart?.();
      await audio.play();
    } catch (err: unknown) {
      if (playbackIdRef.current !== playbackId) return;
      setError(AUDIO_ERROR_MESSAGE);
      finalizePlayback(false, playbackId);
      console.error('Audio URL playback failed', err);
    }
  };

  useEffect(() => {
    return () => {
      stop(false);
      if (contextRef.current) {
        contextRef.current.close().catch(() => {});
        contextRef.current = null;
      }
    };
  }, []);

  return { speak, playUrl, stop, error };
}
