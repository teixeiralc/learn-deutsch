import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';

const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';
const DEFAULT_SPEED = 0.78;
const DEFAULT_CACHE_DIR = './tts-cache';
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

interface TtsConfig {
  apiKey: string | undefined;
  voiceId: string;
  modelId: string;
  outputFormat: string;
  speed: number;
  cacheDir: string;
}

function resolveTtsConfig(voiceIdOverride?: string): TtsConfig {
  const apiKey = process.env.ELEVENLABS_API_KEY;

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
    cacheDir: resolve(process.env.TTS_CACHE_DIR || DEFAULT_CACHE_DIR),
  };
}

function normalizeSpeechText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function getOutputFormatExtension(outputFormat: string): string {
  const normalized = outputFormat.toLowerCase();
  if (normalized.startsWith('mp3')) return 'mp3';
  if (normalized.startsWith('pcm')) return 'pcm';
  if (normalized.startsWith('ulaw')) return 'ulaw';
  if (normalized.startsWith('wav')) return 'wav';
  return 'audio';
}

function getOutputContentType(outputFormat: string): string {
  const normalized = outputFormat.toLowerCase();
  if (normalized.startsWith('mp3')) return 'audio/mpeg';
  if (normalized.startsWith('pcm')) return 'audio/pcm';
  if (normalized.startsWith('ulaw')) return 'audio/basic';
  if (normalized.startsWith('wav')) return 'audio/wav';
  return 'application/octet-stream';
}

function resolveCacheFilePath(text: string, config: TtsConfig): string {
  const payload = JSON.stringify({
    text,
    voiceId: config.voiceId,
    modelId: config.modelId,
    outputFormat: config.outputFormat,
    speed: config.speed,
  });
  const cacheKey = createHash('sha256').update(payload).digest('hex');
  const extension = getOutputFormatExtension(config.outputFormat);
  return resolve(config.cacheDir, `${cacheKey}.${extension}`);
}

async function readCachedAudio(cachePath: string): Promise<Buffer | null> {
  try {
    const cached = await readFile(cachePath);
    return cached.length ? cached : null;
  } catch (error: unknown) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code === 'ENOENT') return null;
    console.warn('Failed to read TTS cache entry', {
      cachePath,
      error: errno.message,
    });
    return null;
  }
}

async function writeCachedAudio(cachePath: string, audioBuffer: Buffer): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, audioBuffer);
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
  const text = normalizeSpeechText(input.text);
  if (!text) {
    throw new TTSServiceError(400, 'text is required');
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new TTSServiceError(400, `text is too long (max ${MAX_TEXT_LENGTH} characters)`);
  }

  const config = resolveTtsConfig(input.voiceId);
  const cachePath = resolveCacheFilePath(text, config);
  const cachedAudio = await readCachedAudio(cachePath);
  if (cachedAudio) {
    return {
      audioBuffer: cachedAudio,
      contentType: getOutputContentType(config.outputFormat),
    };
  }

  if (!config.apiKey) {
    throw new TTSServiceError(503, 'TTS is not configured. Add ELEVENLABS_API_KEY to backend env.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': config.apiKey,
        'Content-Type': 'application/json',
        Accept: getOutputContentType(config.outputFormat),
      },
      body: JSON.stringify({
        text,
        model_id: config.modelId,
        output_format: config.outputFormat,
        voice_settings: {
          speed: config.speed,
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

    try {
      await writeCachedAudio(cachePath, audioBuffer);
    } catch (error: unknown) {
      console.warn('Failed to persist TTS cache entry', {
        cachePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      audioBuffer,
      contentType: response.headers.get('content-type') ?? getOutputContentType(config.outputFormat),
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
