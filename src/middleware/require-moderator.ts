import { context } from '@devvit/web/server';
import { reddit } from '@devvit/web/server';
import type { Context, Next } from 'hono';

/**
 * Middleware: verify the requesting user is a moderator of the current subreddit.
 * Uses reddit.getModerators({ subredditName, username }) which returns a Listing<User>.
 * Non-empty listing = user is a moderator.
 */
export async function requireModerator(c: Context, next: Next): Promise<Response | void> {
  const username = context.username;
  const subredditName = context.subredditName;

  if (!username || !subredditName) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  try {
    const mods = await reddit.getModerators({
      subredditName,
      username,
    });

    const modList = await mods.all();
    if (modList.length === 0) {
      return c.json({ error: 'Forbidden: moderator access required' }, 403);
    }

    return next();
  } catch {
    return c.json({ error: 'Forbidden: could not verify moderator status' }, 403);
  }
}
