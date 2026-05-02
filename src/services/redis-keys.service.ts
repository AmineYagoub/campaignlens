export function hourBucket(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}`;
}

export function seenKey(dayBucket: string): string {
  return `cl:seen:${dayBucket}`;
}

export function deletedKey(dayBucket: string): string {
  return `cl:deleted:${dayBucket}`;
}

export function domainCounterKey(domain: string, bucket: string): string {
  return `cl:cnt:domain:${domain}:${bucket}`;
}

export function brandCounterKey(brand: string, bucket: string): string {
  return `cl:cnt:brand:${brand}:${bucket}`;
}

export function simCounterKey(prefix: string, bucket: string): string {
  return `cl:cnt:sim:${prefix}:${bucket}`;
}

export function heavyHitterKey(window: string): string {
  return `cl:hh:top:${window}`;
}

export function evidenceKey(id: string): string {
  return `cl:evidence:${id}`;
}

export function evidenceContentKey(contentId: string): string {
  return `cl:evidence:content:${contentId}`;
}

export function evidenceContentSignalIndexKey(contentId: string): string {
  return `cl:evidence:content-signal:${contentId}`;
}

export function evidenceSignalIndexKey(signalKey: string, bucket: string): string {
  return `cl:evidence:signal:${signalKey}:${bucket}`;
}

export function reportCounterKey(signalKey: string, bucket: string): string {
  return `cl:report:${signalKey}:${bucket}`;
}

export function dossierKey(id: string): string {
  return `cl:dossier:${id}`;
}

export const DOSSIERS_ACTIVE_KEY = 'cl:dossiers:active';
export const CONFIG_KEY = 'cl:config';
export const STATS_KEY = 'cl:stats';
export const PRECISION_KEY = 'cl:precision';
export const BASELINE_KEY = 'cl:baseline';
export const DEMO_SEEDED_KEY = 'cl:demo:seeded';
