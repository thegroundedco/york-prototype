import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RETIRED = new Set(['product-single.html', 'product-generic.html', 'product-package.html']);
const SKIP = /^(https?:|mailto:|tel:|#|data:|\/\/)/;

export function verify(rootDir) {
  const errors = [];
  const files = readdirSync(rootDir).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const html = readFileSync(join(rootDir, f), 'utf8');
    const tok = html.match(/\{\{[^}]*\}\}/);
    if (tok) errors.push(`${f}: leftover token ${tok[0]}`);
    const refs = [...html.matchAll(/(?<![\w-])(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => m[1] ?? m[2]);
    for (const ref of refs) {
      if (SKIP.test(ref)) continue;
      const path = ref.split('#')[0].split('?')[0];
      if (!path) continue;
      if (RETIRED.has(path)) { errors.push(`${f}: links to retired template ${path}`); continue; }
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
