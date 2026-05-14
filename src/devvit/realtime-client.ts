import { realtime } from '@devvit/web/server';
import { assertValidRealtimeChannel } from './realtime-channels';

type RealtimePayload = Parameters<typeof realtime.send>[1];

export async function sendRealtime<TPayload extends RealtimePayload>(
  channel: string,
  payload: TPayload
): Promise<void> {
  assertValidRealtimeChannel(channel);
  await realtime.send(channel, payload);
}
