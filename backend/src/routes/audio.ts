import { Router } from 'express';
import { accessSync, constants } from 'fs';
import { basename, resolve } from 'path';

const router = Router();

function getAudioBasePath(): string {
  return resolve(process.env.ANKI_MEDIA_PATH || './anki-media');
}

router.get('/:filename', (req, res) => {
  let requested = '';
  try {
    requested = decodeURIComponent(req.params.filename || '').trim();
  } catch {
    return res.status(400).json({ error: 'Invalid audio filename' });
  }
  const safeFilename = basename(requested);

  if (!requested || safeFilename !== requested) {
    return res.status(400).json({ error: 'Invalid audio filename' });
  }

  const absolutePath = resolve(getAudioBasePath(), safeFilename);

  try {
    accessSync(absolutePath, constants.R_OK);
  } catch {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  res.sendFile(absolutePath);
});

export default router;
