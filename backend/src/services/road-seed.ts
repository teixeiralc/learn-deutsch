import db from '../db/database.js';
import { ROAD_STORY_SEEDS } from './road-content.js';

interface SeedRoadOptions {
  reset?: boolean;
}

export function hasRoadData(): boolean {
  const trackRow = db.prepare('SELECT COUNT(*) as count FROM story_tracks').get() as { count: number };
  if (trackRow.count < 100) {
    return false;
  }

  const levelRows = db.prepare(`
    SELECT level, COUNT(*) as count
    FROM story_chapters
    GROUP BY level
  `).all() as Array<{ level: string; count: number }>;

  const perLevel = new Map(levelRows.map((row) => [row.level, row.count]));
  return ['A1', 'A2', 'B1', 'B2'].every((level) => (perLevel.get(level) ?? 0) >= 100);
}

export function seedRoadData(options: SeedRoadOptions = {}): void {
  const { reset = false } = options;

  const insertTrack = db.prepare(`
    INSERT INTO story_tracks (slug, title, description)
    VALUES (?, ?, ?)
  `);

  const insertChapter = db.prepare(`
    INSERT INTO story_chapters (track_id, level, chapter_order, title, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertTurn = db.prepare(`
    INSERT INTO story_turns (chapter_id, turn_order, speaker, german, english, focus_word)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertNode = db.prepare(`
    INSERT INTO road_nodes (chapter_id, node_order, node_type, title, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const existingTracks = db.prepare('SELECT COUNT(*) as count FROM story_tracks').get() as { count: number };

    if (reset) {
      db.exec('DELETE FROM road_node_runs');
      db.exec('DELETE FROM road_skill_progress');
      db.exec('DELETE FROM road_progress');
      db.exec('DELETE FROM road_nodes');
      db.exec('DELETE FROM story_turns');
      db.exec('DELETE FROM story_chapters');
      db.exec('DELETE FROM story_tracks');
    }

    if (!reset && hasRoadData()) {
      return;
    }

    if (!reset && existingTracks.count > 0) {
      db.exec('DELETE FROM road_node_runs');
      db.exec('DELETE FROM road_skill_progress');
      db.exec('DELETE FROM road_progress');
      db.exec('DELETE FROM road_nodes');
      db.exec('DELETE FROM story_turns');
      db.exec('DELETE FROM story_chapters');
      db.exec('DELETE FROM story_tracks');
    }

    for (const track of ROAD_STORY_SEEDS) {
      const trackResult = insertTrack.run(track.slug, track.title, track.description);
      const trackId = Number(trackResult.lastInsertRowid);

      for (const chapter of track.chapters) {
        const chapterResult = insertChapter.run(
          trackId,
          chapter.level,
          chapter.chapter_order,
          chapter.title,
          chapter.description
        );
        const chapterId = Number(chapterResult.lastInsertRowid);

        chapter.turns.forEach((turn, index) => {
          insertTurn.run(
            chapterId,
            index + 1,
            turn.speaker,
            turn.german,
            turn.english,
            turn.focus_word
          );
        });

        insertNode.run(chapterId, 1, 'vocab', `${chapter.title}: Core Words`, 'Learn the key words before the dialogue.');
        insertNode.run(chapterId, 2, 'context', `${chapter.title}: In Context`, 'Use the same words inside short dialogue chunks.');
        insertNode.run(chapterId, 3, 'conversation', `${chapter.title}: Full Dialogue`, 'Understand and produce complete conversation turns.');
      }
    }
  });

  tx();
}

export function ensureRoadData(): void {
  seedRoadData({ reset: false });
}
