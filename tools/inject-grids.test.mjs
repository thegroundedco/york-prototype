import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts } from '../lib/products.js';
import { loadMerchandising, resolveEntry, FILTER_LABELS } from '../lib/merchandising.js';
import { plpCardHtml, collectionCardHtml } from '../templates/shared.js';

const products = loadProducts('data/products.json');
const bySlug = new Map(products.map((p) => [p.slug, p]));
const merch = loadMerchandising('data/merchandising.json');

// ── Task 1: data model ──────────────────────────────────────────────

test('every product has a filterType in the allowed set', () => {
  for (const p of products) {
    assert.ok(p.filterType, `${p.slug} missing filterType`);
    assert.ok(FILTER_LABELS[p.filterType], `${p.slug} has unknown filterType "${p.filterType}"`);
  }
});

test('every merchandising slug resolves to a real product', () => {
  const entries = [
    ...Object.values(merch.collections).flatMap((c) => c.products),
    ...Object.values(merch.goals).flatMap((g) => g.sections.flatMap((s) => s.products)),
  ];
  for (const e of entries) assert.doesNotThrow(() => resolveEntry(e, bySlug));
});

test('resolveEntry applies label override but resolves image/price from base slug', () => {
  const r = resolveEntry({ slug: 'vinyl-fitbell', label: 'Neoprene Hex Dumbbells' }, bySlug);
  assert.equal(r.name, 'Neoprene Hex Dumbbells');
  assert.equal(r.href, 'vinyl-fitbell.html');
  assert.ok(r.image.includes('vinyl-fitbell'));
});

test('collection card counts match the spec (App. A)', () => {
  const counts = Object.fromEntries(
    Object.entries(merch.collections).map(([k, c]) => [k, c.products.length]));
  assert.deepEqual(counts, {
    'racks-benches': 4, 'bars-weights': 9, 'cardio-conditioning': 7, 'accessories': 4,
    'storage': 4, 'systems': 7, 'recovery-mobility': 5, 'essentials': 9,
  });
});

test('each goal has exactly 3 sections with the spec counts (App. A)', () => {
  const shape = Object.fromEntries(
    Object.entries(merch.goals).map(([k, g]) => [k, g.sections.map((s) => s.products.length)]));
  assert.deepEqual(shape, {
    'beginners': [12, 6, 5],
    'muscle-maintenance': [10, 7, 5],
    'longevity': [8, 5, 6],
  });
});

// ── Task 2: card renderers ──────────────────────────────────────────

const saleCard = { href: 'slam-ball.html', name: 'Slam Ball', image: 'a.jpg', price: { current: 40, compareAt: 60 }, filterType: 'balls' };
const plainCard = { href: 'kettlebells.html', name: 'Kettlebells', image: 'k.jpg', price: { current: 80 }, filterType: 'kettlebells' };

test('plpCardHtml links title to the PDP and shows a sale badge + strikethrough', () => {
  const h = plpCardHtml(saleCard);
  assert.match(h, /class="plp__card"/);
  assert.match(h, /href="slam-ball\.html"[^>]*>Slam Ball</);
  assert.match(h, /plp__card-badge">Sale/);
  assert.match(h, /plp__card-price--original">\$60/);
});

test('plpCardHtml with no compareAt shows a single price and no badge', () => {
  const h = plpCardHtml(plainCard);
  assert.doesNotMatch(h, /badge">Sale/);
  assert.match(h, /plp__card-price">\$80/);
});

test('collectionCardHtml tags the card with its filterType', () => {
  const h = collectionCardHtml(plainCard);
  assert.match(h, /data-collection-card-category="kettlebells"/);
  assert.match(h, /href="kettlebells\.html"[^>]*>Kettlebells</);
  assert.doesNotMatch(h, /badge">Sale/);
});
