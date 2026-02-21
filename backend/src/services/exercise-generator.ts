import db from '../db/database.js';
import type { GeneratedExercise, Level, Vocabulary, Sentence } from '../types/index.js';
import { getWordsForReview, ensureVocabProgressRows } from './learning-engine.js';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─── MCQ ─────────────────────────────────────────────────────────────────────

function buildMCQ(word: Vocabulary, level: Level): GeneratedExercise {
  // Get 3 distractors from same level, excluding target word
  const distractors = db.prepare(`
    SELECT english FROM vocabulary
    WHERE level = ? AND id != ?
    ORDER BY RANDOM() LIMIT 3
  `).all(level, word.id) as { english: string }[];

  const options = shuffle([word.english, ...distractors.map(d => d.english)]);
  const article = word.gender ? `(${word.gender}) ` : '';
  const plural = word.plural ? `, Pl: ${word.plural}` : '';

  return {
    id: randomId(),
    type: 'mcq',
    question: `What does "${article}${word.german}${plural}" mean?`,
    correct_answer: word.english,
    options,
    vocabulary_id: word.id,
    explanation: `"${word.german}" means "${word.english}". ${word.part_of_speech}${word.gender ? `, ${word.gender}` : ''}.`,
  };
}

// ─── Fill in the Blank ───────────────────────────────────────────────────────

