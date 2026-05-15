import { useDossiers } from '../hooks/useDossiers';
import { DossierCard } from '../components/DossierCard';
import { EmptyState } from '../components/EmptyState';

type Props = {
  onSelectDossier: (id: string) => void;
};

export function ActiveDossiersScreen({ onSelectDossier }: Props) {
  const { dossiers, loading, error, refresh } = useDossiers();

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Active Dossiers</h2>
          <p className="text-xs text-gray-500">Updates automatically when Reddit triggers finish.</p>
        </div>
        <button
          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          disabled={loading}
          onClick={refresh}
          type="button"
        >
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {loading && dossiers.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3">
          {error}
          <button className="ml-2 underline" onClick={refresh}>Retry</button>
        </div>
      )}

      {!loading && !error && dossiers.length === 0 && <EmptyState />}

      {dossiers.map((d) => (
        <DossierCard key={d.id} summary={d} onClick={() => onSelectDossier(d.id)} />
      ))}
    </div>
  );
}
