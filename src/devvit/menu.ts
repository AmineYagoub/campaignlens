import { submitCustomPost } from './reddit-client';

const DASHBOARD_TITLE = 'CampaignLens';
const DASHBOARD_TEXT = 'CampaignLens moderator dashboard.';

export const MENU_HANDLER_VERSION = '2026-05-14-menu-sdk-adapter-v1';

export type MenuItemRequest = {
  targetId?: string;
};

export type UiResponse = {
  navigateTo?: { url: string };
  showToast?: { text: string; appearance?: 'success' | 'neutral' | number };
};

function dashboardPostData() {
  return {
    kind: 'campaignlens-dashboard',
    createdAt: Date.now(),
  };
}

export async function submitDashboardPost(subredditName: string) {
  return submitCustomPost({
    subredditName,
    title: DASHBOARD_TITLE,
    entry: 'default',
    runAs: 'USER',
    sendreplies: false,
    postData: dashboardPostData(),
    userGeneratedContent: {
      text: DASHBOARD_TEXT,
    },
    textFallback: {
      text: DASHBOARD_TEXT,
    },
  });
}
