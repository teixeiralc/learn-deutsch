import { Router } from 'express';
import db from '../db/database.js';
import type { Level, Vocabulary } from '../types/index.js';

const router = Router();

// GET /api/vocabulary
router.get('/', (req, res) => {
  const { level, search } = req.query;
  let query = 'SELECT * FROM vocabulary WHERE 1=1';
  const params: unknown[] = [];

  if (level) { query += ' AND level = ?'; params.push(level); }
  if (search) { query += ' AND (german LIKE ? OR english LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY frequency_rank ASC NULLS LAST, id ASC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// GET /api/vocabulary/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// GET /api/vocabulary/:id/progress
router.get('/:id/progress', (req, res) => {
  const row = db.prepare('SELECT * FROM vocabulary_progress WHERE vocabulary_id = ?').get(req.params.id);
  res.json(row || null);
});

// POST /api/vocabulary
router.post('/', (req, res) => {
  const { german, english, part_of_speech = 'noun', gender, plural, level, frequency_rank, tags } = req.body as Partial<Vocabulary>;
  if (!german || !english || !level) {
    return res.status(400).json({ error: 'german, english, level are required' });
  }
  const result = db.prepare(`
    INSERT INTO vocabulary (german, english, part_of_speech, gender, plural, level, frequency_rank, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(german, english, part_of_speech, gender ?? null, plural ?? null, level, frequency_rank ?? null, JSON.stringify(tags ?? []));

  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE /api/vocabulary/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vocabulary WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
