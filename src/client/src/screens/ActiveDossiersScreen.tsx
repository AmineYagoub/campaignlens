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
