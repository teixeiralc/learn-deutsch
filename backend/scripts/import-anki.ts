import { existsSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/database.js';
import db from '../src/db/database.js';

type Level = 'A1' | 'A2' | 'B1' | 'B2';

interface RawNoteRow {
  id: number;
  flds: Buffer | string;
}

interface ParsedEnglish {
  meanings: string[];
  exampleSentence: string | null;
}

interface ParsedGerman {
  word: string;
  gender: string | null;
  plural: string | null;
  grammarInfo: string | null;
  exampleSentence: string | null;
  relatedWords: string[];
  audioFilename: string | null;
}

const DEFAULT_LEVEL: Level = 'A1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function decodeFlds(value: Buffer | string): string {
  return Buffer.isBuffer(value) ? value.toString('utf-8') : value;
}

function clean(text: string): string {
  return text
    .replace(/\[sound:[^\]]+\]/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r/g, '')
    .trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function toLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseEnglishField(raw: string): ParsedEnglish {
  const lines = toLines(decodeHtmlEntities(stripHtml(clean(raw))));
  const meanings = (lines[0] ?? '')
    .split(',')
    .map((meaning) => meaning.trim())
    .filter(Boolean);
  const exampleSentence = lines[1] ?? null;

  return { meanings, exampleSentence };
}

function extractWordAndPlural(line: string): { word: string; plural: string | null } {
  const pluralMatch = line.match(/\(([^)]+)\)/);
  const plural = pluralMatch ? pluralMatch[1].trim() : null;
  const word = line.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return { word, plural };
}

function extractGender(line: string): { word: string; gender: string | null } {
  const match = line.match(/^(der|die|das)\s+(.+)$/i);
  if (!match) {
    return { word: line, gender: null };
  }

  return {
    word: match[2].trim(),
    gender: match[1].toLowerCase(),
  };
}

function parseGermanField(raw: string): ParsedGerman {
  const audioRaw = raw.match(/\[sound:(.*?)\]/i)?.[1]?.trim() || '';
  const audioFilename = audioRaw ? basename(audioRaw) : null;
  const lines = toLines(decodeHtmlEntities(stripHtml(clean(raw))));

  const firstLine = lines[0] ?? '';
  const { word: wordWithNoPlural, plural } = extractWordAndPlural(firstLine);
  const { word, gender } = extractGender(wordWithNoPlural);

  const grammarLines = lines.filter((line) => /(?:Conj:|Case:)/i.test(line));
  const grammarInfo = grammarLines.length > 0 ? grammarLines.join(' | ') : null;

  const exampleSentence = lines.find(
    (line) => line.endsWith('.') && !/(?:Conj:|Case:)/i.test(line)
  ) ?? null;

  const relatedWords = lines.filter(
    (line, index) => index > 0 && line !== exampleSentence && !/(?:Conj:|Case:)/i.test(line)
  );

  return {
    word,
    gender,
    plural,
    grammarInfo,
    exampleSentence,
    relatedWords,
    audioFilename,
  };
}

function resolveCollectionPath(): string {
  const argPath = process.argv[2];
  if (argPath) {
    return resolve(argPath);
  }

  const candidates = [
    resolve(__dirname, '../../collection.anki2'),
    resolve(__dirname, '../resources/anki-decks/collection.anki2'),
    resolve(__dirname, '../resources/anki-decks/collection.anki21'),
  ];

  const existing = candidates.find((candidate) => existsSync(candidate));
  return existing ?? candidates[0];
}

