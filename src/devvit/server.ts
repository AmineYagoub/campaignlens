import { createServer, getServerPort } from '@devvit/web/server';
import type { RequestListener } from 'node:http';

export function listenWithDevvitServer(listener: RequestListener): void {
  createServer(listener).listen(getServerPort());
}
