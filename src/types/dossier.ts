export type DossierStatus =
  | 'WATCH'
  | 'NEEDS_REVIEW'
  | 'HIGH_CONFIDENCE'
  | 'IGNORED'
  | 'BENIGN'
  | 'CONFIRMED'
  | 'ESCALATED';

export type EvidenceSample = {
  id: string;
  contentId: string;
  kind: 'post' | 'comment';
  createdAt: number;
  threadId: string;
  signalKeys: string[];
  shortExcerpt: string;
  matchedFragments: string[];
  simhash64?: string;
  flags: string[];
};

export type DossierExample = {
  contentId?: string;
  excerpt: string;
  matchedFragments: string[];
  flags: string[];
  threadId: string;
  createdAt: number;
};

export type DossierTimelineItem = {
  timestamp: number;
  label: string;
  kind: 'mention' | 'report' | 'obfuscation' | 'duplicate';
};

export type DossierAction =
  | 'WATCH'
  | 'IGNORE'
  | 'BENIGN'
  | 'CONFIRMED_CAMPAIGN'
  | 'FALSE_POSITIVE'
  | 'ESCALATE';

export type CampaignShapeScore = {
  total: number;
  domainBurst: number;
  brandBurst: number;
  threadSpread: number;
  simhash: number;
  participationPattern: number;
  obfuscation: number;
  report: number;
  independentSignalFamilies: number;
  localBaselineZScore: number;
};

export type ReplayNode = {
  id: string;
  kind: 'domain' | 'thread' | 'phrase' | 'obfuscation' | 'report';
  label: string;
  timestamp: number;
  weight: number;
};

export type ReplayEdge = {
  source: string;
  target: string;
  kind: string;
};

export type ReplayGraph = {
  nodes: ReplayNode[];
  edges: ReplayEdge[];
  timeRange: { start: number; end: number };
  domainNode: ReplayNode;
};

export type EvidenceDossier = {
  id: string;
  clusterKey: string;
  status: DossierStatus;
  score: CampaignShapeScore;
  signalKey: string;
  examples: DossierExample[];
  timeline: DossierTimelineItem[];
  explanationBullets: string[];
  replayGraph?: ReplayGraph;
  createdAt: number;
  updatedAt: number;
};

export type DossierSummary = {
  id: string;
  clusterKey: string;
  status: DossierStatus;
  totalScore: number;
  signalKey: string;
  exampleCount: number;
  createdAt: number;
  updatedAt: number;
};