function buildFillBlank(word: Vocabulary, level: Level): GeneratedExercise {
  // Find a sentence that contains the vocabulary word
  const sentence = db.prepare(`
    SELECT s.* FROM sentences s
    JOIN sentence_vocabulary sv ON s.id = sv.sentence_id
    WHERE sv.vocabulary_id = ? AND s.difficulty_level = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(word.id, level) as Sentence | undefined;

  if (sentence) {
    // Replace the word occurrence (case-insensitive) with blank
    const regex = new RegExp(`\\b${word.german}\\b`, 'i');
    const question = sentence.german.replace(regex, '_____');
    return {
      id: randomId(),
      type: 'fill_blank',
      question: `Fill in the blank: "${question}"\n(English: "${sentence.english}")`,
      correct_answer: word.german,
      vocabulary_id: word.id,
      sentence_id: sentence.id,
      explanation: `The missing word is "${word.german}" (${word.english}). Full sentence: "${sentence.german}"`,
    };
  }

  // Fallback: simple definition blank
  const article = word.gender ? `${word.gender} ` : '';
  return {
    id: randomId(),
    type: 'fill_blank',
    question: `Fill in the blank: "${article}_____" means "${word.english}"`,
    correct_answer: word.german,
    vocabulary_id: word.id,
    explanation: `The answer is "${word.german}" which means "${word.english}".`,
  };
}

// ─── Translation ─────────────────────────────────────────────────────────────

function buildTranslation(word: Vocabulary, level: Level): GeneratedExercise {
  const sentence = db.prepare(`
    SELECT s.* FROM sentences s
    JOIN sentence_vocabulary sv ON s.id = sv.sentence_id
    WHERE sv.vocabulary_id = ? AND s.difficulty_level = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(word.id, level) as Sentence | undefined;

  if (sentence) {
    const useGermanToEnglish = Math.random() > 0.5;
    return {
      id: randomId(),
      type: 'translation',
      question: useGermanToEnglish
        ? `Translate to English: "${sentence.german}"`
        : `Translate to German: "${sentence.english}"`,
      correct_answer: useGermanToEnglish ? sentence.english : sentence.german,
      vocabulary_id: word.id,
      sentence_id: sentence.id,
      explanation: `"${sentence.german}" = "${sentence.english}"`,
    };
  }

  // Fallback: single word translation
  return {
    id: randomId(),
    type: 'translation',
    question: `Translate to English: "${word.german}"`,
    correct_answer: word.english,
    vocabulary_id: word.id,
    explanation: `"${word.german}" translates to "${word.english}".`,
  };
}

// ─── Sentence Building ───────────────────────────────────────────────────────

function buildSentenceBuilding(word: Vocabulary, level: Level): GeneratedExercise {
  const sentence = db.prepare(`
    SELECT s.* FROM sentences s
    JOIN sentence_vocabulary sv ON s.id = sv.sentence_id
    WHERE sv.vocabulary_id = ? AND s.difficulty_level = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(word.id, level) as Sentence | undefined;

  // Pick any sentence at this level if no match
  const target: Sentence | undefined = sentence || (db.prepare(`
    SELECT * FROM sentences WHERE difficulty_level = ? ORDER BY RANDOM() LIMIT 1
  `).get(level) as Sentence | undefined);

  if (target) {
    const tokens = target.german.split(' ');
    const shuffled = shuffle(tokens);
    return {
      id: randomId(),
      type: 'sentence_building',
      question: `Arrange the words to form a sentence:\n("${target.english}")`,
      correct_answer: target.german,
      options: shuffled,
      sentence_id: target.id,
      vocabulary_id: word.id,
      explanation: `The correct sentence is: "${target.german}"`,
      metadata: { tokens, shuffled },
    };
  }

  // Minimal fallback
  const tokens = [word.german, 'ist', 'gut.'];
  return {
    id: randomId(),
    type: 'sentence_building',
    question: `Arrange: ${shuffle(tokens).join(' | ')}`,
    correct_answer: tokens.join(' '),
    options: shuffle(tokens),
    vocabulary_id: word.id,
    explanation: `The correct sentence is: "${tokens.join(' ')}"`,
  };
}

// ─── Listening ───────────────────────────────────────────────────────────────

function buildListening(word: Vocabulary, level: Level): GeneratedExercise {
  const sentence = db.prepare(`
    SELECT s.* FROM sentences s
    JOIN sentence_vocabulary sv ON s.id = sv.sentence_id
    WHERE sv.vocabulary_id = ? AND s.difficulty_level = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(word.id, level) as Sentence | undefined;

  const target = sentence || { german: word.german, english: word.english };

  return {
    id: randomId(),
    type: 'listening',
    question: `Listen and type what you hear:`,
    correct_answer: (target as Sentence).german ?? word.german,
    vocabulary_id: word.id,
    sentence_id: (target as Sentence).id,
    explanation: `You heard: "${(target as Sentence).german ?? word.german}"`,
    metadata: { text_to_speak: (target as Sentence).german ?? word.german },
  };
}

// ─── Speaking ────────────────────────────────────────────────────────────────

function buildSpeaking(word: Vocabulary, level: Level): GeneratedExercise {
  const sentence = db.prepare(`
    SELECT s.* FROM sentences s
    JOIN sentence_vocabulary sv ON s.id = sv.sentence_id
    WHERE sv.vocabulary_id = ? AND s.difficulty_level = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(word.id, level) as Sentence | undefined;

  const german = sentence ? (sentence as Sentence).german : word.german;
  const english = sentence ? (sentence as Sentence).english : word.english;

  return {
    id: randomId(),
    type: 'speaking',
    question: `Say this sentence aloud:\n"${german}" (${english})`,
    correct_answer: german,
    vocabulary_id: word.id,
    sentence_id: (sentence as Sentence | undefined)?.id,
    explanation: `The expected phrase is: "${german}"`,
    metadata: { expected_german: german },
  };
}

// ─── Main Generator ──────────────────────────────────────────────────────────

const EXERCISE_TYPES: Array<(w: Vocabulary, l: Level) => GeneratedExercise> = [
  buildMCQ,
  buildFillBlank,
  buildTranslation,
  buildSentenceBuilding,
  buildListening,
  buildSpeaking,
];

export function generateExercises(level: Level, count: number = 5): GeneratedExercise[] {
  const words = getWordsForReview(level, count);

  if (words.length === 0) {
    throw new Error(`No vocabulary found for level ${level}. Import vocabulary first.`);
  }

  // Ensure progress rows exist for all words
  ensureVocabProgressRows(words.map(w => w.id));

  const exercises: GeneratedExercise[] = [];

  // One of each type, cycling through available words
  const types = [buildMCQ, buildFillBlank, buildTranslation, buildSentenceBuilding, buildListening, buildSpeaking];

  for (let i = 0; i < Math.min(count, words.length, types.length); i++) {
    const word = words[i % words.length] as Vocabulary;
    const builder = types[i % types.length];
    try {
      exercises.push(builder(word, level));
    } catch {
      // fallback to mcq
      exercises.push(buildMCQ(word, level));
    }
  }

  // If more exercises requested than types, fill with MCQ on different words
  while (exercises.length < count && exercises.length < words.length) {
    const word = words[exercises.length] as Vocabulary;
    exercises.push(buildMCQ(word, level));
  }

  return exercises.slice(0, count);
}
