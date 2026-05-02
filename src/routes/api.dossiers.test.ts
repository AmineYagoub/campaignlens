import { describe, expect, it } from 'vitest';
import type { EvidenceDossier } from '../types/dossier';
import { buildReplayGraph } from './api.dossiers';

function makeDossier(overrides: Partial<EvidenceDossier> = {}): EvidenceDossier {
  return {
    id: 'dossier-1',
    clusterKey: 'domain:example.com',
    status: 'WATCH',
    score: {
      total: 55,
      domainBurst: 50,
      brandBurst: 0,
      threadSpread: 40,
      simhash: 0,
      participationPattern: 0,
      obfuscation: 40,
      report: 0,
      independentSignalFamilies: 3,
      localBaselineZScore: 0,
    },
    signalKey: 'domain:example.com',
    examples: [
      {
        excerpt: 'example dot com keeps appearing',
        matchedFragments: ['example.com'],
        flags: ['DOT_WORD'],
        threadId: 't3_thread1',
        createdAt: 1000,
      },
      {
        excerpt: 'example.com again',
        matchedFragments: ['example.com'],
        flags: [],
        threadId: 't3_thread2',
        createdAt: 2000,
      },
    ],
    timeline: [],
    explanationBullets: [],
    createdAt: 900,
    updatedAt: 2100,
    ...overrides,
  };
}

describe('buildReplayGraph', () => {
  it('builds domain, thread, phrase, and obfuscation nodes from dossier examples', () => {
    const graph = buildReplayGraph(makeDossier());

    expect(graph.domainNode.kind).toBe('domain');
    expect(graph.domainNode.label).toBe('example.com');
    expect(graph.timeRange).toEqual({ start: 1000, end: 2000 });
    expect(graph.nodes.some((node) => node.kind === 'thread' && node.label === 't3_thread1')).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'phrase' && node.label === 'example.com')).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'obfuscation' && node.label === 'DOT_WORD')).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === 'mentioned_in')).toBe(true);
  });

  it('falls back to dossier timestamps when examples are empty', () => {
    const graph = buildReplayGraph(makeDossier({ examples: [], createdAt: 500, updatedAt: 800 }));

    expect(graph.timeRange).toEqual({ start: 500, end: 800 });
    expect(graph.nodes).toHaveLength(1);
  });
});
