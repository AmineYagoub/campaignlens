import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/shared';

export const internalMenu = new Hono().basePath('/internal/menu');
const PLAYTEST_SUBREDDIT_FALLBACK = 'campaignlens_dev';
const APP_SLUG = 'campaignlens';
const MENU_HANDLER_VERSION = '2026-05-02-menu-v5-sdk-next-submitcustompost';

function playtestSubredditUrl(subredditName: string): string {
  return `https://www.reddit.com/r/${encodeURIComponent(subredditName)}/?playtest=${encodeURIComponent(APP_SLUG)}`;
}

async function submitDashboardPost(subredditName: string) {
  try {
    return await reddit.submitCustomPost({
      subredditName,
      title: 'CampaignLens Atlas',
      entry: 'default',
      runAs: 'APP',
      sendreplies: false,
      postData: {
        kind: 'campaignlens-dashboard',
        createdAt: Date.now(),
      },
      textFallback: {
        text: 'CampaignLens Atlas moderator dashboard.',
      },
    });
  } catch (appAccountError) {
    console.warn('CampaignLens app-account dashboard post creation failed; retrying as user', {
      subredditId: context.subredditId,
      subredditName,
      error: appAccountError,
    });

    return reddit.submitCustomPost({
      subredditName,
      title: 'CampaignLens Atlas',
      entry: 'default',
      runAs: 'USER',
      sendreplies: false,
      postData: {
        kind: 'campaignlens-dashboard',
        createdAt: Date.now(),
      },
      userGeneratedContent: {
        text: 'CampaignLens Atlas moderator dashboard.',
      },
      textFallback: {
        text: 'CampaignLens Atlas moderator dashboard.',
      },
    });
  }
}

internalMenu.post('/open-atlas', async (c) => {
  const input = await c.req.json<MenuItemRequest>();
  const subredditName = context.subredditName ?? PLAYTEST_SUBREDDIT_FALLBACK;
  console.info('CampaignLens open atlas menu handler', {
    version: MENU_HANDLER_VERSION,
    targetId: input.targetId,
    subredditId: context.subredditId,
    subredditName,
  });

  try {
    const post = await submitDashboardPost(subredditName);

    return c.json<UiResponse>({
      navigateTo: { url: post.url },
      showToast: { text: 'CampaignLens Atlas dashboard ready', appearance: 'success' },
    });
  } catch (error) {
    console.error('CampaignLens failed to open dashboard post', {
      targetId: input.targetId,
      subredditId: context.subredditId,
      subredditName: context.subredditName,
      error,
    });

    return c.json<UiResponse>(
      {
        navigateTo: { url: playtestSubredditUrl(subredditName) },
        showToast: {
          text: 'Could not create the dashboard post; opening the playtest subreddit.',
          appearance: 'neutral',
        },
      },
      200
    );
  }
});
