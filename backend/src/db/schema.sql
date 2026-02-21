-- Vocabulary: German words with enrichment
CREATE TABLE IF NOT EXISTS vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  german TEXT NOT NULL,
  english TEXT NOT NULL,
  part_of_speech TEXT NOT NULL DEFAULT 'noun', -- noun, verb, adjective, adverb, preposition, conjunction, pronoun
  gender TEXT, -- der, die, das
  plural TEXT,
  level TEXT NOT NULL CHECK(level IN ('A1', 'A2', 'B1', 'B2')),
  frequency_rank INTEGER,
  tags TEXT DEFAULT '[]', -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(german, level)
);

-- One-to-many normalized meanings for each vocabulary item
CREATE TABLE IF NOT EXISTS vocabulary_meanings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  meaning TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(vocabulary_id, meaning)
);

-- Optional metadata extracted from source decks/importers
CREATE TABLE IF NOT EXISTS vocabulary_metadata (
  vocabulary_id INTEGER PRIMARY KEY REFERENCES vocabulary(id) ON DELETE CASCADE,
  audio_filename TEXT,
  grammar_info TEXT,
  related_words TEXT DEFAULT '[]', -- JSON array
  source_note_id INTEGER
);

-- German/English sentence pairs
CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  german TEXT NOT NULL,
  english TEXT NOT NULL,
  difficulty_level TEXT NOT NULL CHECK(difficulty_level IN ('A1', 'A2', 'B1', 'B2')),
  source TEXT DEFAULT 'manual', -- manual, tatoeba, goethe
  created_at TEXT DEFAULT (datetime('now'))
);

-- Many-to-many: sentences <-> vocabulary
CREATE TABLE IF NOT EXISTS sentence_vocabulary (
  sentence_id INTEGER NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  PRIMARY KEY (sentence_id, vocabulary_id)
);

-- Grammar topics with explanations
CREATE TABLE IF NOT EXISTS grammar_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('A1', 'A2', 'B1', 'B2')),
  explanation TEXT NOT NULL,
  examples TEXT DEFAULT '[]' -- JSON array of example sentences
);

-- SM-2 spaced repetition per vocabulary word
CREATE TABLE IF NOT EXISTS vocabulary_progress (
  vocabulary_id INTEGER PRIMARY KEY REFERENCES vocabulary(id) ON DELETE CASCADE,
  repetition_count INTEGER NOT NULL DEFAULT 0,
  interval INTEGER NOT NULL DEFAULT 1, -- days until next review
  ease_factor REAL NOT NULL DEFAULT 2.5,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  strength_score REAL NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
  last_seen TEXT,
  next_review_date TEXT NOT NULL DEFAULT (date('now'))
);

-- Lesson-level progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_level TEXT NOT NULL CHECK(lesson_level IN ('A1', 'A2', 'B1', 'B2')),
  score INTEGER NOT NULL DEFAULT 0,
  total_exercises INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  last_attempt TEXT DEFAULT (datetime('now'))
);

-- Mistake log for review
CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_type TEXT NOT NULL,
  vocabulary_id INTEGER REFERENCES vocabulary(id) ON DELETE SET NULL,
  sentence_id INTEGER REFERENCES sentences(id) ON DELETE SET NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  similarity_score REAL,
  mistake_type TEXT, -- wrong_answer, partial, typo
  created_at TEXT DEFAULT (datetime('now'))
);

-- Single-row user stats
CREATE TABLE IF NOT EXISTS user_stats (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  total_xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_practice_date TEXT,
  sessions_completed INTEGER NOT NULL DEFAULT 0
);

-- Insert the single user_stats row
INSERT OR IGNORE INTO user_stats (id) VALUES (1);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocabulary_level ON vocabulary(level);
CREATE INDEX IF NOT EXISTS idx_vocab_meanings_vocab_id ON vocabulary_meanings(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_sentences_level ON sentences(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_review ON vocabulary_progress(next_review_date);
CREATE INDEX IF NOT EXISTS idx_mistakes_created ON mistakes(created_at);
