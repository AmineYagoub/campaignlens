import { useState, useEffect, useCallback } from 'react';
import type { EvidenceDossier } from '../../../types/dossier';
import { fetchDossier } from '../lib/api';

export function useDossier(id: string | null) {
  const [dossier, setDossier] = useState<EvidenceDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setDossier(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchDossier(id);
      setDossier(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dossier');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { dossier, loading, error, refresh: load };
}
