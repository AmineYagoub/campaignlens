import type { CampaignLensConfig } from '../types/config';

export function signalValue(signalKey: string): string {
  return signalKey.includes(':') ? signalKey.split(':').slice(1).join(':') : signalKey;
}

export function normalizedListValue(value: string): string {
  return value.trim().toLowerCase();
}

export function signalMatchesList(signalKey: string, list: string[]): boolean {
  const key = normalizedListValue(signalKey);
  const value = normalizedListValue(signalValue(signalKey));

  return list.some((entry) => {
    const normalized = normalizedListValue(entry);
    return normalized === key || normalized === value;
  });
}

export function isAllowlistedSignal(signalKey: string, config: CampaignLensConfig): boolean {
  return signalMatchesList(signalKey, config.allowlist);
}

export function isWatchedSignal(signalKey: string, config: CampaignLensConfig): boolean {
  return signalMatchesList(signalKey, config.blocklist);
}

export function filterAllowlistedSignals(
  signalKeys: string[],
  config: CampaignLensConfig
): string[] {
  return signalKeys.filter((signalKey) => !isAllowlistedSignal(signalKey, config));
}
