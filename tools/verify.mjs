import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProducts } from '../lib/products.js';
import { loadMerchandising, resolveEntry, FILTER_LABELS } from '../lib/merchandising.js';

const RETIRED = new Set(['product-single.html', 'product-generic.html', 'product-package.html']);
const SKIP = /^(https?:|mailto:|tel:|#|data:|\/\/)/;

// Pages populated by the grid injector: they must NOT reference a retired
// template (a regression there is a build failure, not a deferred warning).
const IN_SCOPE = ['plp-racks-benches', 'plp-bars-weights', 'plp-cardio-conditioning',
  'plp-accessories', 'plp-storage', 'plp-systems', 'plp-recovery-mobility', 'plp-essentials',
  'plp-equipment', 'beginners-collection', 'muscle-maintenance', 'longevity-collection']
  .map((s) => `${s}.html`);
const GOAL_PAGES = ['beginners-collection.html', 'muscle-maintenance.html', 'longevity-collection.html'];

// Checks specific to the merchandising/injection pass. Returns { errors }.
export function verifyMerchandising(rootDir) {
  const errors = [];
  for (const f of IN_SCOPE) {
    const p = join(rootDir, f);
    if (!existsSync(p)) { errors.push(`in-scope page missing: ${f}`); continue; }
    if (/href="product-(single|generic|package)\.html"/.test(readFileSync(p, 'utf8'))) {
      errors.push(`${f}: still links to a retired product-*.html template`);
    }
  }
  for (const f of GOAL_PAGES) {
    const n = (readFileSync(join(rootDir, f), 'utf8').match(/data-collection-products/g) || []).length;
    if (n !== 3) errors.push(`${f}: expected 3 data-collection-products sections, found ${n}`);
  }
  const products = loadProducts(join(rootDir, 'data/products.json'));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  for (const p of products) {
    if (!FILTER_LABELS[p.filterType]) errors.push(`product ${p.slug}: invalid filterType "${p.filterType}"`);
  }
  const merch = loadMerchandising(join(rootDir, 'data/merchandising.json'));
  const entries = [
    ...Object.values(merch.collections).flatMap((c) => c.products),
    ...Object.values(merch.goals).flatMap((g) => [...(g.cta || []), ...g.sections.flatMap((s) => s.products)]),
  ];
  for (const e of entries) {
    try { resolveEntry(e, bySlug); } catch (err) { errors.push(`merchandising: ${err.message}`); }
  }
  return { errors };
}

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
  const merch = verifyMerchandising('.');
  const allErrors = [...errors, ...merch.errors];
  if (warnings.length) console.log(`VERIFY: ${warnings.length} deferred warnings (homepage/search still link to templates) — not build-failing.`);
  if (allErrors.length) { console.error(`VERIFY FAILED (${allErrors.length}):\n` + allErrors.join('\n')); process.exit(1); }
  console.log('VERIFY OK');
}
