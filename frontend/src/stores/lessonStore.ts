import { create } from 'zustand';
import type { GeneratedExercise, Level, SubmitAnswerResponse } from '../types';
import { generateExercises, submitAnswer, completeLesson } from '../services/api';

interface AnswerRecord {
  exercise: GeneratedExercise;
  userAnswer: string;
  result: SubmitAnswerResponse;
}

interface LessonStore {
  exercises: GeneratedExercise[];
  currentIndex: number;
  answers: AnswerRecord[];
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  lastXpEarned: number;

  loadExercises: (level: Level) => Promise<void>;
  submitCurrentAnswer: (userAnswer: string) => Promise<SubmitAnswerResponse>;
  nextExercise: () => void;
  finishLesson: (level: Level) => Promise<{ xp_earned: number; streak: number }>;
  reset: () => void;
}

export const useLessonStore = create<LessonStore>((set, get) => ({
  exercises: [],
  currentIndex: 0,
  answers: [],
  isLoading: false,
  isComplete: false,
  error: null,
  lastXpEarned: 0,

  loadExercises: async (level) => {
    set({ isLoading: true, error: null, exercises: [], currentIndex: 0, answers: [], isComplete: false });
    try {
      const exercises = await generateExercises(level, 6);
      set({ exercises, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load exercises. Make sure vocabulary is imported.', isLoading: false });
    }
  },

  submitCurrentAnswer: async (userAnswer) => {
    const { exercises, currentIndex, answers } = get();
    const exercise = exercises[currentIndex];
    const result = await submitAnswer({
      type: exercise.type,
      vocabulary_id: exercise.vocabulary_id,
      sentence_id: exercise.sentence_id,
      user_answer: userAnswer,
      correct_answer: exercise.correct_answer,
    });
    set({ answers: [...answers, { exercise, userAnswer, result }] });
    return result;
  },

  nextExercise: () => {
    const { currentIndex, exercises } = get();
    if (currentIndex + 1 >= exercises.length) {
      set({ isComplete: true });
    } else {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  finishLesson: async (level) => {
    const { answers, exercises } = get();
    const correct = answers.filter(a => a.result.is_correct).length;
    const result = await completeLesson(level, correct, exercises.length);
    set({ lastXpEarned: result.xp_earned });
    return result;
  },

  reset: () => set({
    exercises: [], currentIndex: 0, answers: [], isLoading: false,
    isComplete: false, error: null, lastXpEarned: 0,
  }),
}));
