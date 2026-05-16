import type { Context, Next } from 'hono';
import { requireCurrentModeratorContext } from '../devvit/context';
import { getModerators } from '../devvit/reddit-client';

/**
 * Middleware: verify the requesting user is a moderator of the current subreddit.
 * Uses the Devvit adapter to read moderator membership for the current subreddit.
 */
export async function requireModerator(c: Context, next: Next): Promise<Response | void> {
  const moderatorContext = requireCurrentModeratorContext();

  if (!moderatorContext) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  try {
    const mods = await getModerators({
      subredditName: moderatorContext.subredditName,
      username: moderatorContext.username,
      limit: 1,
    });

    const modList = await mods.all();
    const isCurrentUserModerator = modList.some(
      (mod) => mod.username.toLowerCase() === moderatorContext.username.toLowerCase()
    );

    if (!isCurrentUserModerator) {
      return c.json({ error: 'Forbidden: moderator access required' }, 403);
    }

    return next();
  } catch {
    return c.json({ error: 'Forbidden: could not verify moderator status' }, 403);
  }
}
