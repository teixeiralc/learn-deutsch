import { Router } from 'express';
import { synthesizeSpeech, TTSServiceError } from '../services/tts.js';

const router = Router();

// POST /api/tts
router.post('/', async (req, res) => {
  const { text, voiceId } = req.body as { text?: string; voiceId?: string };

  try {
    const { audioBuffer, contentType } = await synthesizeSpeech({
      text: text ?? '',
      voiceId,
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.send(audioBuffer);
  } catch (error: unknown) {
    if (error instanceof TTSServiceError) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('TTS route failed', error);
    return res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

export default router;
