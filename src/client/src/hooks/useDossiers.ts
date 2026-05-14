import { useState, useEffect, useCallback } from 'react';
import type { DossierSummary } from '../../../types/dossier';
import { DOSSIER_UPDATES_CHANNEL } from '../../../devvit/realtime-channels';
import { connectClientRealtime, disconnectClientRealtime } from '../devvit/client';
import { fetchDossiers } from '../lib/api';

export function useDossiers() {
  const [dossiers, setDossiers] = useState<DossierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDossiers();
      setDossiers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dossiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    void connectClientRealtime<{ dossierId: string; action: string }>({
      channel: DOSSIER_UPDATES_CHANNEL,
      onMessage: () => {
        void load();
      },
    });

    return () => {
      disconnectClientRealtime(DOSSIER_UPDATES_CHANNEL);
    };
  }, [load]);

  return { dossiers, loading, error, refresh: load };
}
