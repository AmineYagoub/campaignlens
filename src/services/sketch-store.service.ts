import { seenKey, deletedKey } from './redis-keys.service';
import { TTL } from './ttl.service';
import { safeHDel, safeHGet, safeHSet, safeExpire } from './redis-safe.service';

export async function isProcessed(contentId: string): Promise<boolean> {
  const now = Date.now();
  // Check current and previous 2 day buckets
  for (let offset = 0; offset <= 2; offset++) {
    const d = new Date(now - offset * 86_400_000);
    const bucket = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const key = seenKey(bucket);
    const exists = await safeHGet(key, contentId);
    if (exists !== undefined) return true;
  }
  return false;
}

export async function markProcessed(contentId: string): Promise<void> {
  const now = new Date();
  const bucket = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const key = seenKey(bucket);
  const wrote = await safeHSet(key, { [contentId]: '1' });
  if (wrote) await safeExpire(key, TTL.SEEN_DAYS);
}

export async function markDeleted(contentId: string): Promise<void> {
  const now = new Date();
  const bucket = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const key = deletedKey(bucket);
  const wrote = await safeHSet(key, { [contentId]: '1' });
  if (wrote) await safeExpire(key, TTL.DELETED_HOURS);

  // Also remove from seen sets
  for (let offset = 0; offset <= 2; offset++) {
    const d = new Date(Date.now() - offset * 86_400_000);
    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const sKey = seenKey(dayStr);
    await safeHDel(sKey, [contentId]);
  }
}

export async function isDeleted(contentId: string): Promise<boolean> {
  const now = Date.now();
  for (let offset = 0; offset <= 1; offset++) {
    const d = new Date(now - offset * 86_400_000);
    const bucket = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const key = deletedKey(bucket);
    const exists = await safeHGet(key, contentId);
    if (exists !== undefined) return true;
  }
  return false;
}
