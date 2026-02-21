import { useCallback, useRef, useState } from 'react';

interface SpeechRecognitionHook {
  transcript: string;
  isListening: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
  isSupported: boolean;
}

// Extended types for Web Speech API (not fully typed in lib.dom.d.ts)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

export function useSpeechRecognition(lang = 'de-DE'): SpeechRecognitionHook {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<{ start(): void; stop(): void; abort(): void } | null>(null);

  const isSupported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setIsListening(true); setError(null); };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: { error: string }) => {
      setIsListening(false);
      if (e.error !== 'no-speech') setError(`Mic error: ${e.error}`);
    };
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const result = e.results[0]?.[0]?.transcript ?? '';
      setTranscript(result);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    setTranscript('');
    setIsListening(false);
    setError(null);
  }, []);

  return { transcript, isListening, error, startListening, stopListening, reset, isSupported };
}
