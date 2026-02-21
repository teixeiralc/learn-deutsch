import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { runMigrations } from '../src/db/database.js';
import db from '../src/db/database.js';

runMigrations();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const csvPathArg = process.argv[2];
const csvPath = csvPathArg
  ? resolve(csvPathArg)
  : resolve(__dirname, '../../scripts/sentences.csv');

interface SentenceRow {
  german: string;
  english: string;
  difficulty_level: string;
  vocabulary_words: string;
}

const insertSentence = db.prepare(`INSERT OR IGNORE INTO sentences (german, english, difficulty_level) VALUES (@german, @english, @difficulty_level)`);
const linkVocab = db.prepare(`INSERT OR IGNORE INTO sentence_vocabulary (sentence_id, vocabulary_id) SELECT ?, id FROM vocabulary WHERE german = ?`);

const insertAll = db.transaction((rows: SentenceRow[]) => {
  let linked = 0;
  for (const row of rows) {
    const result = insertSentence.run({ german: row.german, english: row.english, difficulty_level: row.difficulty_level });
    const sentenceId = result.lastInsertRowid;
    if (row.vocabulary_words && sentenceId) {
      const words = row.vocabulary_words.split(';').map(w => w.trim()).filter(Boolean);
      for (const word of words) { linkVocab.run(sentenceId, word); linked++; }
    }
  }
  console.log(`  Linked vocabulary references`);
});

async function importCSV() {
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let headers: string[] = [];
  const rows: SentenceRow[] = [];
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) { headers = line.split(',').map(h => h.trim()); continue; }
    if (!line.trim()) continue;
    const values: string[] = [];
    let inQuote = false, cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])) as unknown as SentenceRow;
    rows.push(row);
  }

  insertAll(rows);
  console.log(`✅ Imported ${rows.length} sentences from ${csvPath}`);
}

importCSV().catch(err => { console.error('❌ Import failed:', err); process.exit(1); });
