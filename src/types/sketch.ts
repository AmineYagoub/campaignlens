export type InteractionSketch = {
  contentId: string;
  ts: number;
  kind: 'post' | 'comment';
  hourBucket: string;
  hasDomain: boolean;
  hasBrand: boolean;
  hasObfuscation: boolean;
  simhash64?: string;
};

export type CandidateGateResult = {
  isCandidate: boolean;
  reasons: string[];
};
