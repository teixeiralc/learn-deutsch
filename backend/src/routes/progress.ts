import { Router } from 'express';
import db from '../db/database.js';
import { getStats, completeLessonXP, recordLessonProgress } from '../services/learning-engine.js';
import type { Level } from '../types/index.js';

const router = Router();

// GET /api/stats
router.get('/stats', (_req, res) => {
  res.json(getStats());
});

// GET /api/progress/vocabulary
router.get('/vocabulary', (req, res) => {
  const { level } = req.query;
  let query = `
    SELECT v.id, v.german, v.english, v.level, v.part_of_speech, v.gender,
           vp.strength_score, vp.interval, vp.ease_factor, vp.next_review_date,
           vp.correct_count, vp.incorrect_count, vp.repetition_count
    FROM vocabulary v
    LEFT JOIN vocabulary_progress vp ON v.id = vp.vocabulary_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (level) { query += ' AND v.level = ?'; params.push(level); }
  query += ' ORDER BY vp.strength_score ASC NULLS FIRST, v.id ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/progress/lessons
router.get('/lessons', (_req, res) => {
  const results = db.prepare(`
    SELECT lesson_level,
           MAX(score) as best_score,
           MAX(total_exercises) as total_exercises,
           SUM(xp_earned) as total_xp_earned,
           COUNT(*) as attempts,
           MAX(last_attempt) as last_attempt
    FROM lesson_progress
    GROUP BY lesson_level
    ORDER BY lesson_level ASC
  `).all();
  res.json(results);
});

// GET /api/progress/mistakes
router.get('/mistakes', (req, res) => {
  const { limit = 50 } = req.query;
  const rows = db.prepare(`
    SELECT m.*, v.german, v.english FROM mistakes m
    LEFT JOIN vocabulary v ON m.vocabulary_id = v.id
    ORDER BY m.created_at DESC LIMIT ?
  `).all(Number(limit));
  res.json(rows);
});

// POST /api/progress/complete-lesson
router.post('/complete-lesson', (req, res) => {
  const { level, score, total_exercises } = req.body as {
    level: Level;
    score: number;
    total_exercises: number;
  };
  if (!level || score === undefined || !total_exercises) {
    return res.status(400).json({ error: 'level, score, total_exercises required' });
  }

  const xp = 50 + (score / total_exercises) * 50; // 50 base + up to 50 bonus
  const xpEarned = Math.round(xp);

  recordLessonProgress(level, score, total_exercises, xpEarned);
  const stats = completeLessonXP();

  res.json({
    xp_earned: xpEarned,
    total_xp: stats.total_xp,
    streak: stats.streak,
    sessions_completed: stats.sessions_completed,
  });
});

export default router;
