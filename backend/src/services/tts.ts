const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';
const DEFAULT_SPEED = 0.78;
const MAX_TEXT_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 15000;

export class TTSServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface SynthesizeSpeechInput {
  text: string;
  voiceId?: string;
}

export interface SynthesizeSpeechResult {
  audioBuffer: Buffer;
  contentType: string;
}

function resolveTtsConfig(voiceIdOverride?: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new TTSServiceError(503, 'TTS is not configured. Add ELEVENLABS_API_KEY to backend env.');
  }

  const parsedSpeed = Number(process.env.ELEVENLABS_SPEED);
  const speed = Number.isFinite(parsedSpeed)
    ? Math.min(1.2, Math.max(0.7, parsedSpeed))
    : DEFAULT_SPEED;

  return {
    apiKey,
    voiceId: voiceIdOverride ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID,
    modelId: process.env.ELEVENLABS_MODEL_ID ?? DEFAULT_MODEL_ID,
    outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT ?? DEFAULT_OUTPUT_FORMAT,
    speed,
  };
}

function parseElevenLabsError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      detail?: { message?: string } | string;
      message?: string;
      error?: string;
    };
    if (typeof parsed.detail === 'string') return parsed.detail;
    if (parsed.detail?.message) return parsed.detail.message;
    if (parsed.message) return parsed.message;
    if (parsed.error) return parsed.error;
  } catch {
    // noop
  }
  return raw;
}

export async function synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
  const text = input.text.trim();
  if (!text) {
    throw new TTSServiceError(400, 'text is required');
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new TTSServiceError(400, `text is too long (max ${MAX_TEXT_LENGTH} characters)`);
  }

  const { apiKey, voiceId, modelId, outputFormat, speed } = resolveTtsConfig(input.voiceId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        output_format: outputFormat,
        voice_settings: {
          speed,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const rawError = await response.text();
      const detail = parseElevenLabsError(rawError);
      throw new TTSServiceError(502, `ElevenLabs request failed: ${detail || response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    if (!audioBuffer.length) {
      throw new TTSServiceError(502, 'ElevenLabs returned empty audio');
    }

    return {
      audioBuffer,
      contentType: response.headers.get('content-type') ?? 'audio/mpeg',
    };
  } catch (error: unknown) {
    if (error instanceof TTSServiceError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TTSServiceError(504, 'TTS request timed out');
    }
    throw new TTSServiceError(502, 'Failed to reach ElevenLabs TTS');
  } finally {
    clearTimeout(timeout);
  }
}