function importAnkiCollection() {
  const collectionPath = resolveCollectionPath();
  if (!existsSync(collectionPath)) {
    throw new Error(`collection.anki2 not found at ${collectionPath}`);
  }

  runMigrations();

  const ankiDb = new Database(collectionPath, {
    readonly: true,
    fileMustExist: true,
  });

  const notes = ankiDb.prepare('SELECT id, flds FROM notes').all() as RawNoteRow[];

  const insertVocabulary = db.prepare(`
    INSERT OR IGNORE INTO vocabulary (german, english, part_of_speech, gender, plural, level)
    VALUES (?, ?, 'noun', ?, ?, ?)
  `);

  const selectVocabularyId = db.prepare(`
    SELECT id FROM vocabulary WHERE german = ? AND level = ?
  `);

  const insertMeaning = db.prepare(`
    INSERT OR IGNORE INTO vocabulary_meanings (vocabulary_id, meaning, position)
    VALUES (?, ?, ?)
  `);

  const upsertMetadata = db.prepare(`
    INSERT INTO vocabulary_metadata (vocabulary_id, audio_filename, grammar_info, related_words, source_note_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(vocabulary_id) DO UPDATE SET
      audio_filename = COALESCE(vocabulary_metadata.audio_filename, excluded.audio_filename),
      grammar_info = CASE
        WHEN vocabulary_metadata.grammar_info IS NULL OR vocabulary_metadata.grammar_info = ''
          THEN excluded.grammar_info
        ELSE vocabulary_metadata.grammar_info
      END,
      related_words = CASE
        WHEN vocabulary_metadata.related_words IS NULL OR vocabulary_metadata.related_words = '[]'
          THEN excluded.related_words
        ELSE vocabulary_metadata.related_words
      END,
      source_note_id = COALESCE(vocabulary_metadata.source_note_id, excluded.source_note_id)
  `);

  const selectSentenceId = db.prepare(`
    SELECT id FROM sentences WHERE german = ? AND english = ?
  `);

  const insertSentence = db.prepare(`
    INSERT INTO sentences (german, english, difficulty_level, source)
    VALUES (?, ?, ?, 'anki')
  `);

  const linkSentenceVocabulary = db.prepare(`
    INSERT OR IGNORE INTO sentence_vocabulary (sentence_id, vocabulary_id)
    VALUES (?, ?)
  `);

  let totalNotesProcessed = notes.length;
  let vocabularyInserted = 0;
  let sentencesInserted = 0;
  let malformedNotesSkipped = 0;

  const transaction = db.transaction((rows: RawNoteRow[]) => {
    for (const row of rows) {
      const decoded = decodeFlds(row.flds);
      const fields = decoded.split('\x1f');

      if (fields.length !== 2) {
        malformedNotesSkipped++;
        continue;
      }

      const english = parseEnglishField(fields[0]);
      const german = parseGermanField(fields[1]);

      if (!german.word || english.meanings.length === 0) {
        malformedNotesSkipped++;
        continue;
      }

      let vocabularyRow = selectVocabularyId.get(german.word, DEFAULT_LEVEL) as { id: number } | undefined;
      if (!vocabularyRow) {
        const englishSummary = english.meanings.join(', ');
        insertVocabulary.run(
          german.word,
          englishSummary,
          german.gender,
          german.plural,
          DEFAULT_LEVEL
        );
        vocabularyInserted++;
        vocabularyRow = selectVocabularyId.get(german.word, DEFAULT_LEVEL) as { id: number } | undefined;
      }

      const vocabularyId = vocabularyRow?.id;
      if (!vocabularyId) {
        malformedNotesSkipped++;
        continue;
      }

      english.meanings.forEach((meaning, index) => {
        insertMeaning.run(vocabularyId, meaning, index);
      });

      upsertMetadata.run(
        vocabularyId,
        german.audioFilename,
        german.grammarInfo,
        JSON.stringify(german.relatedWords),
        row.id
      );

      if (german.exampleSentence && english.exampleSentence) {
        const existingSentence = selectSentenceId.get(german.exampleSentence, english.exampleSentence) as
          | { id: number }
          | undefined;

        let sentenceId = existingSentence?.id;
        if (!sentenceId) {
          const sentenceResult = insertSentence.run(
            german.exampleSentence,
            english.exampleSentence,
            DEFAULT_LEVEL
          );
          sentenceId = Number(sentenceResult.lastInsertRowid);
          sentencesInserted++;
        }

        linkSentenceVocabulary.run(sentenceId, vocabularyId);
      }
    }
  });

  transaction(notes);
  ankiDb.close();

  console.log('Import complete.');
  console.log(`Total notes processed: ${totalNotesProcessed}`);
  console.log(`Total vocabulary inserted: ${vocabularyInserted}`);
  console.log(`Total sentences inserted: ${sentencesInserted}`);
  console.log(`Total malformed skipped: ${malformedNotesSkipped}`);
}

try {
  importAnkiCollection();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown import error';
  console.error(`Import failed: ${message}`);
  process.exit(1);
}
