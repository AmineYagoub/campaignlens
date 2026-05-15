import { useMemo, useState } from 'react';
import type {
  ActionExecutionRecord,
  ActionPreview,
  EnforcementActionKind,
} from '../../../types/action';
import type { DossierExample } from '../../../types/dossier';
import { showClientToast } from '../devvit/client';
import { createActionPreview, executeActionDraft } from '../lib/api';

type Props = {
  dossierId: string;
  examples: DossierExample[];
  onExecuted: () => void;
};

type ActionOption = {
  kind: EnforcementActionKind;
  label: string;
  tone: string;
};

const ACTIONS: ActionOption[] = [
  { kind: 'REMOVE', label: 'Remove', tone: 'border-red-200 bg-red-50 text-red-700' },
  { kind: 'MARK_SPAM', label: 'Spam', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  { kind: 'APPROVE', label: 'Approve', tone: 'border-green-200 bg-green-50 text-green-700' },
  { kind: 'LOCK', label: 'Lock', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { kind: 'UNLOCK', label: 'Unlock', tone: 'border-sky-200 bg-sky-50 text-sky-700' },
  { kind: 'IGNORE_REPORTS', label: 'Ignore reports', tone: 'border-gray-200 bg-gray-50 text-gray-700' },
];

function exampleLabel(example: DossierExample, index: number): string {
  return example.contentId ?? `example-${index + 1}`;
}

function resultText(record: ActionExecutionRecord): string {
  const succeeded = record.itemResults.filter((item) => item.status === 'SUCCEEDED').length;
  const failed = record.itemResults.filter((item) => item.status === 'FAILED').length;
  const skipped = record.itemResults.filter((item) => item.status === 'SKIPPED').length;
  return `${record.result}: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`;
}

export function ModerationActionPanel({ dossierId, examples, onExecuted }: Props) {
  const actionableExamples = useMemo(
    () => examples.filter((example) => Boolean(example.contentId)),
    [examples]
  );
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<EnforcementActionKind>('REMOVE');
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ActionExecutionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleContent = (contentId: string) => {
    setPreview(null);
    setConfirmed(false);
    setSelectedContentIds((current) =>
      current.includes(contentId)
        ? current.filter((id) => id !== contentId)
        : [...current, contentId]
    );
  };

  const requestPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    setConfirmed(false);
    setLastResult(null);

    try {
      const nextPreview = await createActionPreview(dossierId, {
        selectedContentIds,
        actionKinds: [selectedAction],
      });
      setPreview(nextPreview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to preview moderation action');
    } finally {
      setLoadingPreview(false);
    }
  };

  const executePreview = async () => {
    if (!preview) return;
    setExecuting(true);
    setError(null);

    try {
      const result = await executeActionDraft(preview.draft.id, {
        idempotencyKey: preview.draft.idempotencyKey,
        confirmedByModerator: true,
      });
      setLastResult(result);
      showClientToast({ text: resultText(result), appearance: result.result === 'FAILED' ? 0 : 1 });
      onExecuted();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to execute moderation action';
      setError(message);
      showClientToast({ text: message, appearance: 0 });
    } finally {
      setExecuting(false);
    }
  };

  if (actionableExamples.length === 0) {
    return (
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Moderation actions</div>
        <p className="mt-1 text-sm text-gray-500">No current Reddit content IDs are available for action.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Moderation actions</div>
          <p className="mt-0.5 text-xs text-gray-400">Select content, preview current Reddit state, then confirm.</p>
        </div>
        <button
          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? 'Close' : 'Open'}
        </button>
        {selectedContentIds.length > 3 && (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            Bulk review
          </span>
        )}
      </div>

      {!open && (
        <button
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-700"
          onClick={() => setOpen(true)}
          type="button"
        >
          Select evidence for moderation
        </button>
      )}

      {open && (
        <>

      <div className="mb-3 grid gap-2">
        {actionableExamples.map((example, index) => {
          const contentId = example.contentId!;
          const selected = selectedContentIds.includes(contentId);
          return (
            <label
              key={contentId}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                selected ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={selected}
                onChange={() => toggleContent(contentId)}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-gray-700">{exampleLabel(example, index)}</span>
                <span className="mt-1 line-clamp-2 block text-xs text-gray-500">{example.excerpt}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.kind}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              selectedAction === action.kind ? action.tone : 'border-gray-200 bg-white text-gray-600'
            }`}
            onClick={() => {
              setSelectedAction(action.kind);
              setPreview(null);
              setConfirmed(false);
            }}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>

      <button
        className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        disabled={selectedContentIds.length === 0 || loadingPreview}
        onClick={requestPreview}
        type="button"
      >
        {loadingPreview ? 'Checking Reddit state...' : 'Preview action'}
      </button>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {preview && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 text-sm font-semibold text-gray-800">Confirmation</div>
          <div className="space-y-2 text-xs text-gray-600">
            <div>{preview.draft.items.length} item(s) ready. {preview.skippedItems.length} skipped.</div>
            {preview.draft.actionKinds.map((kind) => (
              <div key={kind} className="rounded-md bg-white p-2">
                <span className="font-medium">{kind.replaceAll('_', ' ')}</span>
                <span className="block text-gray-500">{preview.draft.rollback[kind]?.description}</span>
              </div>
            ))}
          </div>

          <label className="mt-3 flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>I confirm this moderation action and understand the rollback limitations.</span>
          </label>

          <button
            className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            disabled={!confirmed || executing}
            onClick={executePreview}
            type="button"
          >
            {executing ? 'Executing...' : 'Execute moderation action'}
          </button>
        </div>
      )}

      {lastResult && (
        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {resultText(lastResult)}
        </div>
      )}
        </>
      )}
    </div>
  );
}
