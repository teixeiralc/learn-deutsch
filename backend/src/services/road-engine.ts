import db from '../db/database.js';
import type { GeneratedExercise, Level } from '../types/index.js';
import { ensureRoadData } from './road-seed.js';

type NodeType = 'vocab' | 'context' | 'conversation';
type NodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
type Modality = 'recall' | 'listening' | 'speaking' | 'review';
type Interaction = 'recognition' | 'cloze' | 'reorder' | 'dictation' | 'shadowing' | 'production' | 'confusable' | 'fun';

const LEVEL_RANK: Record<Level, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
};

const SESSION_EXERCISE_CAP = 28;
const REPEAT_WINDOW = 8;
const NEW_ITEM_MIN_RATIO = 0.1;
const NEW_ITEM_MAX_RATIO = 0.2;
const ROAD_SEQUENCE_VERSION = 7;

const MODALITY_TARGET_RATIO: Record<Modality, number> = {
  recall: 0.3,
  listening: 0.3,
  speaking: 0.2,
  review: 0.2,
};

interface RoadNodeRow {
  id: number;
  node_order: number;
  node_type: NodeType;
  title: string;
  description: string;
  chapter_id: number;
  level: Level;
  chapter_order: number;
  chapter_title: string;
  chapter_description: string;
  story_track_slug: string;
  story_track_title: string;
}

interface StoryTurnRow {
  id: number;
  chapter_id: number;
  turn_order: number;
  speaker: 'A' | 'B';
  german: string;
  english: string;
  focus_word: string;
}

interface RoadProgressRow {
  node_id: number;
  status: 'unlocked' | 'in_progress' | 'completed';
  stars: number;
  best_score: number;
  attempts: number;
}

interface RoadSkillProgressRow {
  node_id: number;
  reading_correct: number;
  reading_total: number;
  listening_correct: number;
  listening_total: number;
  speaking_correct: number;
  speaking_total: number;
}

interface RoadNodeRunRow {
  id: number;
  node_id: number;
  status: 'active' | 'completed' | 'abandoned';
  current_index: number;
  exercise_sequence: string;
  correct_count: number;
  total_count: number;
  reading_correct: number;
  reading_total: number;
  listening_correct: number;
  listening_total: number;
  speaking_correct: number;
  speaking_total: number;
}

interface VocabularyProgressRow {
  strength_score: number | null;
  repetition_count: number | null;
  next_review_date: string | null;
  correct_count: number | null;
  incorrect_count: number | null;
}

interface ChunkWordStat {
  word: string;
  vocabId?: number;
  englishHint: string;
  strength: number;
  repetition: number;
  dueUrgency: number;
  failRate: number;
}

interface ChunkDescriptor {
  key: string;
  text: string;
  words: string[];
  englishHint: string;
  wordStats: ChunkWordStat[];
  isNew: boolean;
  stability: number;
  dueUrgency: number;
  recentFail: number;
  unitRelevance: number;
  turnOrder: number;
}

interface ExerciseCandidate {
  candidateKey: string;
  itemKey: string;
  turnOrder: number;
  modality: Modality;
  interaction: Interaction;
  isNew: boolean;
  isFun: boolean;
  dueUrgency: number;
  recentFail: number;
  unitRelevance: number;
  levelFit: number;
  inputSize: number;
  confusionPenalty: number;
  noveltyBoost: number;
  newConceptKey?: string;
  exercise: GeneratedExercise;
}

interface SelectedCandidateMeta {
  itemKey: string;
  modality: Modality;
  interaction: Interaction;
  isNew: boolean;
  isFun: boolean;
  predictedSuccess: number;
}

interface SelectorState {
  selected: SelectedCandidateMeta[];
  newItemsUsed: number;
  selectedSelectableCount: number;
  targetSelectableCount: number;
  minNewItems: number;
  maxNewItems: number;
  selectableModalityCounts: Record<Modality, number>;
  targetSelectableModalityCounts: Record<Modality, number>;
  seenNewConceptKeys: Set<string>;
}

export interface RoadNodeSummary {
  id: number;
  node_order: number;
  node_type: NodeType;
  title: string;
  description: string;
  chapter_id: number;
  chapter_order: number;
  chapter_title: string;
  chapter_description: string;
  story_track_slug: string;
  story_track_title: string;
  status: NodeStatus;
  unlocked: boolean;
  stars: number;
  best_score: number;
  attempts: number;
}

export interface RoadTurn {
  turn_order: number;
  speaker: 'A' | 'B';
  german: string;
  english: string;
  focus_word: string;
}

export interface StartRoadNodeResponse {
  node: RoadNodeSummary;
  turns: RoadTurn[];
  exercises: GeneratedExercise[];
  run_id: number;
  current_index: number;
}

export interface RoadMapResponse {
  level: Level;
  nodes: RoadNodeSummary[];
  page: number;
  page_size: number;
  total_pages: number;
  total_stories: number;
  visible_stories: number;
  completed_stories: number;
  total_nodes: number;
  completed_nodes: number;
  remaining_nodes: number;
  hide_completed: boolean;
}

export interface RoadCheckpointInput {
  run_id: number;
  exercise_index: number;
  is_correct: boolean;
  exercise_type: string;
}

export interface RoadCheckpointResponse {
  run_id: number;
  current_index: number;
  is_last: boolean;
}

export interface RoadCompletionInput {
  run_id?: number;
  correct?: number;
  total?: number;
  reading_correct?: number;
  reading_total?: number;
  listening_correct?: number;
  listening_total?: number;
  speaking_correct?: number;
  speaking_total?: number;
}

export interface RoadMapOptions {
  page?: number;
  pageSize?: number;
  hideCompleted?: boolean;
}

const selectNodeRowsByLevel = db.prepare(`
  SELECT
    rn.id,
    rn.node_order,
    rn.node_type,
    rn.title,
    rn.description,
    rn.chapter_id,
    sc.level,
    sc.chapter_order,
    sc.title as chapter_title,
    sc.description as chapter_description,
    st.slug as story_track_slug,
    st.title as story_track_title
  FROM road_nodes rn
  JOIN story_chapters sc ON sc.id = rn.chapter_id
  JOIN story_tracks st ON st.id = sc.track_id
  WHERE sc.level = ?
  ORDER BY sc.chapter_order ASC, rn.node_order ASC
`);

const selectProgressRows = db.prepare(`
  SELECT node_id, status, stars, best_score, attempts
  FROM road_progress
  WHERE node_id IN (
    SELECT rn.id
    FROM road_nodes rn
    JOIN story_chapters sc ON sc.id = rn.chapter_id
    WHERE sc.level = ?
  )
`);

const selectNodeById = db.prepare(`
  SELECT
    rn.id,
    rn.node_order,
    rn.node_type,
    rn.title,
    rn.description,
    rn.chapter_id,
    sc.level,
    sc.chapter_order,
    sc.title as chapter_title,
    sc.description as chapter_description,
    st.slug as story_track_slug,
    st.title as story_track_title
  FROM road_nodes rn
  JOIN story_chapters sc ON sc.id = rn.chapter_id
  JOIN story_tracks st ON st.id = sc.track_id
  WHERE rn.id = ?
`);

const selectTurnsByChapter = db.prepare(`
  SELECT id, chapter_id, turn_order, speaker, german, english, focus_word
  FROM story_turns
  WHERE chapter_id = ?
  ORDER BY turn_order ASC
`);

const selectSentenceByGermanAndLevel = db.prepare(`
  SELECT id
  FROM sentences
  WHERE german = ? AND difficulty_level = ?
  LIMIT 1
`);

const selectVocabByWord = db.prepare(`
  SELECT id, german, english, level
  FROM vocabulary
  WHERE lower(german) = lower(?)
`);

const selectProgressByVocabId = db.prepare(`
  SELECT strength_score, repetition_count, next_review_date, correct_count, incorrect_count
  FROM vocabulary_progress
  WHERE vocabulary_id = ?
`);

const upsertProgress = db.prepare(`
  INSERT INTO road_progress (node_id, status, stars, best_score, attempts, completed_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(node_id) DO UPDATE SET
    status = excluded.status,
    stars = excluded.stars,
    best_score = excluded.best_score,
    attempts = excluded.attempts,
    completed_at = excluded.completed_at,
    updated_at = datetime('now')
`);

const selectSingleProgress = db.prepare(`
  SELECT node_id, status, stars, best_score, attempts
  FROM road_progress
  WHERE node_id = ?
`);

