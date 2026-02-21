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

-- Story tracks and chapters for Road mode
CREATE TABLE IF NOT EXISTS story_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL REFERENCES story_tracks(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK(level IN ('A1', 'A2', 'B1', 'B2')),
  chapter_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  UNIQUE(track_id, level)
);

CREATE TABLE IF NOT EXISTS story_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES story_chapters(id) ON DELETE CASCADE,
  turn_order INTEGER NOT NULL,
  speaker TEXT NOT NULL CHECK(speaker IN ('A', 'B')),
  german TEXT NOT NULL,
  english TEXT NOT NULL,
  focus_word TEXT NOT NULL,
  UNIQUE(chapter_id, turn_order)
);

CREATE TABLE IF NOT EXISTS road_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES story_chapters(id) ON DELETE CASCADE,
  node_order INTEGER NOT NULL,
  node_type TEXT NOT NULL CHECK(node_type IN ('vocab', 'context', 'conversation')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  UNIQUE(chapter_id, node_order)
);

CREATE TABLE IF NOT EXISTS road_progress (
  node_id INTEGER PRIMARY KEY REFERENCES road_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unlocked' CHECK(status IN ('unlocked', 'in_progress', 'completed')),
  stars INTEGER NOT NULL DEFAULT 0,
  best_score REAL NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS road_skill_progress (
  node_id INTEGER PRIMARY KEY REFERENCES road_nodes(id) ON DELETE CASCADE,
  reading_correct INTEGER NOT NULL DEFAULT 0,
  reading_total INTEGER NOT NULL DEFAULT 0,
  listening_correct INTEGER NOT NULL DEFAULT 0,
  listening_total INTEGER NOT NULL DEFAULT 0,
  speaking_correct INTEGER NOT NULL DEFAULT 0,
  speaking_total INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS road_node_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id INTEGER NOT NULL REFERENCES road_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
  current_index INTEGER NOT NULL DEFAULT 0,
  exercise_sequence TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  reading_correct INTEGER NOT NULL DEFAULT 0,
  reading_total INTEGER NOT NULL DEFAULT 0,
  listening_correct INTEGER NOT NULL DEFAULT 0,
  listening_total INTEGER NOT NULL DEFAULT 0,
  speaking_correct INTEGER NOT NULL DEFAULT 0,
  speaking_total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
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
CREATE INDEX IF NOT EXISTS idx_story_chapters_level_order ON story_chapters(level, chapter_order);
CREATE INDEX IF NOT EXISTS idx_story_turns_chapter_order ON story_turns(chapter_id, turn_order);
CREATE INDEX IF NOT EXISTS idx_road_nodes_chapter_order ON road_nodes(chapter_id, node_order);
CREATE INDEX IF NOT EXISTS idx_road_skill_progress_updated ON road_skill_progress(updated_at);
CREATE INDEX IF NOT EXISTS idx_road_node_runs_node_status ON road_node_runs(node_id, status);
CREATE INDEX IF NOT EXISTS idx_road_node_runs_updated ON road_node_runs(updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_road_node_runs_active_unique ON road_node_runs(node_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_vocab_progress_review ON vocabulary_progress(next_review_date);
CREATE INDEX IF NOT EXISTS idx_mistakes_created ON mistakes(created_at);
