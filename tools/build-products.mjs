import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProducts, validateProduct } from '../lib/products.js';
import { renderProduct } from '../templates/index.js';

export function buildAll(products, outDir) {
  const written = [];
  const errors = [];
  for (const p of products) {
    const errs = validateProduct(p);
    if (errs.length) { errors.push(`${p.slug || '(no slug)'}: ${errs.join('; ')}`); continue; }
    const html = renderProduct(p);
    if (html.includes('{{')) { errors.push(`${p.slug}: leftover {{token}} in output`); continue; }
    const file = join(outDir, `${p.slug}.html`);
    writeFileSync(file, html, 'utf8');
    written.push(file);
  }
  return { written, errors };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const products = loadProducts('data/products.json');
  const { written, errors } = buildAll(products, '.');
  console.log(`Wrote ${written.length} pages.`);
  if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
}
