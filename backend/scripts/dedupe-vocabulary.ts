// Deduplication script: keeps the lowest ID for each (german, level) pair and deletes duplicates
import { runMigrations } from '../src/db/database.js';
import db from '../src/db/database.js';

runMigrations();

// Delete duplicates keeping the first (lowest id) occurrence of each (german, level)
const result = db.prepare(`
  DELETE FROM vocabulary
  WHERE id NOT IN (
    SELECT MIN(id) FROM vocabulary GROUP BY german, level
  )
`).run();

console.log(`✅ Removed ${result.changes} duplicate vocabulary entries`);

// Verify
const count = (db.prepare('SELECT COUNT(*) as n FROM vocabulary').get() as { n: number }).n;
console.log(`📚 Vocabulary table now has ${count} words`);
