import type {
  DossierSummary,
  EvidenceDossier,
  DossierFeedback,
  ReplayGraph,
  ReviewEvent,
  ReviewEventType,
  ReviewQueueItem,
} from '../../../types/dossier';
import type { CampaignLensConfig } from '../../../types/config';
import type { HealthReport } from '../../../types/health';
import type {
  ActionExecutionRecord,
  ActionPreview,
  EnforcementActionKind,
} from '../../../types/action';

async function parseError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json() as { error?: string };
    return new Error(body.error ?? fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function fetchDossiers(): Promise<DossierSummary[]> {
  const res = await fetch('/api/dossiers');
  if (!res.ok) throw new Error('Failed to fetch dossiers');
  return res.json();
}

export async function fetchDossier(id: string): Promise<EvidenceDossier> {
  const res = await fetch(`/api/dossiers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch dossier');
  return res.json();
}

export async function postFeedback(id: string, feedback: DossierFeedback): Promise<EvidenceDossier> {
  const res = await fetch(`/api/dossiers/${id}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw await parseError(res, 'Failed to post feedback');
  return res.json();
}

export async function createActionPreview(
  dossierId: string,
  input: {
    selectedContentIds: string[];
    actionKinds: EnforcementActionKind[];
    idempotencyKey?: string;
    removalReasonId?: string;
    removalNote?: string;
    snoozeReason?: string;
  }
): Promise<ActionPreview> {
  const res = await fetch(`/api/dossiers/${dossierId}/action-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseError(res, 'Failed to create action preview');
  return res.json();
}

export async function executeActionDraft(
  draftId: string,
  input: {
    idempotencyKey: string;
    confirmedByModerator: true;
  }
): Promise<ActionExecutionRecord> {
  const res = await fetch(`/api/actions/drafts/${draftId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseError(res, 'Failed to execute action draft');
  return res.json();
}

export async function fetchActionHistory(limit = 50): Promise<ActionExecutionRecord[]> {
  const res = await fetch(`/api/actions/history?limit=${encodeURIComponent(String(limit))}`);
  if (!res.ok) throw await parseError(res, 'Failed to fetch action history');
  return res.json();
}

export async function fetchReviewQueue(limit = 50): Promise<ReviewQueueItem[]> {
  const res = await fetch(`/api/review/queue?limit=${encodeURIComponent(String(limit))}`);
  if (!res.ok) throw await parseError(res, 'Failed to fetch review queue');
  return res.json();
}

export async function postReviewEvent(
  dossierId: string,
  input: {
    type: ReviewEventType;
    note?: string;
    proposedAction?: string;
  }
): Promise<ReviewEvent> {
  const res = await fetch(`/api/review/dossiers/${dossierId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseError(res, 'Failed to post review event');
  return res.json();
}

export async function fetchConfig(): Promise<CampaignLensConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function updateConfig(config: CampaignLensConfig): Promise<CampaignLensConfig> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update config');
  return res.json();
}

export async function fetchHealth(): Promise<HealthReport> {
  const res = await fetch('/api/health');
  if (!res.ok) throw await parseError(res, 'Failed to fetch diagnostics');
  return res.json();
}

export async function fetchReplay(id: string): Promise<ReplayGraph> {
  const res = await fetch(`/api/dossiers/${id}/replay`);
  if (!res.ok) throw new Error('Failed to fetch replay');
  return res.json();
}