const selectRoadSkillProgress = db.prepare(`
  SELECT
    node_id,
    reading_correct,
    reading_total,
    listening_correct,
    listening_total,
    speaking_correct,
    speaking_total
  FROM road_skill_progress
  WHERE node_id = ?
`);

const upsertRoadSkillProgress = db.prepare(`
  INSERT INTO road_skill_progress (
    node_id,
    reading_correct,
    reading_total,
    listening_correct,
    listening_total,
    speaking_correct,
    speaking_total,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(node_id) DO UPDATE SET
    reading_correct = excluded.reading_correct,
    reading_total = excluded.reading_total,
    listening_correct = excluded.listening_correct,
    listening_total = excluded.listening_total,
    speaking_correct = excluded.speaking_correct,
    speaking_total = excluded.speaking_total,
    updated_at = datetime('now')
`);

const selectActiveRunByNode = db.prepare(`
  SELECT
    id,
    node_id,
    status,
    current_index,
    exercise_sequence,
    correct_count,
    total_count,
    reading_correct,
    reading_total,
    listening_correct,
    listening_total,
    speaking_correct,
    speaking_total
  FROM road_node_runs
  WHERE node_id = ? AND status = 'active'
  ORDER BY id DESC
  LIMIT 1
`);

const selectRunById = db.prepare(`
  SELECT
    id,
    node_id,
    status,
    current_index,
    exercise_sequence,
    correct_count,
    total_count,
    reading_correct,
    reading_total,
    listening_correct,
    listening_total,
    speaking_correct,
    speaking_total
  FROM road_node_runs
  WHERE id = ?
  LIMIT 1
`);

const insertRun = db.prepare(`
  INSERT INTO road_node_runs (
    node_id,
    status,
    current_index,
    exercise_sequence,
    correct_count,
    total_count,
    reading_correct,
    reading_total,
    listening_correct,
    listening_total,
    speaking_correct,
    speaking_total,
    updated_at
  )
  VALUES (?, 'active', 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, datetime('now'))
`);

const updateRunCheckpoint = db.prepare(`
  UPDATE road_node_runs
  SET
    current_index = ?,
    correct_count = ?,
    total_count = ?,
    reading_correct = ?,
    reading_total = ?,
    listening_correct = ?,
    listening_total = ?,
    speaking_correct = ?,
    speaking_total = ?,
    updated_at = datetime('now')
  WHERE id = ?
`);

const markRunStatus = db.prepare(`
  UPDATE road_node_runs
  SET
    status = ?,
    completed_at = ?,
    updated_at = datetime('now')
  WHERE id = ?
`);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(arr: T[], seedKey: string): T[] {
  const copy = [...arr];
  const random = seededRandom(hashString(seedKey));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

let generatedExerciseCounter = 0;

function randomId(): string {
  generatedExerciseCounter += 1;
  return `road-ex-${generatedExerciseCounter}`;
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß]/gi, '');
}

function manualWordTranslation(word: string): string | null {
  const key = normalizeToken(word);
  const map: Record<string, string> = {
    hallo: 'hello',
    hi: 'hi',
    heute: 'today',
    wegen: 'because of',
    von: 'of',
    bei: 'at',
    fuer: 'for',
    fur: 'for',
    mit: 'with',
    ohne: 'without',
    nach: 'after / to',
    noch: 'still',
    dann: 'then',
    jetzt: 'now',
    sofort: 'immediately',
    klaren: 'clear',
    passende: 'suitable',
    kurz: 'briefly',
    gerne: 'gladly',
    gern: 'gladly',
    kein: 'no',
    problem: 'problem',
    danke: 'thanks',
    bitte: 'please',
    warte: 'wait',
    auf: 'on / for',
    um: 'at',
    im: 'in the',
    am: 'at the',
    an: 'at / on',
    in: 'in',
    zu: 'to',
    zum: 'to the',
    zur: 'to the',
    vom: 'from the',
    aus: 'from',
    der: 'the',
    die: 'the',
    das: 'the',
    den: 'the',
    dem: 'the',
    ein: 'a',
    eine: 'a',
    einen: 'a',
    einer: 'a',
    einem: 'a',
    ihnen: 'you',
    ihr: 'her / their',
    ihrer: 'your',
    ich: 'I',
    mich: 'me',
    mein: 'my',
    meine: 'my',
    meinen: 'my',
    meinem: 'my',
    sich: 'oneself',
    uns: 'us',
    euch: 'you all',
    du: 'you',
    er: 'he',
    sie: 'she / they',
    wir: 'we',
    bin: 'am',
    ist: 'is',
    sind: 'are',
    kann: 'can',
    koennen: 'can',
    koenne: 'can',
    moechte: 'would like',
    moegen: 'like',
    helfen: 'help',
    helfe: 'help',
    pruefen: 'review',
    geben: 'give',
    sende: 'send',
    dokumentieren: 'document',
    priorisieren: 'prioritize',
    stimmen: 'align',
    suche: 'search',
    suchen: 'search',
    brauchen: 'need',
    brauche: 'need',
    melden: 'report',
    einreichen: 'submit',
    aendern: 'change',
    abschliessen: 'finish',
    veranstaltung: 'event',
    bestaetigung: 'confirmation',
    details: 'details',
    option: 'option',
    termin: 'appointment',
    loesung: 'solution',
    ergebnis: 'result',
    rechnung: 'bill',
    betrag: 'amount',
    bezahlung: 'payment',
    anfrage: 'request',
    plan: 'plan',
    bestellung: 'order',
    konto: 'account',
    paket: 'package',
    vertrag: 'contract',
    antrag: 'application',
    frage: 'question',
    situation: 'situation',
    angaben: 'information',
    moeglich: 'possible',
    perfekt: 'perfect',
    alles: 'everything',
    restaurant: 'restaurant',
    cafe: 'cafe',
    baeckerei: 'bakery',
    supermarkt: 'supermarket',
    apotheke: 'pharmacy',
    arztpraxis: 'doctor office',
    zahnarztpraxis: 'dentist office',
    bahnhof: 'station',
    flughafen: 'airport',
    busbahnhof: 'bus station',
    hotel: 'hotel',
    wohnungsvermietung: 'apartment rental',
    bank: 'bank',
    postfiliale: 'post office',
    bibliothek: 'library',
    studienbuero: 'study office',
    bewerbungsgespraech: 'job interview',
    buero: 'office',
    kundendienst: 'support desk',
    elektronikmarkt: 'electronics store',
    autovermietung: 'car rental',
    fitnessstudio: 'gym',
    rathaus: 'city hall',
    versicherung: 'insurance',
    eventplanung: 'event planning',
    habe: 'have',
    haben: 'have',
  };

  return map[key] ?? null;
}

function tokenizeGermanWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((token) => token.replace(/^[^A-Za-zÄÖÜäöüß]+|[^A-Za-zÄÖÜäöüß]+$/g, ''))
    .map((token) => token.trim())
    .filter(Boolean);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function computeDueUrgency(nextReviewDate: string | null): number {
  if (!nextReviewDate) return 0.35;
  const today = new Date().toISOString().slice(0, 10);
  const diff = daysBetween(today, nextReviewDate);
  if (diff <= 0) return 1;
  if (diff <= 2) return 0.82;
  if (diff <= 7) return 0.55;
  if (diff <= 14) return 0.35;
  return 0.15;
}

function sentenceIdFor(turn: StoryTurnRow, level: Level): number | undefined {
  const row = selectSentenceByGermanAndLevel.get(turn.german, level) as { id: number } | undefined;
  return row?.id;
}

function resolveWordVocab(word: string, level: Level, fallbackEnglish: string): { id?: number; englishHint: string; levelFit: number } {
  const raw = selectVocabByWord.all(word) as Array<{ id: number; german: string; english: string; level: Level }>;
  if (!raw.length) {
    return { englishHint: fallbackEnglish || word, levelFit: 0.5 };
  }

  const targetRank = LEVEL_RANK[level];
  const best = raw
    .map((row) => ({
      ...row,
      distance: Math.abs(LEVEL_RANK[row.level] - targetRank),
    }))
    .sort((a, b) => a.distance - b.distance || a.id - b.id)[0];

  return {
    id: best.id,
    englishHint: best.english,
    levelFit: clamp(1 - best.distance * 0.25, 0.25, 1),
  };
}

