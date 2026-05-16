import type { MouseEvent } from 'react';
import { clientContext, requestClientExpandedMode, showClientToast } from '../devvit/client';

export function PreviewApp() {
  const openDashboard = async (event: MouseEvent<HTMLButtonElement>) => {
    try {
      requestClientExpandedMode(event.nativeEvent, 'dashboard');
    } catch (error) {
      console.error('CampaignLens failed to open expanded dashboard', error);
      showClientToast({
        text: 'Could not open CampaignLens in expanded mode.',
        appearance: 0,
      });
    }
  };

  return (
    <main className="bg-white p-4 text-gray-900">
      <div className="space-y-3">
        <div>
          <h1 className="text-lg font-semibold">CampaignLens</h1>
          <p className="text-xs text-gray-500">r/{clientContext.subredditName}</p>
        </div>

        <p className="text-sm leading-5 text-gray-600">
          Evidence-first campaign detection for Reddit mod teams.
        </p>

        <button
          className="w-full cursor-pointer rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
          onClick={(event) => void openDashboard(event)}
          type="button"
        >
          Open dashboard
        </button>
      </div>
    </main>
  );
}
