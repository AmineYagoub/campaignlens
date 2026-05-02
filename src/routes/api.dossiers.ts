import { Hono } from 'hono';
import { listActiveDossiers, getDossier } from '../services/dossier.service';
import { handleFeedback } from '../services/feedback.service';
import type { DossierAction, EvidenceDossier, ReplayGraph, ReplayNode } from '../types/dossier';

const VALID_ACTIONS: DossierAction[] = [
  'WATCH',
  'IGNORE',
  'BENIGN',
  'CONFIRMED_CAMPAIGN',
  'FALSE_POSITIVE',
  'ESCALATE',
];

export const apiDossiers = new Hono().basePath('/api/dossiers');

apiDossiers.get('/', async (c) => {
  const dossiers = await listActiveDossiers();
  return c.json(dossiers);
});

apiDossiers.get('/:id', async (c) => {
  const id = c.req.param('id');
  const dossier = await getDossier(id);
  if (!dossier) {
    return c.json({ error: 'Dossier not found' }, 404);
  }
  return c.json(dossier);
});

apiDossiers.post('/:id/action', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ action?: DossierAction }>();
  const action = body?.action;

  if (!action) {
    return c.json({ error: 'Missing action' }, 400);
  }

  if (!VALID_ACTIONS.includes(action)) {
    return c.json({ error: 'Invalid action' }, 400);
  }

  await handleFeedback(id, action);

  const updated = await getDossier(id);
  if (!updated) {
    return c.json({ error: 'Dossier not found' }, 404);
  }

  return c.json(updated);
});

apiDossiers.get('/:id/replay', async (c) => {
  const id = c.req.param('id');
  const dossier = await getDossier(id);
  if (!dossier) {
    return c.json({ error: 'Dossier not found' }, 404);
  }
  return c.json(dossier.replayGraph ?? buildReplayGraph(dossier));
});

export function buildReplayGraph(dossier: EvidenceDossier): ReplayGraph {
  const timestamps = dossier.examples.map((example) => example.createdAt);
  const start = timestamps.length > 0 ? Math.min(...timestamps) : dossier.createdAt;
  const end = timestamps.length > 0 ? Math.max(...timestamps) : dossier.updatedAt;
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
