export interface Vocabulary {
  id: number;
  german: string;
  english: string;
  part_of_speech: string;
  gender: string | null;
  plural: string | null;
  level: Level;
  frequency_rank: number | null;
  tags: string; // JSON
  created_at: string;
}

export interface Sentence {
  id: number;
  german: string;
  english: string;
  difficulty_level: Level;
  source: string;
  created_at: string;
}

export interface GrammarTopic {
  id: number;
  name: string;
  level: Level;
  explanation: string;
  examples: string; // JSON
}

export interface VocabularyProgress {
  vocabulary_id: number;
  repetition_count: number;
  interval: number;
  ease_factor: number;
  correct_count: number;
  incorrect_count: number;
  strength_score: number;
  last_seen: string | null;
  next_review_date: string;
}

export interface LessonProgress {
  id: number;
  lesson_level: Level;
  score: number;
  total_exercises: number;
  xp_earned: number;
  last_attempt: string;
}

export interface Mistake {
  id: number;
  exercise_type: string;
  vocabulary_id: number | null;
  sentence_id: number | null;
  user_answer: string;
  correct_answer: string;
  similarity_score: number | null;
  mistake_type: string | null;
  created_at: string;
}

export interface UserStats {
  id: 1;
  total_xp: number;
  streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  sessions_completed: number;
}

export type Level = 'A1' | 'A2' | 'B1' | 'B2';

export type ExerciseType =
  | 'mcq'
  | 'fill_blank'
  | 'translation'
  | 'sentence_building'
  | 'listening'
  | 'speaking';

export type ExerciseCategory = 'all' | 'grammar' | 'listening' | 'speaking';

export interface GeneratedExercise {
  id: string; // ephemeral, for the session
  type: ExerciseType;
  question: string;
  correct_answer: string;
  options?: string[]; // for MCQ
  sentence_id?: number;
  vocabulary_id?: number;
  explanation: string;
  hint?: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitAnswerRequest {
  type: ExerciseType;
  vocabulary_id?: number;
  sentence_id?: number;
  user_answer: string;
  correct_answer: string;
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  similarity_score: number;
  explanation: string;
  xp_earned: number;
}

export interface GenerateExercisesRequest {
  level: Level;
  count?: number;
  category?: ExerciseCategory;
}

export interface EvaluateSpeakingRequest {
  expected_sentence: string;
  user_transcript: string;
}

export interface EvaluateSpeakingResponse {
  is_correct: boolean;
  similarity_score: number;
  feedback: string;
  token_comparison: Array<{ word: string; correct: boolean }>;
}
