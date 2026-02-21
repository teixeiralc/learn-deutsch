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
  RoadMapResponse,
  StartRoadNodeResponse,
  CompleteRoadNodeResponse,
  RoadCheckpointResponse,
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

export const synthesizeSpeech = (text: string, voiceId?: string, signal?: AbortSignal) =>
  api.post('/tts', { text, voiceId }, { responseType: 'arraybuffer', signal }).then(r => r.data as ArrayBuffer);

// ─── Progress & Stats ─────────────────────────────────────────────────────────

export const getStats = () =>
  api.get<UserStats>('/stats').then(r => r.data);

export const getLessonProgress = () =>
  api.get<LessonResult[]>('/progress/lessons').then(r => r.data);

export const completeLesson = (level: Level, score: number, total_exercises: number) =>
  api.post<CompleteLessonResponse>('/progress/complete-lesson', { level, score, total_exercises }).then(r => r.data);

// ─── Road Mode ───────────────────────────────────────────────────────────────

export const getRoadMap = (level: Level, params?: { page?: number; pageSize?: number; hideCompleted?: boolean }) =>
  api.get<RoadMapResponse>(`/road/${level}`, { params }).then(r => r.data);

export const startRoadNode = (nodeId: number) =>
  api.post<StartRoadNodeResponse>(`/road/node/${nodeId}/start`).then(r => r.data);

export const checkpointRoadNode = (
  nodeId: number,
  payload: {
    run_id: number;
    exercise_index: number;
    is_correct: boolean;
    exercise_type: ExerciseType;
  }
) => api.post<RoadCheckpointResponse>(`/road/node/${nodeId}/checkpoint`, payload).then(r => r.data);

export const completeRoadNode = (
  nodeId: number,
  payload: {
    run_id?: number;
    correct?: number;
    total?: number;
    reading_correct?: number;
    reading_total?: number;
    listening_correct?: number;
    listening_total?: number;
    speaking_correct?: number;
    speaking_total?: number;
  }
) => api.post<CompleteRoadNodeResponse>(`/road/node/${nodeId}/complete`, payload).then(r => r.data);