function parseWordStats(words: string[], level: Level): ChunkWordStat[] {
  return words.map((word) => {
    const vocab = resolveWordVocab(word, level, word);
    const progress = vocab.id
      ? (selectProgressByVocabId.get(vocab.id) as VocabularyProgressRow | undefined)
      : undefined;

    const strength = progress?.strength_score ?? 0.35;
    const repetition = progress?.repetition_count ?? 0;
    const correct = progress?.correct_count ?? 0;
    const incorrect = progress?.incorrect_count ?? 0;
    const failRate = incorrect / Math.max(1, incorrect + correct);

    const directManual = manualWordTranslation(word);
    const englishHint = directManual || vocab.englishHint;

    return {
      word,
      vocabId: vocab.id,
      englishHint,
      strength,
      repetition,
      dueUrgency: computeDueUrgency(progress?.next_review_date ?? null),
      failRate,
    };
  });
}

function extractMeaningfulChunks(words: string[], focusWord: string): string[][] {
  if (words.length <= 2) return [words];

  const focus = normalizeToken(focusWord);
  const focusIndex = words.findIndex((word) => normalizeToken(word) === focus);

  const candidates: Array<{ words: string[]; score: number }> = [];
  const addCandidate = (start: number, length: number, score: number) => {
    if (start < 0) return;
    const end = start + length;
    if (end > words.length) return;
    const slice = words.slice(start, end);
    if (slice.length < 2 || slice.length > 4) return;
    candidates.push({ words: slice, score });
  };

  addCandidate(0, 2, 2.8);
  addCandidate(0, 3, 3.2);

  if (focusIndex >= 0) {
    addCandidate(Math.max(0, focusIndex - 1), 2, 3.4);
    addCandidate(Math.max(0, focusIndex - 1), 3, 3.8);
    addCandidate(focusIndex, 2, 3.1);
  }

  if (words.length >= 4) {
    addCandidate(1, 3, 2.5);
  }

  const unique = new Map<string, { words: string[]; score: number }>();
  for (const candidate of candidates) {
    const key = candidate.words.map((word) => normalizeToken(word)).join(' ');
    const current = unique.get(key);
    if (!current || candidate.score > current.score) {
      unique.set(key, candidate);
    }
  }

  const sorted = Array.from(unique.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.words);

  return sorted.length ? sorted : [words.slice(0, Math.min(3, words.length))];
}

function splitSentenceIntoChunks(words: string[]): string[][] {
  const n = words.length;
  if (n <= 4) return [words];
  if (n <= 6) return [words.slice(0, 3), words.slice(3)];
  if (n <= 7) return [words.slice(0, 4), words.slice(4)];

  const first = 4;
  let second = Math.max(2, Math.floor((n - first) / 2) - 1);
  let third = n - first - second;

  if (third < 2) {
    second = Math.max(2, n - first - 2);
    third = n - first - second;
  }

  const chunks: string[][] = [
    words.slice(0, first),
    words.slice(first, first + second),
    words.slice(first + second),
  ];

  return chunks.filter((chunk) => chunk.length > 0);
}

function buildChunkDescriptor(turn: StoryTurnRow, chunkWords: string[], level: Level): ChunkDescriptor {
  const wordStats = parseWordStats(chunkWords, level);
  const stability = wordStats.reduce((sum, stat) => sum + stat.strength, 0) / Math.max(1, wordStats.length);
  const repetitionAvg = wordStats.reduce((sum, stat) => sum + stat.repetition, 0) / Math.max(1, wordStats.length);
  const dueUrgency = Math.max(...wordStats.map((stat) => stat.dueUrgency));
  const recentFail = Math.max(...wordStats.map((stat) => stat.failRate));
  const isNew = repetitionAvg < 2 || stability < 0.75;

  const key = chunkWords.map((word) => normalizeToken(word)).join(' ');
  const untranslatedCount = wordStats.filter(
    (stat) => normalizeToken(stat.englishHint) === normalizeToken(stat.word)
  ).length;

  let englishHint = wordStats
    .map((stat) => stat.englishHint)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!englishHint || untranslatedCount === wordStats.length) {
    englishHint = turn.english;
  }
  const focus = normalizeToken(turn.focus_word);
  const unitRelevance = chunkWords.some((word) => normalizeToken(word) === focus) ? 1 : 0.72;

  return {
    key,
    text: chunkWords.join(' '),
    words: chunkWords,
    englishHint,
    wordStats,
    isNew,
    stability,
    dueUrgency,
    recentFail,
    unitRelevance,
    turnOrder: turn.turn_order,
  };
}

function buildTurnChunks(turn: StoryTurnRow, level: Level): ChunkDescriptor[] {
  const words = tokenizeGermanWords(turn.german);
  const chunkWordsList = splitSentenceIntoChunks(words);
  return chunkWordsList.map((chunkWords) => buildChunkDescriptor(turn, chunkWords, level));
}

function makeBaseMetadata(node: RoadNodeSummary, turn: StoryTurnRow, stage: 'chunk' | 'sentence') {
  return {
    road_node_id: node.id,
    story_track: node.story_track_slug,
    story_title: node.story_track_title,
    chapter_title: node.chapter_title,
    chapter_description: node.chapter_description,
    turn_order: turn.turn_order,
    speaker: turn.speaker,
    dialogue_german: turn.german,
    dialogue_english: turn.english,
    focus_word: turn.focus_word,
    stage,
    stage_label: stage === 'chunk' ? 'Chunk' : 'Sentence',
  };
}

function buildMCQOptions(correct: string, distractors: string[]): string[] {
  const pool = Array.from(new Set([correct, ...distractors])).slice(0, 4);
  if (!pool.includes(correct)) pool.push(correct);
  while (pool.length < 4) {
    pool.push(correct);
  }
  return deterministicShuffle(pool.slice(0, 4), `mcq:${correct}:${distractors.join('|')}`);
}

