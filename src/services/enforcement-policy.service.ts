import type {
  EnforcementActionKind,
  EnforcementActionPolicyInput,
  RollbackReality,
} from '../types/action';

const ALLOWED_CONTENT_ACTIONS: EnforcementActionKind[] = [
  'REMOVE',
  'MARK_SPAM',
  'APPROVE',
  'LOCK',
  'UNLOCK',
  'IGNORE_REPORTS',
  'SNOOZE_REPORTS',
  'ADD_REMOVAL_NOTE',
];

const BAN_MUTE_ACTIONS: EnforcementActionKind[] = ['BAN_USER', 'MUTE_USER'];

export const ALL_ENFORCEMENT_ACTION_KINDS: EnforcementActionKind[] = [
  ...ALLOWED_CONTENT_ACTIONS,
  ...BAN_MUTE_ACTIONS,
];

export const ACTION_ROLLBACK: Record<EnforcementActionKind, RollbackReality> = {
  REMOVE: {
    reversible: true,
    description: 'Partially reversible by approving content; moderation history remains.',
  },
  MARK_SPAM: {
    reversible: true,
    description: 'Partially reversible by approving content; spam signals may remain.',
  },
  APPROVE: {
    reversible: true,
    description: 'Can be reversed by removing the content.',
  },
  LOCK: {
    reversible: true,
    description: 'Can be reversed by unlocking.',
  },
  UNLOCK: {
    reversible: true,
    description: 'Can be reversed by locking.',
  },
  IGNORE_REPORTS: {
    reversible: true,
    description: 'Can be reversed by unignoring reports where Reddit supports it.',
  },
  SNOOZE_REPORTS: {
    reversible: true,
    description: 'Can be reversed by unsnoozing the same report reason where Reddit supports it.',
  },
  ADD_REMOVAL_NOTE: {
    reversible: false,
    description: 'Not cleanly reversible; add a correcting note manually if needed.',
  },
  BAN_USER: {
    reversible: true,
    description: 'Can be reversed by unbanning, but modlog history remains.',
  },
  MUTE_USER: {
    reversible: true,
    description: 'Can be reversed by unmuting, but modlog history remains.',
  },
};

function assertManualActionOnly(action: EnforcementActionPolicyInput): void {
  if (action.source !== 'MANUAL_REVIEW') {
    throw new Error('CampaignLens never executes enforcement from automated scoring or triggers.');
  }
}

function assertSelectedContent(action: EnforcementActionPolicyInput): void {
  if (action.selectedContentIds.length === 0) {
    throw new Error('CampaignLens requires selected content before creating an action draft.');
  }
}

function assertAllowedActionKind(action: EnforcementActionPolicyInput): void {
  if (action.actionKinds.length === 0) {
    throw new Error('CampaignLens requires at least one action kind.');
  }

  for (const actionKind of action.actionKinds) {
    if (!ALLOWED_CONTENT_ACTIONS.includes(actionKind) && !BAN_MUTE_ACTIONS.includes(actionKind)) {
      throw new Error(`Unsupported CampaignLens action kind: ${actionKind}`);
    }
  }
}

function assertBanMutePolicy(action: EnforcementActionPolicyInput): void {
  const blockedAction = action.actionKinds.find((actionKind) => BAN_MUTE_ACTIONS.includes(actionKind));
  if (blockedAction) {
    throw new Error(`${blockedAction} is disabled until ban/mute guardrails are implemented.`);
  }
}

export function assertModeratorConfirmation(action: EnforcementActionPolicyInput): void {
  if (!action.confirmedByModerator) {
    throw new Error('CampaignLens requires explicit moderator confirmation before execution.');
  }
}

export function assertPreviewPolicy(action: EnforcementActionPolicyInput): void {
  assertManualActionOnly(action);
  assertSelectedContent(action);
  assertAllowedActionKind(action);
  assertBanMutePolicy(action);
}
