import { create } from 'zustand';
import type {
  CompleteRoadNodeResponse,
  ExerciseType,
  GeneratedExercise,
  Level,
  RoadNodeSummary,
  RoadTurn,
} from '../types';
import {
  checkpointRoadNode,
  completeRoadNode,
  getRoadMap,
  startRoadNode,
} from '../services/api';

interface RoadStore {
  level: Level;
  nodes: RoadNodeSummary[];
  isLoadingMap: boolean;
  mapError: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  hideCompleted: boolean;
  totalStories: number;
  completedStories: number;
  visibleStories: number;
  totalNodes: number;
  completedNodes: number;
  remainingNodes: number;

  activeNode: RoadNodeSummary | null;
  activeTurns: RoadTurn[];
  activeExercises: GeneratedExercise[];
  activeRunId: number | null;
  activeIndex: number;
  isLoadingNode: boolean;
  nodeError: string | null;

  loadRoadMap: (level: Level, options?: { page?: number; hideCompleted?: boolean }) => Promise<void>;
  setRoadPage: (page: number) => Promise<void>;
  toggleHideCompleted: (next?: boolean) => Promise<void>;
  startNode: (nodeId: number) => Promise<void>;
  checkpointNode: (nodeId: number, payload: {
    run_id: number;
    exercise_index: number;
    is_correct: boolean;
    exercise_type: ExerciseType;
  }) => Promise<{ current_index: number; is_last: boolean }>;
  completeNode: (
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
  ) => Promise<CompleteRoadNodeResponse>;
  clearActiveNode: () => void;
}

export const useRoadStore = create<RoadStore>((set, get) => ({
  level: 'A1',
  nodes: [],
  isLoadingMap: false,
  mapError: null,
  page: 1,
  pageSize: 12,
  totalPages: 1,
  hideCompleted: false,
  totalStories: 0,
  completedStories: 0,
  visibleStories: 0,
  totalNodes: 0,
  completedNodes: 0,
  remainingNodes: 0,

  activeNode: null,
  activeTurns: [],
  activeExercises: [],
  activeRunId: null,
  activeIndex: 0,
  isLoadingNode: false,
  nodeError: null,

  loadRoadMap: async (level, options) => {
    const current = get();
    const nextPage = options?.page ?? current.page;
    const nextHide = options?.hideCompleted ?? current.hideCompleted;

    set({
      isLoadingMap: true,
      mapError: null,
      level,
      page: nextPage,
      hideCompleted: nextHide,
    });

    try {
      const data = await getRoadMap(level, {
        page: nextPage,
        pageSize: current.pageSize,
        hideCompleted: nextHide,
      });

      set({
        nodes: data.nodes,
        page: data.page,
        pageSize: data.page_size,
        totalPages: data.total_pages,
        hideCompleted: data.hide_completed,
        totalStories: data.total_stories,
        completedStories: data.completed_stories,
        visibleStories: data.visible_stories,
        totalNodes: data.total_nodes,
        completedNodes: data.completed_nodes,
        remainingNodes: data.remaining_nodes,
        isLoadingMap: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load road map.';
      set({ mapError: message, isLoadingMap: false });
    }
  },

  setRoadPage: async (page) => {
    const current = get();
    await current.loadRoadMap(current.level, { page });
  },

  toggleHideCompleted: async (next) => {
    const current = get();
    const hideCompleted = typeof next === 'boolean' ? next : !current.hideCompleted;
    await current.loadRoadMap(current.level, { page: 1, hideCompleted });
  },

  startNode: async (nodeId) => {
    set({
      isLoadingNode: true,
      nodeError: null,
      activeNode: null,
      activeTurns: [],
      activeExercises: [],
      activeRunId: null,
      activeIndex: 0,
    });

    try {
      const data = await startRoadNode(nodeId);
      set({
        activeNode: data.node,
        activeTurns: data.turns,
        activeExercises: data.exercises,
        activeRunId: data.run_id,
        activeIndex: data.current_index,
        isLoadingNode: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start road node.';
      set({ nodeError: message, isLoadingNode: false });
    }
  },

  checkpointNode: async (nodeId, payload) => {
    const data = await checkpointRoadNode(nodeId, payload);
    set({ activeIndex: data.current_index });
    return { current_index: data.current_index, is_last: data.is_last };
  },

  completeNode: async (nodeId, payload) => {
    const result = await completeRoadNode(nodeId, payload);
    const current = get();
    await current.loadRoadMap(current.level, { page: current.page, hideCompleted: current.hideCompleted });
    return result;
  },

  clearActiveNode: () => {
    set({
      activeNode: null,
      activeTurns: [],
      activeExercises: [],
      activeRunId: null,
      activeIndex: 0,
      nodeError: null,
    });
  },
}));
