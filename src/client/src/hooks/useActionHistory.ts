import { useCallback, useEffect, useState } from 'react';
import type { ActionExecutionRecord } from '../../../types/action';
import { fetchActionHistory } from '../lib/api';

export function useActionHistory() {
  const [records, setRecords] = useState<ActionExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRecords(await fetchActionHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load action history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { records, loading, error, refresh: load };
}
