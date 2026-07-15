import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RETIRED = ['product-single.html', 'product-generic.html', 'product-package.html'];

export function verify(rootDir) {
  const errors = [];
  const files = readdirSync(rootDir).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const html = readFileSync(join(rootDir, f), 'utf8');
    if (html.includes('{{')) errors.push(`${f}: leftover {{token}}`);
    for (const r of RETIRED) {
      if (html.includes(`href="${r}"`)) errors.push(`${f}: links to retired template ${r}`);
    }
    const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) {
      if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
      const path = ref.split('#')[0].split('?')[0];
      if (!path) continue;
      if (!existsSync(join(rootDir, path))) errors.push(`${f}: dead local ref ${ref}`);
    }
  }
  return { errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors } = verify('.');
  if (errors.length) { console.error(`VERIFY FAILED (${errors.length}):\n` + errors.join('\n')); process.exit(1); }
  console.log('VERIFY OK');
}
