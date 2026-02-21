import db from '../db/database.js';
import type { GeneratedExercise, ExerciseCategory, Level, Vocabulary, Sentence } from '../types/index.js';
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

const selectAudioFilename = db.prepare(`
  SELECT audio_filename
  FROM vocabulary_metadata
  WHERE vocabulary_id = ?
`);

function getStoredAudioUrl(vocabularyId: number): string | undefined {
  const row = selectAudioFilename.get(vocabularyId) as { audio_filename: string | null } | undefined;
  const filename = row?.audio_filename?.trim();
  if (!filename) return undefined;
  return `/api/audio/${encodeURIComponent(filename)}`;
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
    hint: `Starts with "${word.english[0].toUpperCase()}" (${word.part_of_speech})`,
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
      hint: `${word.german.length} letters — it means "${word.english}"`,
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
    hint: `${word.german.length} letters — starts with "${word.german[0]}"`,
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
    const correctAnswer = useGermanToEnglish ? sentence.english : sentence.german;
    return {
      id: randomId(),
      type: 'translation',
      question: useGermanToEnglish
        ? `Translate to English: "${sentence.german}"`
        : `Translate to German: "${sentence.english}"`,
      correct_answer: correctAnswer,
      vocabulary_id: word.id,
      sentence_id: sentence.id,
      hint: `Key word: "${word.german}" = "${word.english}"`,
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
    hint: `Starts with "${word.english[0].toUpperCase()}" — it's a ${word.part_of_speech}`,
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
      hint: `${tokens.length} words — starts with "${tokens[0]}"`,
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
    hint: `${tokens.length} words — starts with "${tokens[0]}"`,
    explanation: `The correct sentence is: "${tokens.join(' ')}"`,
  };
}

// ─── Listening ───────────────────────────────────────────────────────────────

function buildListening(word: Vocabulary, level: Level): GeneratedExercise {
  const storedAudioUrl = getStoredAudioUrl(word.id);
  if (storedAudioUrl) {
    return {
      id: randomId(),
      type: 'listening',
      question: 'Listen and type the German word you hear:',
      correct_answer: word.german,
      vocabulary_id: word.id,
      hint: `${word.german.length} letters — it means "${word.english}"`,
      explanation: `The audio says "${word.german}" (${word.english}).`,
      metadata: {
        audio_url: storedAudioUrl,
        text_to_speak: word.german,
        audio_source: 'stored_file',
      },
    };
  }

  const sentence = db.prepare(`
    SELECT s.* FROM sentences s
    JOIN sentence_vocabulary sv ON s.id = sv.sentence_id
    WHERE sv.vocabulary_id = ? AND s.difficulty_level = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(word.id, level) as Sentence | undefined;

  const target = sentence || { german: word.german, english: word.english };

  const textToSpeak = (target as Sentence).german ?? word.german;
  const wordCount = textToSpeak.split(' ').length;
  return {
    id: randomId(),
    type: 'listening',
    question: `Listen and type what you hear:`,
    correct_answer: textToSpeak,
    vocabulary_id: word.id,
    sentence_id: (target as Sentence).id,
    hint: `${wordCount} word${wordCount > 1 ? 's' : ''} — first word starts with "${textToSpeak[0].toUpperCase()}"`,
    explanation: `You heard: "${textToSpeak}"`,
    metadata: { text_to_speak: textToSpeak },
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

  const storedAudioUrl = !sentence ? getStoredAudioUrl(word.id) : undefined;
  const german = sentence ? (sentence as Sentence).german : word.german;
  const english = sentence ? (sentence as Sentence).english : word.english;

  const speakWords = german.split(' ');
  return {
    id: randomId(),
    type: 'speaking',
    question: `Say this sentence aloud:\n"${german}" (${english})`,
    correct_answer: german,
    vocabulary_id: word.id,
    sentence_id: (sentence as Sentence | undefined)?.id,
    hint: `${speakWords.length} word${speakWords.length > 1 ? 's' : ''} — English: "${english}"`,
    explanation: `The expected phrase is: "${german}"`,
    metadata: {
      expected_german: german,
      ...(storedAudioUrl ? { audio_url: storedAudioUrl, audio_source: 'stored_file' } : {}),
    },
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

const CATEGORY_MAP: Record<ExerciseCategory, Array<(w: Vocabulary, l: Level) => GeneratedExercise>> = {
  grammar:   [buildMCQ, buildFillBlank, buildTranslation, buildSentenceBuilding],
  listening: [buildListening],
  speaking:  [buildSpeaking],
  all:       [buildMCQ, buildFillBlank, buildTranslation, buildSentenceBuilding, buildListening, buildSpeaking],
};

export function generateExercises(level: Level, count: number = 5, category: ExerciseCategory = 'all'): GeneratedExercise[] {
  const words = getWordsForReview(level, count);

  if (words.length === 0) {
    throw new Error(`No vocabulary found for level ${level}. Import vocabulary first.`);
  }

  // Ensure progress rows exist for all words
  ensureVocabProgressRows(words.map(w => w.id));

  const exercises: GeneratedExercise[] = [];
  const types = CATEGORY_MAP[category];

  for (let i = 0; i < count; i++) {
    const word = words[i % words.length] as Vocabulary;
    const builder = types[i % types.length];
    try {
      exercises.push(builder(word, level));
    } catch {
      // fallback to first type in category
      exercises.push(types[0](word, level));
    }
  }

  return exercises.slice(0, count);
}
