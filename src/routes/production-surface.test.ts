import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      files.push(path);
    }
  }
  return files;
}

function sourceText(): string {
  return sourceFiles(SOURCE_ROOT)
    .map((file) => `\n// ${relative(process.cwd(), file)}\n${readFileSync(file, 'utf8')}`)
    .join('\n');
}

describe('production runtime surface', () => {
  it('does not ship demo routes or synthetic demo identifiers', () => {
    const source = sourceText();

    expect(source).not.toContain('/api/demo');
    expect(source).not.toContain('apiDemo');
    expect(source).not.toContain('t1_demo_');
    expect(source).not.toContain('t3_demo_');
    expect(source).not.toContain('cl:demo:seeded');
  });

  it('reserves action routes for real enforcement and uses feedback for dossier status updates', () => {
    const source = sourceText();

    expect(source).toContain('/:id/feedback');
    expect(source).toContain('/:id/action-preview');
    expect(source).toContain('/drafts/:id/execute');
    expect(source).not.toMatch(/['"`]\/:id\/action['"`]/);
    expect(source).not.toContain('/api/dossiers/${id}/action');
    expect(source).not.toContain('postAction');
    expect(source).not.toContain('DossierAction');
  });
});
