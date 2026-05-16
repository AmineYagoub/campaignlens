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
    const scopedMods = await getModerators({
      subredditName: moderatorContext.subredditName,
      username: moderatorContext.username,
      limit: 1,
    });

    if (await listingContainsCurrentUser(scopedMods, moderatorContext.username)) {
      return next();
    }

    const allMods = await getModerators({
      subredditName: moderatorContext.subredditName,
      limit: 200,
    });

    if (!(await listingContainsCurrentUser(allMods, moderatorContext.username))) {
      return c.json({ error: 'Forbidden: moderator access required' }, 403);
    }

    return next();
  } catch {
    return c.json({ error: 'Forbidden: could not verify moderator status' }, 403);
  }
}

async function listingContainsCurrentUser(
  listing: ReturnType<typeof getModerators>,
  username: string
): Promise<boolean> {
  const expectedUsername = normalizeUsername(username);
  const modList = await listing.all();

  return modList.some((mod) => normalizeUsername(mod.username) === expectedUsername);
}

function normalizeUsername(username: string): string {
  return username.replace(/^u\//i, '').toLowerCase();
}
