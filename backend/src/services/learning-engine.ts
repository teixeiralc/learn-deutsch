import db from '../db/database.js';
import type { VocabularyProgress, Level, UserStats } from '../types/index.js';

const XP_PER_CORRECT = 10;
const XP_PER_LESSON = 50;

// ─── SM-2 Algorithm ───────────────────────────────────────────────────────────

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.max(1, Math.round(days)));
  return d.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function updateVocabularyProgress(vocabId: number, isCorrect: boolean): void {
  // Get current progress or initialize
  let progress = db
    .prepare('SELECT * FROM vocabulary_progress WHERE vocabulary_id = ?')
    .get(vocabId) as VocabularyProgress | undefined;

  if (!progress) {
    db.prepare(
      `INSERT INTO vocabulary_progress (vocabulary_id) VALUES (?)`
    ).run(vocabId);
    progress = db
      .prepare('SELECT * FROM vocabulary_progress WHERE vocabulary_id = ?')
      .get(vocabId) as VocabularyProgress;
  }

  let { repetition_count, interval, ease_factor, correct_count, incorrect_count } = progress;
  const today = todayISO();

  if (isCorrect) {
    correct_count++;
    repetition_count++;
    // SM-2: interval progression
    if (repetition_count === 1) {
      interval = 1;
    } else if (repetition_count === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease_factor);
    }
    ease_factor = Math.min(2.5, ease_factor + 0.1);
  } else {
    incorrect_count++;
    repetition_count = 0;
    interval = 1;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  }

  const strength_score = Math.min(
    1.0,
    correct_count / Math.max(1, correct_count + incorrect_count)
  );
  const next_review_date = addDays(today, interval);

  db.prepare(`
    UPDATE vocabulary_progress
    SET repetition_count = ?, interval = ?, ease_factor = ?,
        correct_count = ?, incorrect_count = ?, strength_score = ?,
        last_seen = ?, next_review_date = ?
    WHERE vocabulary_id = ?
  `).run(
    repetition_count, interval, ease_factor,
    correct_count, incorrect_count, strength_score,
    today, next_review_date, vocabId
  );
}

export function ensureVocabProgressRows(vocabIds: number[]): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO vocabulary_progress (vocabulary_id) VALUES (?)`
  );
  const insertMany = db.transaction((ids: number[]) => {
    for (const id of ids) insert.run(id);
  });
  insertMany(vocabIds);
}

// ─── Vocabulary Selection ─────────────────────────────────────────────────────

export function getWordsForReview(level: Level, limit: number = 10) {
  const today = todayISO();
  // Words due for review today (SM-2 queue)
  const dueWords = db.prepare(`
    SELECT v.*, vp.strength_score, vp.interval, vp.ease_factor, vp.next_review_date
    FROM vocabulary v
    JOIN vocabulary_progress vp ON v.id = vp.vocabulary_id
    WHERE v.level = ? AND vp.next_review_date <= ?
    ORDER BY vp.next_review_date ASC, vp.strength_score ASC
    LIMIT ?
  `).all(level, today, limit) as any[];

  if (dueWords.length >= limit) return dueWords;

  // Fall back to new words not yet in progress
  const remaining = limit - dueWords.length;
  const seenIds = dueWords.map(w => w.id);
  const placeholders = seenIds.length > 0 ? `AND v.id NOT IN (${seenIds.join(',')})` : '';

  const newWords = db.prepare(`
    SELECT v.*, 0 as strength_score, 1 as interval, 2.5 as ease_factor
    FROM vocabulary v
    LEFT JOIN vocabulary_progress vp ON v.id = vp.vocabulary_id
    WHERE v.level = ? AND vp.vocabulary_id IS NULL ${placeholders}
    ORDER BY v.frequency_rank ASC NULLS LAST, v.id ASC
    LIMIT ?
  `).all(level, remaining) as any[];

  return [...dueWords, ...newWords];
}

// ─── XP & Streak ─────────────────────────────────────────────────────────────

export function awardXP(amount: number): UserStats {
  db.prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(amount);
  return getStats();
}

export function updateStreak(): UserStats {
  const stats = getStats();
  const today = todayISO();
  const yesterday = addDays(today, -1);

  let newStreak = stats.streak;
  if (stats.last_practice_date === today) {
    // Already practiced today — no change
  } else if (stats.last_practice_date === yesterday) {
    newStreak++;
  } else {
    newStreak = 1; // reset
  }

  const longest = Math.max(stats.longest_streak, newStreak);
  db.prepare(`
    UPDATE user_stats
    SET streak = ?, longest_streak = ?, last_practice_date = ?
    WHERE id = 1
  `).run(newStreak, longest, today);

  return getStats();
}

export function completeLessonXP(): UserStats {
  const after = awardXP(XP_PER_LESSON);
  db.prepare('UPDATE user_stats SET sessions_completed = sessions_completed + 1 WHERE id = 1').run();
  updateStreak();
  return after;
}

export function correctAnswerXP(): void {
  awardXP(XP_PER_CORRECT);
}

export function getStats(): UserStats {
  return db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as UserStats;
}

export function recordLessonProgress(
  level: Level,
  score: number,
  total: number,
  xp: number
): void {
  db.prepare(`
    INSERT INTO lesson_progress (lesson_level, score, total_exercises, xp_earned)
    VALUES (?, ?, ?, ?)
  `).run(level, score, total, xp);
}
