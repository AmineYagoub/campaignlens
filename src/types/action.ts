export type EnforcementActionKind =
  | 'REMOVE'
  | 'MARK_SPAM'
  | 'APPROVE'
  | 'LOCK'
  | 'UNLOCK'
  | 'IGNORE_REPORTS'
  | 'SNOOZE_REPORTS'
  | 'ADD_REMOVAL_NOTE'
  | 'BAN_USER'
  | 'MUTE_USER';

export type ActionSource = 'MANUAL_REVIEW' | 'TRIGGER' | 'SCORE' | 'WATCH_RULE';

export type ActionContentKind = 'post' | 'comment';

export type ActionContentState = 'AVAILABLE' | 'DELETED' | 'UNAVAILABLE' | 'OUT_OF_SCOPE';

export type RollbackReality = {
  reversible: boolean;
  description: string;
};

export type HydratedActionContent = {
  contentId: string;
  kind: ActionContentKind;
  state: ActionContentState;
  subredditName?: string;
  permalink?: string;
  title?: string;
  excerpt?: string;
  authorName?: string;
  removed?: boolean;
  spam?: boolean;
  locked?: boolean;
  reportCount?: number;
  reason?: string;
};

export type ActionDraftContent = Omit<HydratedActionContent, 'authorName'>;

export type ActionDraft = {
  id: string;
  dossierId: string;
  selectedContentIds: string[];
  actionKinds: EnforcementActionKind[];
  items: ActionDraftContent[];
  removalReasonId?: string;
  removalNote?: string;
  snoozeReason?: string;
  source: ActionSource;
  idempotencyKey: string;
  createdAt: number;
  expiresAt: number;
  confirmedByModerator: false;
  rollback: Partial<Record<EnforcementActionKind, RollbackReality>>;
};

export type ActionPreview = {
  draft: ActionDraft;
  items: HydratedActionContent[];
  skippedItems: HydratedActionContent[];
};

export type EnforcementActionPolicyInput = {
  source: ActionSource;
  actionKinds: EnforcementActionKind[];
  selectedContentIds: string[];
  confirmedByModerator?: boolean;
};

export type ActionItemResult = {
  contentId: string;
  kind: ActionContentKind;
  actionKind: EnforcementActionKind;
  status: 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  message?: string;
};

export type ActionExecutionLock = {
  draftId: string;
  dossierId: string;
  contentIdsHash: string;
  actionKindsHash: string;
  expiresAt: number;
};

export type ActionExecutionRecord = {
  id: string;
  draftId: string;
  dossierId: string;
  actionKinds: EnforcementActionKind[];
  selectedContentCount: number;
  itemResults: ActionItemResult[];
  result: 'SUCCEEDED' | 'PARTIAL' | 'FAILED';
  contentIdsHash: string;
  actionKindsHash: string;
  createdAt: number;
  actorStored: false;
  hydratedAuthorStored: false;
};