function makeChunkCandidates(
  node: RoadNodeSummary,
  turn: StoryTurnRow,
  chunk: ChunkDescriptor,
  distractorChunks: string[],
  level: Level
): ExerciseCandidate[] {
  const sentenceId = sentenceIdFor(turn, level);
  const escapedChunk = chunk.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blanked = turn.german.replace(new RegExp(`\\b${escapedChunk}\\b`, 'i'), '_____');
  const safeBlanked = blanked.includes('_____') ? blanked : turn.german.replace(chunk.text, '_____');
  const reorderedTokens = deterministicShuffle(chunk.words, `reorder:${turn.turn_order}:${chunk.key}`);
  const chunkLengthTarget: Record<Level, number> = { A1: 2, A2: 3, B1: 3, B2: 4 };
  const levelFit = clamp(1 - Math.abs(chunk.words.length - chunkLengthTarget[level]) / chunkLengthTarget[level], 0.3, 1);
  const hasArticleConfusion = chunk.words.map((word) => normalizeToken(word)).filter((w) => ['der', 'die', 'das', 'den', 'dem'].includes(w)).length >= 2;

  const baseMeta = {
    ...makeBaseMetadata(node, turn, 'chunk'),
    visible_turns: Math.max(0, turn.turn_order - 1),
    show_full_conversation: false,
    focus_chunk: chunk.text,
    focus_chunk_key: chunk.key,
    translation_hint: chunk.englishHint,
    context_translation: turn.english,
  };
  const newConceptKey = `${turn.turn_order}:${chunk.key}`;

  const funOptions = deterministicShuffle(chunk.words, `fun:${turn.turn_order}:${chunk.key}`);

  const candidates: ExerciseCandidate[] = [
    {
      candidateKey: `${turn.turn_order}:${chunk.key}:recognition`,
      itemKey: `${turn.turn_order}:${chunk.key}:recognition`,
      turnOrder: turn.turn_order,
      modality: 'recall',
      interaction: 'recognition',
      isNew: chunk.isNew,
      isFun: false,
      dueUrgency: chunk.dueUrgency,
      recentFail: chunk.recentFail,
      unitRelevance: chunk.unitRelevance,
      levelFit,
      inputSize: chunk.words.length,
      confusionPenalty: hasArticleConfusion ? 0.08 : 0,
      noveltyBoost: 0.4,
      newConceptKey,
      exercise: {
        id: randomId(),
        type: 'mcq',
        question: `Choose the chunk that fits this turn:\n"${turn.german}"`,
        correct_answer: chunk.text,
        options: buildMCQOptions(chunk.text, distractorChunks),
        sentence_id: sentenceId,
        hint: `Chunk hint: ${chunk.englishHint}.`,
        explanation: `Correct chunk: "${chunk.text}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Chunk • Recognition',
          speak_text: chunk.text,
        },
      },
    },
    {
      candidateKey: `${turn.turn_order}:${chunk.key}:cloze`,
      itemKey: `${turn.turn_order}:${chunk.key}:cloze`,
      turnOrder: turn.turn_order,
      modality: 'recall',
      interaction: 'cloze',
      isNew: chunk.isNew,
      isFun: false,
      dueUrgency: chunk.dueUrgency,
      recentFail: chunk.recentFail,
      unitRelevance: chunk.unitRelevance,
      levelFit,
      inputSize: chunk.words.length,
      confusionPenalty: hasArticleConfusion ? 0.12 : 0,
      noveltyBoost: 0.38,
      newConceptKey,
      exercise: {
        id: randomId(),
        type: 'fill_blank',
        question: `Fill in the missing chunk:\n"${safeBlanked}"`,
        correct_answer: chunk.text,
        sentence_id: sentenceId,
        hint: `Use the chunk meaning "${chunk.englishHint}".`,
        explanation: `Full turn: "${turn.german}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Chunk • Cloze',
          speak_text: chunk.text,
        },
      },
    },
    {
      candidateKey: `${turn.turn_order}:${chunk.key}:reorder`,
      itemKey: `${turn.turn_order}:${chunk.key}:reorder`,
      turnOrder: turn.turn_order,
      modality: 'recall',
      interaction: 'reorder',
      isNew: chunk.isNew,
      isFun: false,
      dueUrgency: chunk.dueUrgency,
      recentFail: chunk.recentFail,
      unitRelevance: chunk.unitRelevance,
      levelFit,
      inputSize: chunk.words.length,
      confusionPenalty: 0.04,
      noveltyBoost: 0.28,
      newConceptKey,
      exercise: {
        id: randomId(),
        type: 'sentence_building',
        question: `Reorder this chunk:\n("${chunk.englishHint}")`,
        correct_answer: chunk.text,
        options: reorderedTokens,
        sentence_id: sentenceId,
        hint: `Build the exact chunk from this turn.`,
        explanation: `Correct order: "${chunk.text}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Chunk • Reorder',
          tokens: chunk.words,
          shuffled: reorderedTokens,
          speak_text: chunk.text,
        },
      },
    },
    {
      candidateKey: `${turn.turn_order}:${chunk.key}:dictation`,
      itemKey: `${turn.turn_order}:${chunk.key}:dictation`,
      turnOrder: turn.turn_order,
      modality: 'listening',
      interaction: 'dictation',
      isNew: chunk.isNew,
      isFun: false,
      dueUrgency: chunk.dueUrgency,
      recentFail: chunk.recentFail,
      unitRelevance: chunk.unitRelevance,
      levelFit,
      inputSize: chunk.words.length,
      confusionPenalty: hasArticleConfusion ? 0.08 : 0,
      noveltyBoost: 0.26,
      newConceptKey,
      exercise: {
        id: randomId(),
        type: 'listening',
        question: 'Listen and type the chunk:',
        correct_answer: chunk.text,
        sentence_id: sentenceId,
        hint: `${chunk.words.length} words.`,
        explanation: `You heard: "${chunk.text}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Chunk • Dictation',
          text_to_speak: chunk.text,
          speak_text: chunk.text,
        },
      },
    },
    {
      candidateKey: `${turn.turn_order}:${chunk.key}:shadowing`,
      itemKey: `${turn.turn_order}:${chunk.key}:shadowing`,
      turnOrder: turn.turn_order,
      modality: 'speaking',
      interaction: 'shadowing',
      isNew: chunk.isNew,
      isFun: false,
      dueUrgency: chunk.dueUrgency,
      recentFail: chunk.recentFail,
      unitRelevance: chunk.unitRelevance,
      levelFit,
      inputSize: chunk.words.length,
      confusionPenalty: 0.06,
      noveltyBoost: 0.32,
      newConceptKey,
      exercise: {
        id: randomId(),
        type: 'speaking',
        question: `Repeat this chunk aloud:\n"${chunk.text}"`,
        correct_answer: chunk.text,
        sentence_id: sentenceId,
        hint: 'Shadow the chunk with clear pronunciation.',
        explanation: `Expected chunk: "${chunk.text}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Chunk • Speaking',
          expected_german: chunk.text,
          speak_text: chunk.text,
        },
      },
    },
    {
      candidateKey: `${turn.turn_order}:${chunk.key}:production`,
      itemKey: `${turn.turn_order}:${chunk.key}:production`,
      turnOrder: turn.turn_order,
      modality: 'review',
      interaction: 'production',
      isNew: chunk.isNew,
      isFun: false,
      dueUrgency: chunk.dueUrgency,
      recentFail: chunk.recentFail,
      unitRelevance: chunk.unitRelevance,
      levelFit,
      inputSize: chunk.words.length,
      confusionPenalty: hasArticleConfusion ? 0.1 : 0,
      noveltyBoost: 0.35,
      newConceptKey,
      exercise: {
        id: randomId(),
        type: 'translation',
        question: `Write in German: "${chunk.englishHint}"`,
        correct_answer: chunk.text,
        sentence_id: sentenceId,
        hint: 'Produce the full chunk from memory.',
        explanation: `Correct chunk: "${chunk.text}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Chunk • Production',
          speak_text: chunk.text,
        },
      },
    },
    {
      candidateKey: `${turn.turn_order}:${chunk.key}:fun`,
      itemKey: `${turn.turn_order}:${chunk.key}:fun`,
      turnOrder: turn.turn_order,
      modality: 'review',
      interaction: 'fun',
      isNew: false,
      isFun: true,
      dueUrgency: chunk.dueUrgency,
      recentFail: chunk.recentFail,
      unitRelevance: chunk.unitRelevance,
      levelFit,
      inputSize: chunk.words.length,
      confusionPenalty: 0,
      noveltyBoost: 0.18,
      exercise: {
        id: randomId(),
        type: 'sentence_building',
        question: `Story remix: rebuild this chunk from the dialogue`,
        correct_answer: chunk.text,
        options: funOptions,
        sentence_id: sentenceId,
        hint: `Fun checkpoint before phrase reveal.`,
        explanation: `Story chunk: "${chunk.text}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Chunk • Fun',
          tokens: chunk.words,
          shuffled: funOptions,
          speak_text: chunk.text,
          translation_hint: chunk.englishHint,
        },
      },
    },
  ];

  return candidates;
}

function makeChunkMeaningExercise(
  node: RoadNodeSummary,
  turn: StoryTurnRow,
  chunk: ChunkDescriptor,
  distractorHints: string[],
  level: Level
): ExerciseCandidate {
  const sentenceId = sentenceIdFor(turn, level);
  const optionsPool = Array.from(new Set([chunk.englishHint, ...distractorHints]))
    .filter(Boolean)
    .slice(0, 6);

  const options = deterministicShuffle(
    buildMCQOptions(chunk.englishHint, optionsPool.filter((option) => option !== chunk.englishHint)),
    `meaning:${turn.turn_order}:${chunk.key}`
  );

  return {
    candidateKey: `${turn.turn_order}:${chunk.key}:meaning`,
    itemKey: `${turn.turn_order}:${chunk.key}:meaning`,
    turnOrder: turn.turn_order,
    modality: 'recall',
    interaction: 'recognition',
    isNew: chunk.isNew,
    isFun: false,
    dueUrgency: chunk.dueUrgency,
    recentFail: chunk.recentFail,
    unitRelevance: chunk.unitRelevance,
    levelFit: 1,
    inputSize: chunk.words.length,
    confusionPenalty: 0,
    noveltyBoost: 0,
    newConceptKey: `${turn.turn_order}:${chunk.key}`,
    exercise: {
      id: randomId(),
      type: 'mcq',
      question: `Select the English meaning of:\n"${chunk.text}"`,
      correct_answer: chunk.englishHint,
      options,
      sentence_id: sentenceId,
      hint: 'Build chunk understanding before harder tasks.',
      explanation: `"${chunk.text}" means "${chunk.englishHint}".`,
      metadata: {
        ...makeBaseMetadata(node, turn, 'chunk'),
        stage_label: 'Chunk • Meaning',
        visible_turns: turn.turn_order,
        show_full_conversation: true,
        focus_chunk: chunk.text,
        focus_chunk_key: chunk.key,
        show_translation_hint: false,
        context_translation: turn.english,
        speak_text: chunk.text,
      },
    },
  };
}

function makePhraseRevealExercise(
  node: RoadNodeSummary,
  turn: StoryTurnRow,
  level: Level,
  knownTurn: boolean
): ExerciseCandidate {
  const sentenceId = sentenceIdFor(turn, level);
  return {
    candidateKey: `${turn.turn_order}:phrase_reveal`,
    itemKey: `${turn.turn_order}:phrase`,
    turnOrder: turn.turn_order,
    modality: 'recall',
    interaction: 'production',
    isNew: !knownTurn,
    isFun: false,
    dueUrgency: knownTurn ? 0.4 : 0.75,
    recentFail: knownTurn ? 0.2 : 0.45,
    unitRelevance: 1,
    levelFit: 1,
    inputSize: tokenizeGermanWords(turn.german).length,
    confusionPenalty: 0.06,
    noveltyBoost: 0,
    exercise: {
      id: randomId(),
      type: 'translation',
      question: `Write the full phrase in German:\n"${turn.english}"`,
      correct_answer: turn.german,
      sentence_id: sentenceId,
      hint: 'Now assemble the whole phrase before moving on.',
      explanation: `Full phrase: "${turn.german}".`,
      metadata: {
        ...makeBaseMetadata(node, turn, 'sentence'),
        stage_label: 'Phrase Reveal',
        visible_turns: turn.turn_order,
        show_full_conversation: false,
        speak_text: turn.german,
        translation_hint: turn.english,
      },
    },
  };
}

function makeConversationPreviewExercise(node: RoadNodeSummary, turns: StoryTurnRow[]): ExerciseCandidate {
  const firstTurn = turns[0];
  const fullGermanConversation = turns.map((turn) => `${turn.speaker}: ${turn.german}`).join(' ');
  const fullEnglishConversation = turns.map((turn) => `${turn.speaker}: ${turn.english}`).join(' ');

  return {
    candidateKey: 'intro:conversation_preview',
    itemKey: 'intro:conversation_preview',
    turnOrder: 0,
    modality: 'recall',
    interaction: 'recognition',
    isNew: false,
    isFun: false,
    dueUrgency: 0.3,
    recentFail: 0,
    unitRelevance: 1,
    levelFit: 1,
    inputSize: tokenizeGermanWords(fullGermanConversation).length,
    confusionPenalty: 0,
    noveltyBoost: 0,
    exercise: {
      id: randomId(),
      type: 'mcq',
      question: `Read this full conversation first:\n${fullGermanConversation}`,
      correct_answer: 'Continue',
      options: ['Continue'],
      hint: 'Read the full context before the practice starts.',
      explanation: 'Great. Now we practice the conversation from easier chunks to harder tasks.',
      metadata: {
        ...makeBaseMetadata(node, firstTurn, 'sentence'),
        stage_label: 'Conversation • Preview',
        visible_turns: turns.length,
        show_full_conversation: true,
        speak_text: fullGermanConversation,
        translation_hint: fullEnglishConversation,
      },
    },
  };
}

function makeFinalConversationExercises(node: RoadNodeSummary, turns: StoryTurnRow[]): ExerciseCandidate[] {
  const finalTurn = turns[turns.length - 1];
  const fullGermanConversation = turns.map((turn) => turn.german).join(' ');
  const fullEnglishConversation = turns.map((turn) => turn.english).join(' ');

  const baseMeta = {
    ...makeBaseMetadata(node, finalTurn, 'sentence'),
    stage_label: 'Conversation Finale',
    visible_turns: turns.length,
    show_full_conversation: true,
    translation_hint: fullEnglishConversation,
  };

  return [
    {
      candidateKey: 'final:speaking',
      itemKey: 'final:conversation:speaking',
      turnOrder: turns.length,
      modality: 'speaking',
      interaction: 'shadowing',
      isNew: false,
      isFun: true,
      dueUrgency: 0.85,
      recentFail: 0.35,
      unitRelevance: 1,
      levelFit: 1,
      inputSize: tokenizeGermanWords(fullGermanConversation).length,
      confusionPenalty: 0.05,
      noveltyBoost: 0,
      exercise: {
        id: randomId(),
        type: 'speaking',
        question: `Say the full conversation aloud:\n"${fullGermanConversation}"`,
        correct_answer: fullGermanConversation,
        hint: 'Final speaking checkpoint for the whole dialogue.',
        explanation: `Full conversation target: "${fullGermanConversation}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Conversation • Speak',
          expected_german: fullGermanConversation,
          speak_text: fullGermanConversation,
        },
      },
    },
    {
      candidateKey: 'final:listening',
      itemKey: 'final:conversation:listening',
      turnOrder: turns.length,
      modality: 'listening',
      interaction: 'dictation',
      isNew: false,
      isFun: false,
      dueUrgency: 0.85,
      recentFail: 0.35,
      unitRelevance: 1,
      levelFit: 1,
      inputSize: tokenizeGermanWords(fullGermanConversation).length,
      confusionPenalty: 0.05,
      noveltyBoost: 0,
      exercise: {
        id: randomId(),
        type: 'listening',
        question: 'Listen and type the full conversation:',
        correct_answer: fullGermanConversation,
        hint: `${turns.length} turns combined in one dictation.`,
        explanation: 'You heard the full dialogue.',
        metadata: {
          ...baseMeta,
          stage_label: 'Conversation • Listen',
          text_to_speak: fullGermanConversation,
          speak_text: fullGermanConversation,
        },
      },
    },
    {
      candidateKey: 'final:writing',
      itemKey: 'final:conversation:writing',
      turnOrder: turns.length,
      modality: 'review',
      interaction: 'production',
      isNew: false,
      isFun: false,
      dueUrgency: 0.85,
      recentFail: 0.35,
      unitRelevance: 1,
      levelFit: 1,
      inputSize: tokenizeGermanWords(fullGermanConversation).length,
      confusionPenalty: 0.08,
      noveltyBoost: 0,
      exercise: {
        id: randomId(),
        type: 'translation',
        question: `Write the full conversation in German:\n"${fullEnglishConversation}"`,
        correct_answer: fullGermanConversation,
        hint: 'Final writing checkpoint.',
        explanation: `Expected full conversation: "${fullGermanConversation}".`,
        metadata: {
          ...baseMeta,
          stage_label: 'Conversation • Write',
          speak_text: fullGermanConversation,
        },
      },
    },
  ];
}

