import type { ActionExecutionRecord, ActionItemResult } from '../../../types/action';
import { useActionHistory } from '../hooks/useActionHistory';

const RESULT_STYLES: Record<ActionExecutionRecord['result'], string> = {
  SUCCEEDED: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-red-100 text-red-800',
};

const ITEM_STYLES: Record<ActionItemResult['status'], string> = {
  SUCCEEDED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
  SKIPPED: 'bg-gray-100 text-gray-600',
};

function summarize(record: ActionExecutionRecord): string {
  const succeeded = record.itemResults.filter((item) => item.status === 'SUCCEEDED').length;
  const failed = record.itemResults.filter((item) => item.status === 'FAILED').length;
  const skipped = record.itemResults.filter((item) => item.status === 'SKIPPED').length;
  return `${succeeded} succeeded · ${failed} failed · ${skipped} skipped`;
}

function ActionHistoryCard({ record }: { record: ActionExecutionRecord }) {
  return (
    <article className="mb-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{record.dossierId}</div>
          <div className="mt-0.5 text-xs text-gray-400">
            {new Date(record.createdAt).toLocaleString()}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${RESULT_STYLES[record.result]}`}>
          {record.result}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {record.actionKinds.map((actionKind) => (
          <span key={actionKind} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
            {actionKind.replaceAll('_', ' ')}
          </span>
        ))}
      </div>

      <div className="mb-3 text-xs text-gray-500">{summarize(record)}</div>

      <div className="space-y-2">
        {record.itemResults.slice(0, 8).map((item, index) => (
          <div key={`${item.contentId}-${item.actionKind}-${index}`} className="rounded-md bg-gray-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-gray-700">{item.contentId}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${ITEM_STYLES[item.status]}`}>
                {item.status}
              </span>
            </div>
            {item.message && <div className="mt-1 text-xs text-gray-500">{item.message}</div>}
          </div>
        ))}
      </div>
    </article>
  );
}

export function ActionHistoryScreen() {
  const { records, loading, error, refresh } = useActionHistory();

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Action History</h2>
          <p className="mt-0.5 text-xs text-gray-500">Item-level moderation results without moderator or author storage.</p>
        </div>
        <button className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white" onClick={refresh}>
          Refresh
        </button>
      </div>

      {loading && records.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">Loading history...</div>
      )}

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="rounded-lg border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
          No moderation actions have been executed yet.
        </div>
      )}

      {records.map((record) => (
        <ActionHistoryCard key={record.id} record={record} />
      ))}
    </div>
  );
}
