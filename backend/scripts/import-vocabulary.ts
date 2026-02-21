import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { runMigrations } from '../src/db/database.js';
import db from '../src/db/database.js';

runMigrations();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Accept path arg relative to project root scripts/ folder or absolute
const csvPathArg = process.argv[2];
const csvPath = csvPathArg
  ? resolve(csvPathArg)
  : resolve(__dirname, '../../scripts/vocabulary.csv');

interface VocabRow {
  german: string;
  english: string;
  part_of_speech: string;
  gender: string;
  plural: string;
  level: string;
  frequency_rank: string;
}

const insertVocab = db.prepare(`
  INSERT OR IGNORE INTO vocabulary (german, english, part_of_speech, gender, plural, level, frequency_rank)
  VALUES (@german, @english, @part_of_speech, @gender, @plural, @level, @frequency_rank)
`);

const insertAll = db.transaction((rows: VocabRow[]) => {
  for (const row of rows) {
    insertVocab.run({
      german: row.german,
      english: row.english,
      part_of_speech: row.part_of_speech || 'noun',
      gender: row.gender || null,
      plural: row.plural || null,
      level: row.level,
      frequency_rank: row.frequency_rank ? parseInt(row.frequency_rank) : null,
    });
  }
});

async function importCSV() {
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let headers: string[] = [];
  const rows: VocabRow[] = [];
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) { headers = line.split(',').map(h => h.trim()); continue; }
    if (!line.trim()) continue;
    const values = line.split(',').map(v => v.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])) as unknown as VocabRow;
    rows.push(row);
  }

  insertAll(rows);
  console.log(`✅ Imported ${rows.length} vocabulary words from ${csvPath}`);
}

importCSV().catch(err => { console.error('❌ Import failed:', err); process.exit(1); });
