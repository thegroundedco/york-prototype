// Populate the placeholder product-listing grids (category PLPs, new collection
// pages, Shop All, goal pages) with real products from data/merchandising.json,
// linked to their <slug>.html. Rewrites only the cards inside each grid; all
// surrounding bespoke markup (heroes, editorial, toolbars) is left byte-identical.
//
// Dev-time tool. Run: `npm run grids`. Site stays build-step-free.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadProducts } from '../lib/products.js';
import { loadMerchandising, resolveEntry } from '../lib/merchandising.js';
import { plpCardHtml, collectionCardHtml } from '../templates/shared.js';
import { replaceEachInner, replaceCount } from '../lib/html-inject.js';

// Single-category PLP: one `.plp-category__grid`, one "Showing all N results" count.
export function injectSingleCatPlp(html, cards, count) {
  let out = replaceEachInner(html, /<div class="plp-category__grid">/, [`\n${cards}\n      `]);
  out = replaceCount(out, /Showing all \d+ results/, `Showing all ${count} results`);
  return out;
}

// --- CLI ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const products = loadProducts('data/products.json');
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const merch = loadMerchandising('data/merchandising.json');

  // Every single-grid collection page (5 existing category PLPs + 3 new ones).
  const SINGLE_CAT = ['racks-benches', 'bars-weights', 'cardio-conditioning', 'accessories', 'storage'];
  for (const key of SINGLE_CAT) {
    const c = merch.collections[key];
    const cards = c.products.map((e) => plpCardHtml(resolveEntry(e, bySlug))).join('\n');
    const html = readFileSync(c.page, 'utf8');
    writeFileSync(c.page, injectSingleCatPlp(html, cards, c.products.length), 'utf8');
    console.log(`  ${c.page}: ${c.products.length} cards`);
  }
  console.log(`Injected ${SINGLE_CAT.length} single-category PLPs.`);
}
