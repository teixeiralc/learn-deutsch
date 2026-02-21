import axios from 'axios';
import type {
  Vocabulary,
  VocabularyWithProgress,
  GeneratedExercise,
  Level,
  ExerciseCategory,
  GrammarTopic,
  SubmitAnswerResponse,
  SpeakingEvalResponse,
  UserStats,
  LessonResult,
  CompleteLessonResponse,
  ExerciseType,
} from '../types';

const api = axios.create({ baseURL: '/api' });

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export const getVocabulary = (level?: Level, search?: string) =>
  api.get<Vocabulary[]>('/vocabulary', { params: { level, search } }).then(r => r.data);

export const getVocabularyProgress = (level?: Level) =>
  api.get<VocabularyWithProgress[]>('/progress/vocabulary', { params: { level } }).then(r => r.data);

// ─── Grammar ──────────────────────────────────────────────────────────────────

export const getGrammarTopics = (level?: Level) =>
  api.get<GrammarTopic[]>('/grammar-topics', { params: { level } }).then(r => r.data);

// ─── Exercises ────────────────────────────────────────────────────────────────

export const generateExercises = (level: Level, count = 5, category: ExerciseCategory = 'all') =>
  api.post<GeneratedExercise[]>('/exercises/generate', { level, count, category }).then(r => r.data);

export const submitAnswer = (payload: {
  type: ExerciseType;
  vocabulary_id?: number;
  sentence_id?: number;
  user_answer: string;
  correct_answer: string;
}) =>
  api.post<SubmitAnswerResponse>('/exercises/submit', payload).then(r => r.data);

export const evaluateSpeaking = (expected_sentence: string, user_transcript: string) =>
  api.post<SpeakingEvalResponse>('/exercises/evaluate-speaking', { expected_sentence, user_transcript }).then(r => r.data);

// ─── Progress & Stats ─────────────────────────────────────────────────────────

export const getStats = () =>
  api.get<UserStats>('/stats').then(r => r.data);

export const getLessonProgress = () =>
  api.get<LessonResult[]>('/progress/lessons').then(r => r.data);

export const completeLesson = (level: Level, score: number, total_exercises: number) =>
  api.post<CompleteLessonResponse>('/progress/complete-lesson', { level, score, total_exercises }).then(r => r.data);
