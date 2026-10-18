import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SECRET_NAMES = ['SUPABASE_SECRET_KEY', 'TURNSTILE_SECRET_KEY', 'OWNER_EMAIL', 'ANALYTICS_HASH_SECRET'];

async function clientFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    const SKIP = new Set(['node_modules', '.next', '.git', 'coverage']);
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIP.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const source = await readFile(path, 'utf8');
        if (/^["']use client["'];/m.test(source)) out.push(path);
      }
    }
  }
  await walk(root);
  return out;
}

describe('client secret boundary', () => {
  it('never references server secret env names from client components', async () => {
    for (const file of await clientFiles('.')) {
      const source = await readFile(file, 'utf8');
      for (const secret of SECRET_NAMES) expect(source, `${secret} leaked into ${file}`).not.toContain(secret);
    }
  });
});
