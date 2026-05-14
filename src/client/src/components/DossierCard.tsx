import type { DossierSummary, DossierStatus } from '../../../types/dossier';
import { CATEGORY_STYLES, categoryLabel } from './category';

const STATUS_STYLES: Record<DossierStatus, string> = {
  WATCH: 'bg-yellow-100 text-yellow-800',
  NEEDS_REVIEW: 'bg-orange-100 text-orange-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  HIGH_CONFIDENCE: 'bg-red-100 text-red-800',
  IGNORED: 'bg-gray-100 text-gray-600',
  BENIGN: 'bg-green-100 text-green-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ESCALATED: 'bg-red-200 text-red-900',
};

function formatScore(score: number): string {
  return Math.round(score).toString();
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 45) return 'bg-yellow-500';
  return 'bg-green-500';
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function signalDescription(summary: DossierSummary): string {
  const kind = summary.clusterKey.split(':')[0] ?? 'pattern';
  return `Repeated ${kind} pattern across ${summary.exampleCount} example${summary.exampleCount !== 1 ? 's' : ''}`;
}

export function DossierCard({
  summary,
  onClick,
}: {
  summary: DossierSummary;
  onClick: () => void;
}) {
  const signalLabel = summary.signalKey.includes(':')
    ? summary.signalKey.split(':').slice(1).join(':')
    : summary.signalKey;

  return (
    <button
      className="w-full text-left rounded-xl shadow-sm bg-white p-4 mb-3 hover:shadow-md transition-shadow border border-gray-100"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[summary.status]}`}
          >
            {summary.status.replace('_', ' ')}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_STYLES[summary.category]}`}
          >
            {categoryLabel(summary.category)}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatTimestamp(summary.updatedAt)}</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="text-sm font-semibold text-gray-900 flex-1 truncate">{signalLabel}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-700">{formatScore(summary.totalScore)}</span>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreColor(summary.totalScore)}`}
              style={{ width: `${Math.min(summary.totalScore, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{summary.exampleCount} example{summary.exampleCount !== 1 ? 's' : ''}</span>
        <span>{summary.clusterKey.split(':')[0]} signal</span>
      </div>
      <div className="mt-2 text-xs text-gray-400">{signalDescription(summary)}</div>
    </button>
  );
}
