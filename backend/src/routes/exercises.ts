import { Router } from 'express';
import { generateExercises } from '../services/exercise-generator.js';
import { updateVocabularyProgress, correctAnswerXP, getStats } from '../services/learning-engine.js';
import { computeSimilarity, compareTokens, normalizeString } from '../services/levenshtein.js';
import db from '../db/database.js';
import type {
  Level,
  GenerateExercisesRequest,
  SubmitAnswerRequest,
  EvaluateSpeakingRequest,
} from '../types/index.js';

const router = Router();

// POST /api/exercises/generate
router.post('/generate', (req, res) => {
  const { level, count = 5 } = req.body as GenerateExercisesRequest & { count?: number };
  if (!level) return res.status(400).json({ error: 'level is required' });

  try {
    const exercises = generateExercises(level as Level, count);
    res.json(exercises);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate exercises';
    res.status(500).json({ error: message });
  }
});

// POST /api/exercises/submit
router.post('/submit', (req, res) => {
  const { type, vocabulary_id, sentence_id, user_answer, correct_answer } = req.body as SubmitAnswerRequest;

  if (!type || user_answer === undefined || !correct_answer) {
    return res.status(400).json({ error: 'type, user_answer, correct_answer are required' });
  }

  const similarity = computeSimilarity(user_answer, correct_answer);

  // Sentence building: order matters — check normalized joined string
  let is_correct: boolean;
  if (type === 'sentence_building') {
    // user_answer may come as space-joined tokens
    is_correct = normalizeString(user_answer) === normalizeString(correct_answer);
  } else {
    is_correct = similarity >= 0.85;
  }

  // Update spaced repetition if word-based
  if (vocabulary_id) {
    updateVocabularyProgress(vocabulary_id, is_correct);
  }

  // Award XP
  if (is_correct) correctAnswerXP();

  // Log mistake if wrong
  if (!is_correct) {
    db.prepare(`
      INSERT INTO mistakes (exercise_type, vocabulary_id, sentence_id, user_answer, correct_answer, similarity_score, mistake_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      type,
      vocabulary_id ?? null,
      sentence_id ?? null,
      user_answer,
      correct_answer,
      similarity,
      similarity >= 0.6 ? 'partial' : 'wrong_answer'
    );
  }

  const stats = getStats();

  res.json({
    is_correct,
    similarity_score: Math.round(similarity * 100),
    explanation: is_correct
      ? '✓ Correct!'
      : `The correct answer was: "${correct_answer}"`,
    xp_earned: is_correct ? 10 : 0,
    total_xp: stats.total_xp,
  });
});

// POST /api/exercises/evaluate-speaking
router.post('/evaluate-speaking', (req, res) => {
  const { expected_sentence, user_transcript } = req.body as EvaluateSpeakingRequest;
  if (!expected_sentence || !user_transcript) {
    return res.status(400).json({ error: 'expected_sentence and user_transcript required' });
  }

  const similarity = computeSimilarity(expected_sentence, user_transcript);
  const token_comparison = compareTokens(expected_sentence, user_transcript);
  const is_correct = similarity >= 0.90;
  const score = Math.round(similarity * 100);

  let feedback: string;
  if (similarity >= 0.90) feedback = '🎉 Excellent pronunciation!';
  else if (similarity >= 0.75) feedback = `Almost! ${score}% match. Listen carefully to the differences.`;
  else feedback = `Keep practicing! ${score}% match. Try again slowly.`;

  res.json({ is_correct, similarity_score: score, feedback, token_comparison });
});

// GET /api/exercises/mistakes
router.get('/mistakes', (req, res) => {
  const { limit = 20 } = req.query;
  const rows = db.prepare(`
    SELECT m.*, v.german, v.english FROM mistakes m
    LEFT JOIN vocabulary v ON m.vocabulary_id = v.id
    ORDER BY m.created_at DESC LIMIT ?
  `).all(Number(limit));
  res.json(rows);
});

export default router;
