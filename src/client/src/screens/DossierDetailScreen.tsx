import { useDossier } from '../hooks/useDossier';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { EvidenceCard } from '../components/EvidenceCard';
import { TimelineCard } from '../components/TimelineCard';
import { ActionBar } from '../components/ActionBar';
import { ReplayGraphCard } from '../components/ReplayGraphCard';
import { useReplay } from '../hooks/useReplay';

type Props = {
  dossierId: string;
  onBack: () => void;
};

export function DossierDetailScreen({ dossierId, onBack }: Props) {
  const { dossier, loading, error, refresh } = useDossier(dossierId);
  const { replay, loading: replayLoading, error: replayError } = useReplay(dossierId);

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Loading dossier...</div>;
  }

  if (error || !dossier) {
    return (
      <div className="p-4">
        <button className="text-sm text-blue-600 mb-4" onClick={onBack}>&larr; Back</button>
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {error ?? 'Dossier not found'}
        </div>
      </div>
    );
  }

  const signalLabel = dossier.signalKey.includes(':')
    ? dossier.signalKey.split(':').slice(1).join(':')
    : dossier.signalKey;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="p-4 flex-shrink-0">
        <button className="text-sm text-blue-600 mb-3" onClick={onBack}>&larr; Back to dossiers</button>

        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-1">{signalLabel}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="capitalize">{dossier.status.replace('_', ' ').toLowerCase()}</span>
            <span>&middot;</span>
            <span>Updated {new Date(dossier.updatedAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</h3>
          <ScoreBreakdown score={dossier.score} />
        </div>

        {dossier.explanationBullets.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Why This Surfaced</h3>
            <ul className="space-y-1.5">
              {dossier.explanationBullets.map((bullet, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-gray-300 flex-shrink-0">&bull;</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {replayLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 text-sm text-gray-400">
            Loading replay...
          </div>
        )}

        {replayError && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
            {replayError}
          </div>
        )}

        {replay && replay.nodes.length > 0 && (
          <div className="mb-4">
            <ReplayGraphCard replay={replay} />
          </div>
        )}

        {dossier.examples.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Evidence</h3>
            {dossier.examples.map((ex, i) => (
              <EvidenceCard key={i} example={ex} />
            ))}
          </div>
        )}

        {dossier.timeline.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Timeline</h3>
            <TimelineCard items={dossier.timeline} />
          </div>
        )}
      </div>

      <div className="mt-auto sticky bottom-0">
        <ActionBar dossierId={dossierId} onAction={refresh} />
      </div>
    </div>
  );
}
