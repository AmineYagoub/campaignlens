import { context } from '@devvit/web/server';

type CampaignLensContext = {
  subredditId: string | undefined;
  subredditName: string | undefined;
  username: string | undefined;
};

export function getDevvitContext(): CampaignLensContext {
  return {
    subredditId: context.subredditId,
    subredditName: context.subredditName,
    username: context.username,
  };
}

export function requireCurrentModeratorContext(): { subredditName: string; username: string } | null {
  const { subredditName, username } = getDevvitContext();
  if (!subredditName || !username) return null;
  return { subredditName, username };
}
