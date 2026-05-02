import { useState } from 'react';
import { showToast } from '@devvit/web/client';
import type { DossierAction } from '../../../types/dossier';
import { postAction } from '../lib/api';

type ActionBarProps = {
  dossierId: string;
  onAction: () => void;
};

export function ActionBar({ dossierId, onAction }: ActionBarProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleAction = async (action: DossierAction) => {
    setLoading(true);
    try {
      await postAction(dossierId, action);
      showToast({ text: `Action: ${action}`, appearance: 1 });
      onAction();
    } catch {
      showToast({ text: 'Action failed', appearance: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex gap-2">
        <button
          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
          disabled={loading}
          onClick={() => handleAction('WATCH')}
        >
          Watch
        </button>
        <button
          className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          disabled={loading}
          onClick={() => handleAction('IGNORE')}
        >
          Ignore
        </button>
        <button
          className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          disabled={loading}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {expanded && (
        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
            disabled={loading}
            onClick={() => handleAction('BENIGN')}
          >
            Benign
          </button>
          <button
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
            disabled={loading}
            onClick={() => handleAction('CONFIRMED_CAMPAIGN')}
          >
            Campaign
          </button>
          <button
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
            disabled={loading}
            onClick={() => handleAction('ESCALATE')}
          >
            Escalate
          </button>
          <button
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            disabled={loading}
            onClick={() => handleAction('FALSE_POSITIVE')}
          >
            False +
          </button>
        </div>
      )}
    </div>
  );
}
