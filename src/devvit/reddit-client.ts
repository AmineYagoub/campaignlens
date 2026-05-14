import { reddit } from '@devvit/web/server';
import type { ActionContentKind, EnforcementActionKind } from '../types/action';

type RedditClient = typeof reddit;
type SubmitCustomPostOptions = Parameters<RedditClient['submitCustomPost']>[0];
type SubmitCustomPostResult = Awaited<ReturnType<RedditClient['submitCustomPost']>>;
type GetModeratorsOptions = Parameters<RedditClient['getModerators']>[0];
type RedditPost = Awaited<ReturnType<RedditClient['getPostById']>>;
type RedditComment = Awaited<ReturnType<RedditClient['getCommentById']>>;

export async function submitCustomPost(options: SubmitCustomPostOptions): Promise<SubmitCustomPostResult> {
  return reddit.submitCustomPost(options);
}

export function getModerators(options: GetModeratorsOptions) {
  return reddit.getModerators(options);
}

export async function getPostById(id: string): Promise<RedditPost> {
  return reddit.getPostById(id as `t3_${string}`);
}

export async function getCommentById(id: string): Promise<RedditComment> {
  return reddit.getCommentById(id as `t1_${string}`);
}

async function getModeratableContent(kind: ActionContentKind, id: string): Promise<RedditPost | RedditComment> {
  return kind === 'post' ? getPostById(id) : getCommentById(id);
}

export async function executeContentModerationAction(options: {
  kind: ActionContentKind;
  contentId: string;
  actionKind: EnforcementActionKind;
  removalReasonId?: string;
  removalNote?: string;
  snoozeReason?: string;
}): Promise<void> {
  const content = await getModeratableContent(options.kind, options.contentId);

  switch (options.actionKind) {
    case 'REMOVE':
      await content.remove(false);
      return;
    case 'MARK_SPAM':
      await content.remove(true);
      return;
    case 'APPROVE':
      await content.approve();
      return;
    case 'LOCK':
      await content.lock();
      return;
    case 'UNLOCK':
      await content.unlock();
      return;
    case 'IGNORE_REPORTS':
      await content.ignoreReports();
      return;
    case 'SNOOZE_REPORTS':
      if (!options.snoozeReason) throw new Error('SNOOZE_REPORTS requires snoozeReason.');
      await content.snoozeReports(options.snoozeReason);
      return;
    case 'ADD_REMOVAL_NOTE':
      if (!options.removalReasonId) throw new Error('ADD_REMOVAL_NOTE requires removalReasonId.');
      await content.addRemovalNote({
        reasonId: options.removalReasonId,
        ...(options.removalNote ? { modNote: options.removalNote } : {}),
      });
      return;
    case 'BAN_USER':
    case 'MUTE_USER':
      throw new Error(`${options.actionKind} is disabled until ban/mute guardrails are implemented.`);
    default:
      assertNever(options.actionKind);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported moderation action kind: ${String(value)}`);
}
