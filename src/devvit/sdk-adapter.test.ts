import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { assertValidRealtimeChannel, DOSSIER_UPDATES_CHANNEL } from './realtime-channels';

const SOURCE_ROOT = join(process.cwd(), 'src');
const ADAPTER_PATHS = [
  'src/devvit/',
  'src/client/src/devvit/',
  'src/client/src/vite-env.d.ts',
];

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.(ts|tsx|d\.ts)$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

function normalizedRelativePath(path: string): string {
  return relative(process.cwd(), path).split('\\').join('/');
}

describe('Devvit SDK adapter boundary', () => {
  it('keeps direct Devvit SDK imports inside adapter files', () => {
    const violations = sourceFiles(SOURCE_ROOT)
      .map((file) => ({
        file: normalizedRelativePath(file),
        source: readFileSync(file, 'utf8'),
      }))
      .filter(({ file }) => !ADAPTER_PATHS.some((allowedPath) => file.startsWith(allowedPath)))
      .filter(({ source }) => /from ['"]@devvit\/|import\(['"]@devvit\//.test(source))
      .map(({ file }) => file);

    expect(violations).toEqual([]);
  });

  it('keeps realtime channels compatible with Devvit channel rules', () => {
    expect(() => assertValidRealtimeChannel(DOSSIER_UPDATES_CHANNEL)).not.toThrow();
    expect(() => assertValidRealtimeChannel('dossier-updates')).toThrow();
  });
});
