import { Hono } from 'hono';
import { getDevvitContext } from '../devvit/context';
import { errorMeta } from '../devvit/errors';
import {
  MENU_HANDLER_VERSION,
  submitDashboardPost,
  type MenuItemRequest,
  type UiResponse,
} from '../devvit/menu';
import { readJsonBody } from './request';

export const internalMenu = new Hono().basePath('/internal/menu');

internalMenu.post('/open-atlas', async (c) => {
  const input = await readJsonBody<MenuItemRequest>(c);
  if (input instanceof Response) return input;

  const devvitContext = getDevvitContext();
  if (!devvitContext.subredditName) {
    console.error('CampaignLens cannot open dashboard without subreddit context', {
      version: MENU_HANDLER_VERSION,
      targetId: input.targetId,
      subredditId: devvitContext.subredditId,
    });

    return c.json<UiResponse>(
      {
        showToast: {
          text: 'CampaignLens could not resolve the current subreddit.',
          appearance: 'neutral',
        },
      },
      200
    );
  }

  const subredditName = devvitContext.subredditName;
  console.info('CampaignLens open atlas menu handler', {
    version: MENU_HANDLER_VERSION,
    targetId: input.targetId,
    subredditId: devvitContext.subredditId,
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
      subredditId: devvitContext.subredditId,
      subredditName: devvitContext.subredditName,
      ...errorMeta(error),
    });

    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Could not create the CampaignLens dashboard post.',
          appearance: 'neutral',
        },
      },
      200
    );
  }
});
