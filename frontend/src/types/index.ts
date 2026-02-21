export type Level = 'A1' | 'A2' | 'B1' | 'B2';

export type ExerciseType =
  | 'mcq'
  | 'fill_blank'
  | 'translation'
  | 'sentence_building'
  | 'listening'
  | 'speaking';

export type ExerciseCategory = 'all' | 'grammar' | 'listening' | 'speaking';

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
