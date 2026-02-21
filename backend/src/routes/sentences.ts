import { Router } from 'express';
import db from '../db/database.js';
import type { Sentence } from '../types/index.js';

const router = Router();

// GET /api/sentences
router.get('/', (req, res) => {
  const { level } = req.query;
  let query = 'SELECT * FROM sentences WHERE 1=1';
  const params: unknown[] = [];
  if (level) { query += ' AND difficulty_level = ?'; params.push(level); }
  query += ' ORDER BY id ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/sentences/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sentences WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  // Also return linked vocabulary
  const vocab = db.prepare(`
    SELECT v.* FROM vocabulary v
    JOIN sentence_vocabulary sv ON v.id = sv.vocabulary_id
    WHERE sv.sentence_id = ?
  `).all(req.params.id);

  res.json({ ...(row as object), vocabulary: vocab });
});

// POST /api/sentences
router.post('/', (req, res) => {
  const { german, english, difficulty_level, source = 'manual' } = req.body as Partial<Sentence> & { source?: string };
  if (!german || !english || !difficulty_level) {
    return res.status(400).json({ error: 'german, english, difficulty_level required' });
  }
  const result = db.prepare(`
    INSERT INTO sentences (german, english, difficulty_level, source) VALUES (?, ?, ?, ?)
  `).run(german, english, difficulty_level, source);
  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
