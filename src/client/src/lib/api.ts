import type { DossierSummary, EvidenceDossier, DossierAction, ReplayGraph } from '../../../types/dossier';
import type { CampaignLensConfig } from '../../../types/config';

export async function fetchDossiers(): Promise<DossierSummary[]> {
  const res = await fetch('/api/dossiers');
  if (!res.ok) throw new Error('Failed to fetch dossiers');
  return res.json();
}

export async function fetchDossier(id: string): Promise<EvidenceDossier> {
  const res = await fetch(`/api/dossiers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch dossier');
  return res.json();
}

export async function postAction(id: string, action: DossierAction): Promise<EvidenceDossier> {
  const res = await fetch(`/api/dossiers/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to post action');
  return res.json();
}

export async function fetchConfig(): Promise<CampaignLensConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function updateConfig(config: CampaignLensConfig): Promise<CampaignLensConfig> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update config');
  return res.json();
}

export async function fetchStats(): Promise<Record<string, number>> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchReplay(id: string): Promise<ReplayGraph> {
  const res = await fetch(`/api/dossiers/${id}/replay`);
  if (!res.ok) throw new Error('Failed to fetch replay');
  return res.json();
}