function predictedSuccess(candidate: ExerciseCandidate): number {
  const modalityPenalty: Record<Modality, number> = {
    recall: 0.14,
    listening: 0.17,
    speaking: 0.22,
    review: 0.1,
  };

  const interactionPenalty: Record<Interaction, number> = {
    recognition: 0.04,
    cloze: 0.08,
    reorder: 0.09,
    dictation: 0.14,
    shadowing: 0.16,
    production: 0.18,
    confusable: 0.15,
    fun: 0.06,
  };

  const baseFromStability = 0.38 + 0.5 * (1 - candidate.recentFail) + 0.12 * candidate.levelFit;
  const inputPenalty = Math.max(0, candidate.inputSize - 2) * 0.06;
  const result = baseFromStability - modalityPenalty[candidate.modality] - interactionPenalty[candidate.interaction] - inputPenalty - candidate.confusionPenalty;
  return clamp(result, 0.05, 0.95);
}

function repetitionPenalty(state: SelectorState, candidate: ExerciseCandidate): number {
  const recent = state.selected.slice(-3);
  let penalty = 0;
  if (recent.some((item) => item.modality === candidate.modality)) penalty += 0.12;
  if (recent.some((item) => item.interaction === candidate.interaction)) penalty += 0.2;
  if (state.selected.length > 0) {
    const last = state.selected[state.selected.length - 1];
    if (last.modality === candidate.modality) penalty += 0.24;
    if (last.interaction === candidate.interaction) penalty += 0.28;
  }
  return penalty;
}

function varietyBonus(state: SelectorState, candidate: ExerciseCandidate): number {
  const totalSoFar = Math.max(1, state.selectedSelectableCount);
  const modalityCount = state.selectableModalityCounts[candidate.modality];
  const currentRatio = modalityCount / totalSoFar;
  const deficit = Math.max(0, MODALITY_TARGET_RATIO[candidate.modality] - currentRatio);
  let bonus = deficit * 1.5;

  const noRecentFun = state.selected.slice(-8).every((entry) => !entry.isFun);
  if (candidate.isFun && noRecentFun) bonus += 0.35;

  if (!candidate.isFun && (state.selected.length + 1) % 9 === 0) {
    bonus -= 0.18;
  }

  return bonus;
}

