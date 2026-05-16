import { useState } from 'react';
import type { DossierFeedback } from '../../../types/dossier';
import { showClientToast } from '../devvit/client';
import { postFeedback } from '../lib/api';

type FeedbackBarProps = {
  dossierId: string;
  onFeedback: () => void;
};

export function FeedbackBar({ dossierId, onFeedback }: FeedbackBarProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleFeedback = async (feedback: DossierFeedback) => {
    setLoading(true);
    try {
      await postFeedback(dossierId, feedback);
      showClientToast({ text: `Feedback: ${feedback}`, appearance: 1 });
      onFeedback();
    } catch {
      showClientToast({ text: 'Feedback failed', appearance: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Review feedback</div>
          <div className="text-xs text-gray-400">Updates dossier status and calibration only.</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          disabled={loading}
          onClick={() => handleFeedback('WATCH')}
        >
          Watch
        </button>
        <button
          className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          disabled={loading}
          onClick={() => handleFeedback('IGNORE')}
        >
          Ignore
        </button>
        <button
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          disabled={loading}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {expanded && (
        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            disabled={loading}
            onClick={() => handleFeedback('BENIGN')}
          >
            Benign
          </button>
          <button
            className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            disabled={loading}
            onClick={() => handleFeedback('CONFIRMED_CAMPAIGN')}
          >
            Campaign
          </button>
          <button
            className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            disabled={loading}
            onClick={() => handleFeedback('ESCALATE')}
          >
            Escalate
          </button>
          <button
            className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            disabled={loading}
            onClick={() => handleFeedback('FALSE_POSITIVE')}
          >
            False +
          </button>
        </div>
      )}
    </div>
  );
}
