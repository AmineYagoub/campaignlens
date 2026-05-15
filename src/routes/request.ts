import type { Context } from 'hono';

export async function readJsonBody<T>(c: Context): Promise<T | Response> {
  try {
    return await c.req.json<T>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
}
