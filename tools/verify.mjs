import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RETIRED = new Set(['product-single.html', 'product-generic.html', 'product-package.html']);
const SKIP = /^(https?:|mailto:|tel:|#|data:|\/\/)/;

export function verify(rootDir) {
  const errors = [];
  const warnings = [];
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
      const present = existsSync(join(rootDir, path));
      if (RETIRED.has(path)) {
        // The 3 placeholder templates are kept this pass as landing pages for
        // PLP/collection card-grid links (deferred to the PLP pass). A link to a
        // template that still exists is a known-deferred WARNING, not a build
        // failure; a link to a template that's been removed is a dead-link ERROR.
        if (present) warnings.push(`${f}: links to retired template ${path} (kept; deferred PLP pass)`);
        else errors.push(`${f}: dead link to retired template ${path}`);
        continue;
      }
      if (!present) errors.push(`${f}: dead local ref ${ref}`);
    }
  }
  return { errors, warnings };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, warnings } = verify('.');
  if (warnings.length) console.log(`VERIFY: ${warnings.length} deferred-PLP warnings (template card-grid links) — not build-failing.`);
  if (errors.length) { console.error(`VERIFY FAILED (${errors.length}):\n` + errors.join('\n')); process.exit(1); }
  console.log('VERIFY OK');
}