function scoreCandidate(state: SelectorState, candidate: ExerciseCandidate): number {
  const w_due = 1.5;
  const w_fail = 1.2;
  const w_goal = 1.3;
  const w_var = 1.05;
  const w_level = 0.8;
  const w_repeat = 1.25;
  const w_hard = 1.7;

  const predicted = predictedSuccess(candidate);
  const tooHardPenalty = Math.max(0, 0.55 - predicted);
  const repeat = repetitionPenalty(state, candidate);

  const selectedAfter = state.selectedSelectableCount + 1;
  const introducesNewConcept = Boolean(candidate.isNew && candidate.newConceptKey && !state.seenNewConceptKeys.has(candidate.newConceptKey));
  const currentNewRatio = selectedAfter > 0 ? (state.newItemsUsed + (introducesNewConcept ? 1 : 0)) / selectedAfter : 0;
  const newNeedBonus = introducesNewConcept && currentNewRatio < NEW_ITEM_MIN_RATIO ? 0.25 : 0;

  return (
    w_due * candidate.dueUrgency +
    w_fail * candidate.recentFail +
    w_goal * (candidate.unitRelevance + candidate.noveltyBoost) +
    w_var * varietyBonus(state, candidate) +
    w_level * candidate.levelFit +
    newNeedBonus -
    w_repeat * repeat -
    w_hard * tooHardPenalty
  );
}

function pickBestCandidate(scored: Array<{ candidate: ExerciseCandidate; score: number }>): ExerciseCandidate {
  return [...scored]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.candidate.turnOrder !== b.candidate.turnOrder) return a.candidate.turnOrder - b.candidate.turnOrder;
      if (a.candidate.modality !== b.candidate.modality) return a.candidate.modality.localeCompare(b.candidate.modality);
      return a.candidate.candidateKey.localeCompare(b.candidate.candidateKey);
    })[0].candidate;
}

function recentlyUsedItem(state: SelectorState, itemKey: string): boolean {
  return state.selected.slice(-REPEAT_WINDOW).some((entry) => entry.itemKey === itemKey);
}

function passesNewRatioHardConstraint(state: SelectorState, candidate: ExerciseCandidate): boolean {
  const introducesNewConcept = Boolean(candidate.isNew && candidate.newConceptKey && !state.seenNewConceptKeys.has(candidate.newConceptKey));

  if (!introducesNewConcept) {
    const remainingSlots = state.targetSelectableCount - state.selectedSelectableCount - 1;
    const minNeeded = Math.max(0, state.minNewItems - state.newItemsUsed);
    if (remainingSlots < minNeeded) return false;
    return true;
  }

  return state.newItemsUsed < state.maxNewItems;
}

function passesModalityQuotaHardConstraint(state: SelectorState, candidate: ExerciseCandidate): boolean {
  const remainingSlotsAfter = state.targetSelectableCount - state.selectedSelectableCount - 1;

  const projectedCounts: Record<Modality, number> = {
    recall: state.selectableModalityCounts.recall,
    listening: state.selectableModalityCounts.listening,
    speaking: state.selectableModalityCounts.speaking,
    review: state.selectableModalityCounts.review,
  };
  projectedCounts[candidate.modality] += 1;

  const deficitsAfter = (Object.keys(projectedCounts) as Modality[])
    .map((modality) => Math.max(0, state.targetSelectableModalityCounts[modality] - projectedCounts[modality]))
    .reduce((sum, value) => sum + value, 0);

  return deficitsAfter <= remainingSlotsAfter;
}

function selectTurnCandidates(
  candidates: ExerciseCandidate[],
  quota: number,
  state: SelectorState,
  usedKeys: Set<string>
): ExerciseCandidate[] {
  const picked: ExerciseCandidate[] = [];
  const interactionLadder: Interaction[] = [
    'recognition',
    'dictation',
    'shadowing',
    'cloze',
    'reorder',
    'production',
    'fun',
  ];

  for (let slot = 0; slot < quota; slot++) {
    const available = candidates.filter((candidate) => !usedKeys.has(candidate.candidateKey));
    if (!available.length) break;

    let strictPool = available.filter((candidate) => {
      if (recentlyUsedItem(state, candidate.itemKey)) return false;
      if (!passesModalityQuotaHardConstraint(state, candidate)) return false;
      return passesNewRatioHardConstraint(state, candidate);
    });

    if (!strictPool.length) {
      strictPool = available.filter((candidate) => {
        if (recentlyUsedItem(state, candidate.itemKey)) return false;
        return passesNewRatioHardConstraint(state, candidate);
      });
    }
    if (!strictPool.length) {
      strictPool = available.filter((candidate) => !recentlyUsedItem(state, candidate.itemKey));
    }
    if (!strictPool.length) {
      break;
    }

    const desiredInteraction = interactionLadder[Math.min(slot, interactionLadder.length - 1)];
    const interactionPool = strictPool.filter((candidate) => candidate.interaction === desiredInteraction);
    if (interactionPool.length > 0) {
      strictPool = interactionPool;
    }

    const deficits = (['recall', 'listening', 'speaking', 'review'] as Modality[])
      .map((modality) => ({
        modality,
        deficit: state.targetSelectableModalityCounts[modality] - state.selectableModalityCounts[modality],
      }))
      .filter((entry) => entry.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit);

    if (deficits.length > 0) {
      const preferredModalities = new Set(deficits.map((entry) => entry.modality));
      const preferredPool = strictPool.filter((candidate) => preferredModalities.has(candidate.modality));
      if (preferredPool.length > 0) {
        strictPool = preferredPool;
      }
    }

    const scored = strictPool.map((candidate) => ({
      candidate,
      score: scoreCandidate(state, candidate),
    }));

    const selected = pickBestCandidate(scored);
    usedKeys.add(selected.candidateKey);
    picked.push(selected);

    state.selected.push({
      itemKey: selected.itemKey,
      modality: selected.modality,
      interaction: selected.interaction,
      isNew: selected.isNew,
      isFun: selected.isFun,
      predictedSuccess: predictedSuccess(selected),
    });
    state.selectedSelectableCount += 1;
    state.selectableModalityCounts[selected.modality] += 1;
    const introducesNewConcept = Boolean(selected.isNew && selected.newConceptKey && !state.seenNewConceptKeys.has(selected.newConceptKey));
    if (introducesNewConcept) {
      state.newItemsUsed += 1;
      state.seenNewConceptKeys.add(selected.newConceptKey as string);
    }
  }

  return picked;
}

function computeTurnWeakness(chunks: ChunkDescriptor[]): number {
  if (!chunks.length) return 0.5;
  const avgStability = chunks.reduce((sum, chunk) => sum + chunk.stability, 0) / chunks.length;
  const avgFail = chunks.reduce((sum, chunk) => sum + chunk.recentFail, 0) / chunks.length;
  const newRatio = chunks.filter((chunk) => chunk.isNew).length / chunks.length;
  return clamp((1 - avgStability) * 0.5 + avgFail * 0.3 + newRatio * 0.2, 0, 1);
}

function allocateTurnQuotas(weaknesses: number[], total: number): number[] {
  const turns = weaknesses.length;
  const quotas = new Array(turns).fill(0);
  if (!turns || total <= 0) return quotas;

  const base = Math.floor(total / turns);
  for (let i = 0; i < turns; i++) {
    quotas[i] = Math.max(2, base);
  }

  let assigned = quotas.reduce((sum, value) => sum + value, 0);
  while (assigned > total) {
    const idx = quotas.findIndex((value) => value > 2);
    if (idx === -1) break;
    quotas[idx] -= 1;
    assigned -= 1;
  }

  while (assigned < total) {
    const ranked = weaknesses
      .map((weakness, index) => ({ index, weakness }))
      .sort((a, b) => b.weakness - a.weakness);

    for (const entry of ranked) {
      quotas[entry.index] += 1;
      assigned += 1;
      if (assigned >= total) break;
    }
  }

  return quotas;
}

