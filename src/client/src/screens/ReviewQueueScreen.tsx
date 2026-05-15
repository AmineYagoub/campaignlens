import type { ReviewEventType, ReviewQueueItem } from '../../../types/dossier';
import { postReviewEvent } from '../lib/api';
import { useReviewQueue } from '../hooks/useReviewQueue';
import { showClientToast } from '../devvit/client';

export function ReviewQueueScreen({ onSelectDossier }: { onSelectDossier: (id: string) => void }) {
  const { items, loading, error, refresh } = useReviewQueue();

  const recordEvent = async (dossierId: string, type: ReviewEventType) => {
    try {
      await postReviewEvent(dossierId, { type });
      showClientToast({ text: `Review event: ${type}`, appearance: 1 });
      await refresh();
    } catch (e) {
      showClientToast({
        text: e instanceof Error ? e.message : 'Review event failed',
        appearance: 0,
      });
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">Loading review queue...</div>;
  }

  if (error) {
    return (
      <div className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error}
        <button className="ml-2 underline" onClick={() => void refresh()} type="button">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Review Queue</h2>
          <p className="mt-1 text-xs text-gray-500">Team review events without identity storage.</p>
        </div>
        <button
          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
          onClick={() => void refresh()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
          No dossiers need review.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ReviewQueueCard
              item={item}
              key={item.id}
              onOpen={() => onSelectDossier(item.id)}
              onRecordEvent={(type) => void recordEvent(item.id, type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewQueueCard({
  item,
  onOpen,
  onRecordEvent,
}: {
  item: ReviewQueueItem;
  onOpen: () => void;
  onRecordEvent: (type: ReviewEventType) => void;
}) {
  const signalLabel = item.signalKey.includes(':')
    ? item.signalKey.split(':').slice(1).join(':')
    : item.signalKey;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <button className="w-full text-left" onClick={onOpen} type="button">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">{signalLabel}</div>
            <div className="mt-1 text-xs text-gray-400">
              {item.status.replace('_', ' ')} · {item.category.replaceAll('_', ' ').toLowerCase()} · {item.exampleCount} example{item.exampleCount === 1 ? '' : 's'}
            </div>
          </div>
          <div className="text-sm font-bold text-gray-700">{Math.round(item.totalScore)}</div>
        </div>
        {item.latestReviewEvent && (
          <div className="rounded-lg bg-gray-50 p-2 text-xs text-gray-500">
            Latest: {item.latestReviewEvent.type.replaceAll('_', ' ')}
          </div>
        )}
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          onClick={() => onRecordEvent('CLAIM')}
          type="button"
        >
          Claim
        </button>
        <button
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          onClick={() => onRecordEvent('RELEASE')}
          type="button"
        >
          Release
        </button>
        <button
          className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
          onClick={() => onRecordEvent('REQUEST_SECOND_REVIEW')}
          type="button"
        >
          Second look
        </button>
      </div>
    </div>
  );
}
