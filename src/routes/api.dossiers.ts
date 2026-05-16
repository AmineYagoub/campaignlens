import { Hono } from 'hono';
import { getDevvitContext } from '../devvit/context';
import { listActiveDossiers, getDossier } from '../services/dossier.service';
import { handleFeedback } from '../services/feedback.service';
import { createActionPreview } from '../services/action-draft.service';
import { ALL_ENFORCEMENT_ACTION_KINDS } from '../services/enforcement-policy.service';
import type { EnforcementActionKind } from '../types/action';
import type { DossierFeedback, EvidenceDossier, ReplayGraph, ReplayNode } from '../types/dossier';
import { readJsonBody } from './request';

const VALID_FEEDBACK: DossierFeedback[] = [
  'WATCH',
  'IGNORE',
  'BENIGN',
  'CONFIRMED_CAMPAIGN',
  'FALSE_POSITIVE',
  'ESCALATE',
];

export const apiDossiers = new Hono().basePath('/api/dossiers');

apiDossiers.get('/', async (c) => {
  try {
    const dossiers = await listActiveDossiers();
    return c.json(dossiers);
  } catch {
    return c.json({ error: 'Failed to fetch dossiers' }, 500);
  }
});

apiDossiers.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const dossier = await getDossier(id);
    if (!dossier) {
      return c.json({ error: 'Dossier not found' }, 404);
    }
    return c.json(dossier);
  } catch {
    return c.json({ error: 'Failed to fetch dossier' }, 500);
  }
});

apiDossiers.post('/:id/feedback', async (c) => {
  const id = c.req.param('id');
  const body = await readJsonBody<{ feedback?: DossierFeedback }>(c);
  if (body instanceof Response) return body;
  const feedback = body?.feedback;

  if (!feedback) {
    return c.json({ error: 'Missing feedback' }, 400);
  }

  if (!VALID_FEEDBACK.includes(feedback)) {
    return c.json({ error: 'Invalid feedback' }, 400);
  }

  await handleFeedback(id, feedback);

  const updated = await getDossier(id);
  if (!updated) {
    return c.json({ error: 'Dossier not found' }, 404);
  }

  return c.json(updated);
});

apiDossiers.post('/:id/action-preview', async (c) => {
  const id = c.req.param('id');
  const dossier = await getDossier(id);
  if (!dossier) {
    return c.json({ error: 'Dossier not found' }, 404);
  }

  const devvitContext = getDevvitContext();
  if (!devvitContext.subredditName) {
    return c.json({ error: 'Could not resolve current subreddit' }, 400);
  }

  const body = await readJsonBody<{
    selectedContentIds?: unknown;
    actionKinds?: unknown;
    idempotencyKey?: unknown;
  }>(c);
  if (body instanceof Response) return body;

  if (!Array.isArray(body.selectedContentIds) || !body.selectedContentIds.every((id) => typeof id === 'string')) {
    return c.json({ error: 'selectedContentIds must be an array of Reddit content IDs' }, 400);
  }

  if (!Array.isArray(body.actionKinds) || !body.actionKinds.every((kind) => typeof kind === 'string')) {
    return c.json({ error: 'actionKinds must be an array of action kind strings' }, 400);
  }

  const actionKinds = body.actionKinds as EnforcementActionKind[];
  const invalidActionKind = actionKinds.find((kind) => !ALL_ENFORCEMENT_ACTION_KINDS.includes(kind));
  if (invalidActionKind) {
    return c.json({ error: `Invalid action kind: ${invalidActionKind}` }, 400);
  }

  try {
    const previewInput = {
      dossierId: id,
      selectedContentIds: body.selectedContentIds,
      actionKinds,
      subredditName: devvitContext.subredditName,
      ...(typeof body.idempotencyKey === 'string' ? { idempotencyKey: body.idempotencyKey } : {}),
    };
    const preview = await createActionPreview(previewInput);

    return c.json(preview);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Action preview failed' }, 400);
  }
});

apiDossiers.get('/:id/replay', async (c) => {
  try {
    const id = c.req.param('id');
    const dossier = await getDossier(id);
    if (!dossier) {
      return c.json({ error: 'Dossier not found' }, 404);
    }
    return c.json(dossier.replayGraph ?? buildReplayGraph(dossier));
  } catch {
    return c.json({ error: 'Failed to fetch dossier replay' }, 500);
  }
});

export function buildReplayGraph(dossier: EvidenceDossier): ReplayGraph {
  const timestamps = dossier.examples.map((example) => example.createdAt);
  const { min: start, max: end } = minMax(timestamps, dossier.createdAt, dossier.updatedAt);
  const signalLabel = dossier.signalKey.includes(':')
    ? dossier.signalKey.split(':').slice(1).join(':')
    : dossier.signalKey;

  const domainNode: ReplayNode = {
    id: `signal:${dossier.signalKey}`,
    kind: dossier.signalKey.startsWith('domain:') ? 'domain' : 'phrase',
    label: signalLabel,
    timestamp: start,
    weight: Math.max(1, dossier.score.total),
  };

  const nodeMap = new Map<string, ReplayNode>([[domainNode.id, domainNode]]);
  const edges: ReplayGraph['edges'] = [];

  for (const [index, example] of dossier.examples.entries()) {
    const threadId = `thread:${example.threadId || index}`;
    if (!nodeMap.has(threadId)) {
      nodeMap.set(threadId, {
        id: threadId,
        kind: 'thread',
        label: example.threadId || `Example ${index + 1}`,
        timestamp: example.createdAt,
        weight: 1,
      });
    }
    edges.push({ source: domainNode.id, target: threadId, kind: 'mentioned_in' });

    for (const fragment of example.matchedFragments) {
      const fragmentId = `fragment:${fragment.toLowerCase()}`;
      if (!nodeMap.has(fragmentId)) {
        nodeMap.set(fragmentId, {
          id: fragmentId,
          kind: 'phrase',
          label: fragment,
          timestamp: example.createdAt,
          weight: 1,
        });
      }
      edges.push({ source: threadId, target: fragmentId, kind: 'contains' });
    }

    for (const flag of example.flags) {
      const flagId = `flag:${flag.toLowerCase()}`;
      if (!nodeMap.has(flagId)) {
        nodeMap.set(flagId, {
          id: flagId,
          kind: 'obfuscation',
          label: flag,
          timestamp: example.createdAt,
          weight: 1,
        });
      }
      edges.push({ source: threadId, target: flagId, kind: 'flagged' });
    }
  }

  return {
    nodes: [...nodeMap.values()],
    edges,
    timeRange: { start, end },
    domainNode,
  };
}

function minMax(values: number[], fallbackMin: number, fallbackMax: number): { min: number; max: number } {
  if (values.length === 0) return { min: fallbackMin, max: fallbackMax };

  let min = values[0]!;
  let max = values[0]!;
  for (const value of values.slice(1)) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}