function buildNodeSummaries(level: Level): RoadNodeSummary[] {
  ensureRoadData();
  const nodes = selectNodeRowsByLevel.all(level) as RoadNodeRow[];
  const progressRows = selectProgressRows.all(level) as RoadProgressRow[];
  const progressByNode = new Map(progressRows.map((row) => [row.node_id, row]));

  const summaries: RoadNodeSummary[] = [];

  nodes.forEach((node, index) => {
    const progress = progressByNode.get(node.id);
    const previous = index > 0 ? summaries[index - 1] : undefined;
    const unlocked = index === 0 || (!!previous?.status && previous.status === 'completed');

    let status: NodeStatus = 'locked';
    if (unlocked) {
      if (progress?.status === 'completed') status = 'completed';
      else if (progress?.status === 'in_progress') status = 'in_progress';
      else status = 'unlocked';
    }

    summaries.push({
      id: node.id,
      node_order: node.node_order,
      node_type: node.node_type,
      title: node.title,
      description: node.description,
      chapter_id: node.chapter_id,
      chapter_order: node.chapter_order,
      chapter_title: node.chapter_title,
      chapter_description: node.chapter_description,
      story_track_slug: node.story_track_slug,
      story_track_title: node.story_track_title,
      unlocked,
      status,
      stars: progress?.stars ?? 0,
      best_score: progress?.best_score ?? 0,
      attempts: progress?.attempts ?? 0,
    });
  });

  return summaries;
}

function buildProgressiveNodeExercises(node: RoadNodeSummary, turns: StoryTurnRow[], level: Level): GeneratedExercise[] {
  if (!turns.length) return [];

  generatedExerciseCounter = 0;

  const turnChunks = turns.map((turn) => buildTurnChunks(turn, level));
  const allChunkHints = turnChunks.flat().map((chunk) => chunk.englishHint);

  const orderedCandidates: ExerciseCandidate[] = [];

  // Phase 1: present vocabulary and phrase context from easy to medium.
  for (let turnIndex = 0; turnIndex < turns.length; turnIndex++) {
    const turn = turns[turnIndex];
    const chunks = turnChunks[turnIndex];
    const turnKnown = chunks.length > 0 && chunks.every((chunk) => !chunk.isNew);

    for (const chunk of chunks) {
      const distractors = allChunkHints
        .filter((hint) => hint !== chunk.englishHint)
        .slice(0, 6);
      orderedCandidates.push(makeChunkMeaningExercise(node, turn, chunk, distractors, level));
    }

    orderedCandidates.push(makePhraseRevealExercise(node, turn, level, turnKnown));
  }

  // Phase 2: harder prompts only after base chunk + phrase pass.
  const finalConversationCandidates = makeFinalConversationExercises(node, turns);
  const maxBeforeFinal = Math.max(0, SESSION_EXERCISE_CAP - finalConversationCandidates.length);
  const hardSlots = Math.max(0, maxBeforeFinal - orderedCandidates.length);

  const hardCandidates: ExerciseCandidate[] = [];
  const preferredForNew: Interaction[] = ['dictation', 'shadowing', 'cloze'];
  const preferredForKnown: Interaction[] = ['dictation'];

  for (let round = 0; hardCandidates.length < hardSlots && round < 3; round++) {
    for (let turnIndex = 0; turnIndex < turns.length && hardCandidates.length < hardSlots; turnIndex++) {
      const turn = turns[turnIndex];
      const chunks = turnChunks[turnIndex];
      const distractors = turnChunks
        .flat()
        .map((chunk) => chunk.text)
        .filter((text) => !chunks.some((chunk) => chunk.text === text))
        .slice(0, 6);

      for (const chunk of chunks) {
        if (hardCandidates.length >= hardSlots) break;

        const pool = makeChunkCandidates(node, turn, chunk, distractors, level);
        const alreadyForChunk = new Set(
          hardCandidates
            .filter((candidate) => candidate.itemKey.startsWith(`${turn.turn_order}:${chunk.key}:`))
            .map((candidate) => candidate.interaction)
        );

        const desiredInteractions = chunk.isNew ? preferredForNew : preferredForKnown;
        const desired = desiredInteractions[Math.min(round, desiredInteractions.length - 1)];
        if (alreadyForChunk.has(desired)) continue;

        const picked = pool.find((candidate) => candidate.interaction === desired);
        if (!picked) continue;
        hardCandidates.push(picked);
      }
    }
  }

  orderedCandidates.push(...hardCandidates);
  orderedCandidates.push(...finalConversationCandidates);

  return orderedCandidates.slice(0, SESSION_EXERCISE_CAP).map((candidate, index) => ({
    ...candidate.exercise,
    id: `road-step-${index + 1}`,
    metadata: {
      ...(candidate.exercise.metadata ?? {}),
      sequence_version: ROAD_SEQUENCE_VERSION,
    },
  }));
}

function parseRunExercises(raw: string): GeneratedExercise[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as GeneratedExercise[];
  } catch {
    return [];
  }
}

function classifyExerciseTypeForRun(type: string): 'reading' | 'listening' | 'speaking' {
  if (type === 'listening') return 'listening';
  if (type === 'speaking') return 'speaking';
  return 'reading';
}

