import { Router } from 'express';
import type { Level } from '../types/index.js';
import { checkpointRoadNode, completeRoadNode, getRoadMap, startRoadNode } from '../services/road-engine.js';

const router = Router();

router.get('/:level', (req, res) => {
  const level = req.params.level as Level;
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 12);
  const hideCompleted = String(req.query.hideCompleted ?? 'false').toLowerCase() === 'true';

  if (!['A1', 'A2', 'B1', 'B2'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level.' });
  }

  try {
    const payload = getRoadMap(level, { page, pageSize, hideCompleted });
    res.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load road map.';
    res.status(500).json({ error: message });
  }
});

router.post('/node/:nodeId/start', (req, res) => {
  const nodeId = Number(req.params.nodeId);
  if (!Number.isFinite(nodeId) || nodeId <= 0) {
    return res.status(400).json({ error: 'Invalid node id.' });
  }

  try {
    const payload = startRoadNode(nodeId);
    res.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start node.';
    if (message.toLowerCase().includes('locked')) {
      return res.status(403).json({ error: message });
    }
    res.status(400).json({ error: message });
  }
});

router.post('/node/:nodeId/checkpoint', (req, res) => {
  const nodeId = Number(req.params.nodeId);
  const runId = Number(req.body?.run_id);
  const exerciseIndex = Number(req.body?.exercise_index);
  const isCorrect = req.body?.is_correct === true || req.body?.is_correct === 'true' || req.body?.is_correct === 1 || req.body?.is_correct === '1';
  const exerciseType = String(req.body?.exercise_type ?? '').trim();

  if (!Number.isFinite(nodeId) || nodeId <= 0) {
    return res.status(400).json({ error: 'Invalid node id.' });
  }
  if (!Number.isFinite(runId) || runId <= 0) {
    return res.status(400).json({ error: 'Invalid run id.' });
  }
  if (!Number.isFinite(exerciseIndex) || exerciseIndex < 0) {
    return res.status(400).json({ error: 'Invalid exercise index.' });
  }
  if (!exerciseType) {
    return res.status(400).json({ error: 'exercise_type is required.' });
  }

  try {
    const payload = checkpointRoadNode(nodeId, {
      run_id: runId,
      exercise_index: exerciseIndex,
      is_correct: isCorrect,
      exercise_type: exerciseType,
    });
    res.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to checkpoint road run.';
    res.status(400).json({ error: message });
  }
});

router.post('/node/:nodeId/complete', (req, res) => {
  const nodeId = Number(req.params.nodeId);
  const run_id = Number(req.body?.run_id);
  const correct = Number(req.body?.correct ?? 0);
  const total = Number(req.body?.total ?? 0);
  const reading_correct = Number(req.body?.reading_correct ?? 0);
  const reading_total = Number(req.body?.reading_total ?? 0);
  const listening_correct = Number(req.body?.listening_correct ?? 0);
  const listening_total = Number(req.body?.listening_total ?? 0);
  const speaking_correct = Number(req.body?.speaking_correct ?? 0);
  const speaking_total = Number(req.body?.speaking_total ?? 0);

  if (!Number.isFinite(nodeId) || nodeId <= 0) {
    return res.status(400).json({ error: 'Invalid node id.' });
  }
  if ((!Number.isFinite(run_id) || run_id <= 0) && (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0)) {
    return res.status(400).json({ error: 'Provide run_id or a valid correct/total payload.' });
  }

  try {
    const payload = completeRoadNode(nodeId, {
      run_id: Number.isFinite(run_id) && run_id > 0 ? run_id : undefined,
      correct,
      total,
      reading_correct,
      reading_total,
      listening_correct,
      listening_total,
      speaking_correct,
      speaking_total,
    });
    res.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete node.';
    res.status(400).json({ error: message });
  }
});

export default router;
