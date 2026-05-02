import { useCallback, useEffect, useState } from 'react';
import type { ReplayGraph } from '../../../types/dossier';
import { fetchReplay } from '../lib/api';

export function useReplay(dossierId: string) {
  const [replay, setReplay] = useState<ReplayGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setReplay(await fetchReplay(dossierId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load replay');
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { replay, loading, error, refresh: load };
}
