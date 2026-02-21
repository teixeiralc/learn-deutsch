export type Level = 'A1' | 'A2' | 'B1' | 'B2';

export type ExerciseType =
  | 'mcq'
  | 'fill_blank'
  | 'translation'
  | 'sentence_building'
  | 'listening'
  | 'speaking';

export type ExerciseCategory = 'all' | 'grammar' | 'listening' | 'speaking';

export type RoadNodeType = 'vocab' | 'context' | 'conversation';
export type RoadNodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface Vocabulary {
  id: number;
  german: string;
  english: string;
  part_of_speech: string;
  gender: string | null;
  plural: string | null;
  level: Level;
  frequency_rank: number | null;
  tags: string;
  created_at: string;
}

export interface VocabularyWithProgress extends Vocabulary {
  strength_score: number | null;
  interval: number | null;
  ease_factor: number | null;
  next_review_date: string | null;
  correct_count: number | null;
  incorrect_count: number | null;
  repetition_count: number | null;
}

export interface Sentence {
  id: number;
  german: string;
  english: string;
  difficulty_level: Level;
  source: string;
}

export interface GrammarTopic {
  id: number;
  name: string;
  level: Level;
  explanation: string;
  examples: string; // JSON string
}

export interface GeneratedExercise {
  id: string;
  type: ExerciseType;
  question: string;
  correct_answer: string;
  options?: string[];
  sentence_id?: number;
  vocabulary_id?: number;
  explanation: string;
  hint?: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  similarity_score: number;
  explanation: string;
  xp_earned: number;
  total_xp: number;
}

export interface SpeakingEvalResponse {
  is_correct: boolean;
  similarity_score: number;
  feedback: string;
  token_comparison: Array<{ word: string; correct: boolean }>;
}

export interface UserStats {
  id: 1;
  total_xp: number;
  streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  sessions_completed: number;
}

export interface LessonResult {
  lesson_level: Level;
  best_score: number;
  total_exercises: number;
  total_xp_earned: number;
  attempts: number;
  last_attempt: string;
}

export interface CompleteLessonResponse {
  xp_earned: number;
  total_xp: number;
  streak: number;
  sessions_completed: number;
}

export interface RoadTurn {
  turn_order: number;
  speaker: 'A' | 'B';
  german: string;
  english: string;
  focus_word: string;
}

export interface RoadNodeSummary {
  id: number;
  node_order: number;
  node_type: RoadNodeType;
  title: string;
  description: string;
  chapter_id: number;
  chapter_order: number;
  chapter_title: string;
  chapter_description: string;
  story_track_slug: string;
  story_track_title: string;
  status: RoadNodeStatus;
  unlocked: boolean;
  stars: number;
  best_score: number;
  attempts: number;
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

export interface StartRoadNodeResponse {
  node: RoadNodeSummary;
  turns: RoadTurn[];
  exercises: GeneratedExercise[];
  run_id: number;
  current_index: number;
}

export interface RoadCheckpointResponse {
  run_id: number;
  current_index: number;
  is_last: boolean;
}

export interface CompleteRoadNodeResponse {
  passed: boolean;
  stars: number;
  score: number;
  thresholds?: {
    reading: { passed: boolean; accuracy: number; required: number };
    listening: { passed: boolean; accuracy: number; required: number };
    speaking: {
      passed: boolean;
      accuracy: number;
      attempts: number;
      required_accuracy: number;
      required_attempts: number;
    };
  };
  node?: RoadNodeSummary;
}
