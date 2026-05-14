const REALTIME_CHANNEL_PATTERN = /^[A-Za-z0-9_]+$/;

export const DOSSIER_UPDATES_CHANNEL = 'dossier_updates';

export function assertValidRealtimeChannel(channel: string): void {
  if (!REALTIME_CHANNEL_PATTERN.test(channel)) {
    throw new Error(
      `Invalid Devvit realtime channel "${channel}". Use only letters, numbers, and underscores.`
    );
  }
}
