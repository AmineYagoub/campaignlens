/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

// Devvit client exports are resolved at build time by the Devvit Vite plugin.
// These declarations make tsc happy during type-checking.
declare module '@devvit/web/client' {
  export const context: {
    subredditId: string;
    subredditName: string;
    userId: string | undefined;
    postId: string | undefined;
    commentId: string | undefined;
    appName: string;
    appSlug: string;
    appVersion: string;
    username: string | undefined;
  };

  export function showToast(text: string): void;
  export function showToast(toast: { text: string; appearance?: number }): void;

  export function connectRealtime<T>(opts: {
    channel: string;
    onConnect?: (channel: string) => void;
    onDisconnect?: (channel: string) => void;
    onMessage: (data: T) => void;
  }): { disconnect(): Promise<void> };

  export function disconnectRealtime(channel: string): void;
}