export function getRoadMap(level: Level, options: RoadMapOptions = {}): RoadMapResponse {
  const requestedPageSize = Number.isFinite(options.pageSize) ? Number(options.pageSize) : 12;
  const requestedPageRaw = Number.isFinite(options.page) ? Number(options.page) : 1;
  const pageSize = clamp(Math.floor(requestedPageSize), 1, 50);
  const requestedPage = Math.max(1, Math.floor(requestedPageRaw));
  const hideCompleted = Boolean(options.hideCompleted);

  const nodes = buildNodeSummaries(level);
  const chapterMap = new Map<number, {
    chapterOrder: number;
    nodes: RoadNodeSummary[];
  }>();

  for (const node of nodes) {
    const existing = chapterMap.get(node.chapter_id);
    if (existing) {
      existing.nodes.push(node);
    } else {
      chapterMap.set(node.chapter_id, {
        chapterOrder: node.chapter_order,
        nodes: [node],
      });
    }
  }

  const allChapters = Array.from(chapterMap.values()).sort((a, b) => a.chapterOrder - b.chapterOrder);
  const chapterIsCompleted = (chapter: { nodes: RoadNodeSummary[] }) =>
    chapter.nodes.every((node) => node.status === 'completed');

  const filteredChapters = hideCompleted
    ? allChapters.filter((chapter) => !chapterIsCompleted(chapter))
    : allChapters;

  const totalPages = Math.max(1, Math.ceil(filteredChapters.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  const pagedChapters = filteredChapters.slice(start, start + pageSize);
  const pagedNodes = pagedChapters.flatMap((chapter) => chapter.nodes);

  const totalNodes = nodes.length;
  const completedNodes = nodes.filter((node) => node.status === 'completed').length;
  const totalStories = allChapters.length;
  const completedStories = allChapters.filter((chapter) => chapterIsCompleted(chapter)).length;

  return {
    level,
    nodes: pagedNodes,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    total_stories: totalStories,
    visible_stories: filteredChapters.length,
    completed_stories: completedStories,
    total_nodes: totalNodes,
    completed_nodes: completedNodes,
    remaining_nodes: Math.max(0, totalNodes - completedNodes),
    hide_completed: hideCompleted,
  };
}

export function startRoadNode(nodeId: number): StartRoadNodeResponse {
  const row = selectNodeById.get(nodeId) as RoadNodeRow | undefined;
  if (!row) {
    throw new Error('Road node not found.');
  }

  const map = buildNodeSummaries(row.level);
  const node = map.find((item) => item.id === nodeId);
  if (!node) {
    throw new Error('Road node is unavailable.');
  }

  if (!node.unlocked) {
    throw new Error('This node is locked. Complete previous nodes first.');
  }

  const progress = selectSingleProgress.get(nodeId) as RoadProgressRow | undefined;
  if (!progress || progress.status === 'unlocked') {
    upsertProgress.run(nodeId, 'in_progress', progress?.stars ?? 0, progress?.best_score ?? 0, progress?.attempts ?? 0, null);
  }

  const turns = selectTurnsByChapter.all(node.chapter_id) as StoryTurnRow[];

  const existingRun = selectActiveRunByNode.get(nodeId) as RoadNodeRunRow | undefined;
  if (existingRun) {
    const exercises = parseRunExercises(existingRun.exercise_sequence);
    const sequenceVersion = Number((exercises[0]?.metadata?.sequence_version as number | undefined) ?? 0);
    if (exercises.length > 0) {
      if (sequenceVersion === ROAD_SEQUENCE_VERSION && existingRun.current_index < exercises.length) {
        const refreshedMap = buildNodeSummaries(row.level);
        const refreshedNode = refreshedMap.find((item) => item.id === nodeId) || node;
        return {
          node: refreshedNode,
          turns: turns.map((turn) => ({
            turn_order: turn.turn_order,
            speaker: turn.speaker,
            german: turn.german,
            english: turn.english,
            focus_word: turn.focus_word,
          })),
          exercises,
          run_id: existingRun.id,
          current_index: existingRun.current_index,
        };
      }

      markRunStatus.run('abandoned', null, existingRun.id);
    } else {
      markRunStatus.run('abandoned', null, existingRun.id);
    }
  }

  const exercises = buildProgressiveNodeExercises(node, turns, row.level);
  const insertResult = insertRun.run(nodeId, JSON.stringify(exercises));
  const runId = Number(insertResult.lastInsertRowid);

  const refreshedMap = buildNodeSummaries(row.level);
  const refreshedNode = refreshedMap.find((item) => item.id === nodeId) || node;

  return {
    node: refreshedNode,
    turns: turns.map((turn) => ({
      turn_order: turn.turn_order,
      speaker: turn.speaker,
      german: turn.german,
      english: turn.english,
      focus_word: turn.focus_word,
    })),
    exercises,
    run_id: runId,
    current_index: 0,
  };
}

export function checkpointRoadNode(nodeId: number, payload: RoadCheckpointInput): RoadCheckpointResponse {
  const run = selectRunById.get(payload.run_id) as RoadNodeRunRow | undefined;
  if (!run || run.node_id !== nodeId) {
    throw new Error('Road run not found.');
  }
  if (run.status !== 'active') {
    throw new Error('Road run is not active.');
  }

  const exercises = parseRunExercises(run.exercise_sequence);
  if (!exercises.length) {
    throw new Error('Road run has no exercises.');
  }

  if (payload.exercise_index < run.current_index) {
    return {
      run_id: run.id,
      current_index: run.current_index,
      is_last: run.current_index >= exercises.length,
    };
  }

  if (payload.exercise_index !== run.current_index) {
    return {
      run_id: run.id,
      current_index: run.current_index,
      is_last: run.current_index >= exercises.length,
    };
  }

  const modality = classifyExerciseTypeForRun(payload.exercise_type);
  const nextIndex = Math.min(exercises.length, run.current_index + 1);

  const readingCorrect = run.reading_correct + (modality === 'reading' && payload.is_correct ? 1 : 0);
  const readingTotal = run.reading_total + (modality === 'reading' ? 1 : 0);
  const listeningCorrect = run.listening_correct + (modality === 'listening' && payload.is_correct ? 1 : 0);
  const listeningTotal = run.listening_total + (modality === 'listening' ? 1 : 0);
  const speakingCorrect = run.speaking_correct + (modality === 'speaking' && payload.is_correct ? 1 : 0);
  const speakingTotal = run.speaking_total + (modality === 'speaking' ? 1 : 0);

  updateRunCheckpoint.run(
    nextIndex,
    run.correct_count + (payload.is_correct ? 1 : 0),
    run.total_count + 1,
    readingCorrect,
    readingTotal,
    listeningCorrect,
    listeningTotal,
    speakingCorrect,
    speakingTotal,
    run.id
  );

  return {
    run_id: run.id,
    current_index: nextIndex,
    is_last: nextIndex >= exercises.length,
  };
}

export function completeRoadNode(nodeId: number, payload: RoadCompletionInput) {
  const row = selectNodeById.get(nodeId) as RoadNodeRow | undefined;
  if (!row) {
    throw new Error('Road node not found.');
  }

  let run: RoadNodeRunRow | undefined;
  let currentCorrect = Math.max(0, payload.correct ?? 0);
  let currentTotal = Math.max(0, payload.total ?? 0);
  let currentReadingCorrect = Math.max(0, payload.reading_correct ?? 0);
  let currentReadingTotal = Math.max(0, payload.reading_total ?? 0);
  let currentListeningCorrect = Math.max(0, payload.listening_correct ?? 0);
  let currentListeningTotal = Math.max(0, payload.listening_total ?? 0);
  let currentSpeakingCorrect = Math.max(0, payload.speaking_correct ?? 0);
  let currentSpeakingTotal = Math.max(0, payload.speaking_total ?? 0);

  if (payload.run_id && Number.isFinite(payload.run_id)) {
    run = selectRunById.get(payload.run_id) as RoadNodeRunRow | undefined;
    if (!run || run.node_id !== nodeId) {
      throw new Error('Road run not found.');
    }
    if (run.status !== 'active') {
      throw new Error('Road run is already finalized.');
    }

    currentCorrect = run.correct_count;
    currentTotal = run.total_count;
    currentReadingCorrect = run.reading_correct;
    currentReadingTotal = run.reading_total;
    currentListeningCorrect = run.listening_correct;
    currentListeningTotal = run.listening_total;
    currentSpeakingCorrect = run.speaking_correct;
    currentSpeakingTotal = run.speaking_total;
  }

  const safeTotal = Math.max(1, currentTotal);
  const score = Math.max(0, Math.min(1, currentCorrect / safeTotal));

  const previousSkill = selectRoadSkillProgress.get(nodeId) as RoadSkillProgressRow | undefined;

  const aggregatedReadingCorrect = (previousSkill?.reading_correct ?? 0) + currentReadingCorrect;
  const aggregatedReadingTotal = (previousSkill?.reading_total ?? 0) + currentReadingTotal;
  const aggregatedListeningCorrect = (previousSkill?.listening_correct ?? 0) + currentListeningCorrect;
  const aggregatedListeningTotal = (previousSkill?.listening_total ?? 0) + currentListeningTotal;
  const aggregatedSpeakingCorrect = (previousSkill?.speaking_correct ?? 0) + currentSpeakingCorrect;
  const aggregatedSpeakingTotal = (previousSkill?.speaking_total ?? 0) + currentSpeakingTotal;

  upsertRoadSkillProgress.run(
    nodeId,
    aggregatedReadingCorrect,
    aggregatedReadingTotal,
    aggregatedListeningCorrect,
    aggregatedListeningTotal,
    aggregatedSpeakingCorrect,
    aggregatedSpeakingTotal
  );

  const readingAcc = aggregatedReadingTotal > 0 ? aggregatedReadingCorrect / aggregatedReadingTotal : 0;
  const listeningAcc = aggregatedListeningTotal > 0 ? aggregatedListeningCorrect / aggregatedListeningTotal : 0;
  const speakingAcc = aggregatedSpeakingTotal > 0 ? aggregatedSpeakingCorrect / aggregatedSpeakingTotal : 0;

  const readingPass = readingAcc >= 0.8;
  const listeningPass = listeningAcc >= 0.7;
  const speakingPass = aggregatedSpeakingTotal >= 10 && speakingAcc >= 0.65;
  const passed = score >= 0.7 && readingPass && listeningPass && speakingPass;

  let stars = 0;
  if (passed) {
    if (score >= 0.92 && readingAcc >= 0.9 && listeningAcc >= 0.85 && speakingAcc >= 0.78) stars = 3;
    else if (score >= 0.82) stars = 2;
    else stars = 1;
  }

  const previous = selectSingleProgress.get(nodeId) as RoadProgressRow | undefined;
  const attempts = (previous?.attempts ?? 0) + 1;
  const bestScore = Math.max(previous?.best_score ?? 0, score);
  const bestStars = Math.max(previous?.stars ?? 0, stars);

  upsertProgress.run(
    nodeId,
    passed ? 'completed' : 'in_progress',
    passed ? bestStars : previous?.stars ?? 0,
    bestScore,
    attempts,
    passed ? new Date().toISOString() : null
  );

  if (run && run.status === 'active') {
    markRunStatus.run(
      passed ? 'completed' : 'abandoned',
      passed ? new Date().toISOString() : null,
      run.id
    );
  }

  const map = buildNodeSummaries(row.level);
  const updatedNode = map.find((item) => item.id === nodeId);

  return {
    passed,
    stars: passed ? bestStars : 0,
    score: Math.round(score * 100),
    thresholds: {
      reading: { passed: readingPass, accuracy: Math.round(readingAcc * 100), required: 80 },
      listening: { passed: listeningPass, accuracy: Math.round(listeningAcc * 100), required: 70 },
      speaking: {
        passed: speakingPass,
        accuracy: Math.round(speakingAcc * 100),
        attempts: aggregatedSpeakingTotal,
        required_accuracy: 65,
        required_attempts: 10,
      },
    },
    node: updatedNode,
  };
}
