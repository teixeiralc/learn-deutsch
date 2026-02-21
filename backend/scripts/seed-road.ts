import { runMigrations } from '../src/db/database.js';
import { seedRoadData } from '../src/services/road-seed.js';

try {
  runMigrations();
  seedRoadData({ reset: true });
  console.log('Road content seeded successfully.');
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  console.error(`Road seed failed: ${message}`);
  process.exit(1);
}
