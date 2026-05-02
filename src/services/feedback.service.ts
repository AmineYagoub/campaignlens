import type { ModFeedback, FeedbackRecord, PrecisionStats } from '../types/feedback';
import type { DossierAction } from '../types/dossier';
import { getDossier, updateDossierStatus } from './dossier.service';
import { getConfig, saveConfig } from './config.service';
import { PRECISION_KEY } from './redis-keys.service';
import { getEvidenceForContent } from './content-ingestion.service';
import { safeGet, safeSet, safeExpire, safeZAdd } from './redis-safe.service';

const FEEDBACK_TO_STATUS: Record<DossierAction, string> = {
  WATCH: 'WATCH',
  IGNORE: 'IGNORED',
  BENIGN: 'BENIGN',
  CONFIRMED_CAMPAIGN: 'CONFIRMED',
  FALSE_POSITIVE: 'IGNORED',
  ESCALATE: 'ESCALATED',
};

export async function handleFeedback(dossierId: string, feedback: DossierAction): Promise<void> {
  const dossier = await getDossier(dossierId);
  if (!dossier) return;

  // Store feedback record
  const record: FeedbackRecord = {
    dossierId,
    action: feedback as ModFeedback,
    createdAt: Date.now(),
    signalKey: dossier.signalKey,
  };
  const feedbackKey = `cl:feedback:${dossier.signalKey}`;
  const wrote = await safeZAdd(feedbackKey, { member: JSON.stringify(record), score: record.createdAt });
  if (wrote) await safeExpire(feedbackKey, 180 * 24 * 3600); // 180 days

  // Update precision stats (only for ModFeedback types)
  const modFeedbacks: ModFeedback[] = ['BENIGN', 'WATCH', 'IGNORE', 'CONFIRMED_CAMPAIGN', 'FALSE_POSITIVE'];
  if (modFeedbacks.includes(feedback as ModFeedback)) {
    await updatePrecisionStats(feedback as ModFeedback);
    await adjustWeights(dossier.signalKey, feedback as ModFeedback);
  }

  // Map to status and update
  const status = FEEDBACK_TO_STATUS[feedback as DossierAction];
  if (status) {
    await updateDossierStatus(dossierId, status as never);
  }
}

export async function adjustWeights(signalKey: string, feedback: ModFeedback): Promise<void> {
  const config = await getConfig();
  const w = { ...config.weights };

  switch (feedback) {
    case 'BENIGN':
      // Decrease strongest signal weight by 0.02 (min 0.05)
      decreaseStrongestWeight(w, 0.02);
      break;
    case 'FALSE_POSITIVE':
      // Decrease by 0.03
      decreaseStrongestWeight(w, 0.03);
      break;
    case 'CONFIRMED_CAMPAIGN':
      // Increase domain/brand by 0.02 (max 0.4)
      if (signalKey.startsWith('domain:')) {
        w.domainBurst = Math.min(0.4, w.domainBurst + 0.02);
      } else if (signalKey.startsWith('brand:')) {
        w.brandBurst = Math.min(0.4, w.brandBurst + 0.02);
      }
      break;
    case 'IGNORE':
      // No weight adjustment
      break;
    case 'WATCH':
      // No weight adjustment
      break;
  }

  config.weights = w;
  await saveConfig(config);
}

function decreaseStrongestWeight(
  w: Record<string, number>,
  amount: number
): void {
  const entries = Object.entries(w);
  const maxEntry = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  w[maxEntry[0]] = Math.max(0.05, maxEntry[1] - amount);
}

async function updatePrecisionStats(feedback: ModFeedback): Promise<void> {
  const json = await safeGet(PRECISION_KEY);
  const stats: PrecisionStats = json ? JSON.parse(json) : {
    reviewedHighConfidence: 0,
    markedFalsePositive: 0,
    markedBenign: 0,
    confirmedCampaign: 0,
  };

  switch (feedback) {
    case 'CONFIRMED_CAMPAIGN':
      stats.confirmedCampaign++;
      stats.reviewedHighConfidence++;
      break;
    case 'FALSE_POSITIVE':
      stats.markedFalsePositive++;
      stats.reviewedHighConfidence++;
      break;
    case 'BENIGN':
      stats.markedBenign++;
      stats.reviewedHighConfidence++;
      break;
  }

  await safeSet(PRECISION_KEY, JSON.stringify(stats));
}

export async function handleModAction(trigger: Record<string, unknown>): Promise<void> {
  const action = trigger.action as string;
  const targetId = (trigger.targetId ?? trigger.postId ?? trigger.commentId) as string;
  if (!targetId || !action) return;

  // Map mod actions to implicit feedback
  if (action === 'remove' || action === 'spam') {
    const evidence = await getEvidenceForContent(targetId);
    if (!evidence) return;

    if (evidence.signalKeys) {
      for (const signalKey of evidence.signalKeys) {
        await adjustWeights(signalKey, 'CONFIRMED_CAMPAIGN');
      }
    }
  } else if (action === 'approve') {
    const evidence = await getEvidenceForContent(targetId);
    if (!evidence) return;

    if (evidence.signalKeys) {
      for (const signalKey of evidence.signalKeys) {
        await adjustWeights(signalKey, 'BENIGN');
      }
    }
  }
}
