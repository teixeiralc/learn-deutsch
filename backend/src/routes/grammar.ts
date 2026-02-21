import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/grammar-topics
router.get('/', (req, res) => {
  const { level } = req.query;
  let query = 'SELECT * FROM grammar_topics WHERE 1=1';
  const params: unknown[] = [];
  if (level) { query += ' AND level = ?'; params.push(level); }
  query += ' ORDER BY level ASC, name ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/grammar-topics/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM grammar_topics WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

export default router;
