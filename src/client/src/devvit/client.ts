import { context, connectRealtime, disconnectRealtime, showToast } from '@devvit/web/client';
import { assertValidRealtimeChannel } from '../../../devvit/realtime-channels';

export const clientContext = context;

type ToastInput = Parameters<typeof showToast>[0];

export function showClientToast(toast: ToastInput): void {
  showToast(toast);
}

export function connectClientRealtime<TMessage>(opts: {
  channel: string;
  onConnect?: (channel: string) => void;
  onDisconnect?: (channel: string) => void;
  onMessage: (data: TMessage) => void;
}) {
  assertValidRealtimeChannel(opts.channel);
  return connectRealtime(opts);
}

export function disconnectClientRealtime(channel: string): void {
  assertValidRealtimeChannel(channel);
  disconnectRealtime(channel);
}
