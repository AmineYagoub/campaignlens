import { useState, useEffect, useCallback } from 'react';
import type { CampaignLensConfig } from '../../../types/config';
import { fetchConfig, updateConfig } from '../lib/api';
import { DEFAULT_CONFIG } from '../../../types/config';

export function useConfig() {
  const [config, setConfig] = useState<CampaignLensConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConfig();
      setConfig(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (updated: CampaignLensConfig) => {
    try {
      setSaving(true);
      setError(null);
      const data = await updateConfig(updated);
      setConfig(data);
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save config';
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { config, loading, saving, error, save, refresh: load };
}
