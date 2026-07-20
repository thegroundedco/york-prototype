import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts } from '../lib/products.js';
import { loadMerchandising, resolveEntry, FILTER_LABELS } from '../lib/merchandising.js';
import { plpCardHtml, collectionCardHtml } from '../templates/shared.js';
import { replaceEachInner, replaceCount } from '../lib/html-inject.js';
import { injectSingleCatPlp, injectShopAll } from './inject-grids.mjs';

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

// ── Task 3: html-inject helper ──────────────────────────────────────

test('replaceEachInner swaps inner of one container, keeps surroundings', () => {
  const html = `<x><div class="grid">\n  <article>OLD</article>\n</div><y>`;
  const out = replaceEachInner(html, /<div class="grid">/, ['NEW']);
  assert.equal(out, `<x><div class="grid">NEW</div><y>`);
});

test('replaceEachInner handles nested same-tag children', () => {
  const html = `<div class="grid"><article><div class="card"><div>x</div></div></article></div>`;
  const out = replaceEachInner(html, /<div class="grid">/, ['Z']);
  assert.equal(out, `<div class="grid">Z</div>`);
});

test('replaceEachInner replaces N containers left-to-right', () => {
  const html = `<section><div class="g">A</div></section><section><div class="g">B</div></section>`;
  const out = replaceEachInner(html, /<div class="g">/, ['1', '2']);
  assert.equal(out, `<section><div class="g">1</div></section><section><div class="g">2</div></section>`);
});

test('replaceEachInner is idempotent when fed identical new inner', () => {
  const html = `<div class="g"><article>OLD</article></div>`;
  const once = replaceEachInner(html, /<div class="g">/, ['<article>NEW</article>']);
  const twice = replaceEachInner(once, /<div class="g">/, ['<article>NEW</article>']);
  assert.equal(once, twice);
});

test('replaceEachInner throws when a container is missing', () => {
  assert.throws(() => replaceEachInner('<div class="g">x</div>', /<div class="g">/, ['a', 'b']));
});

test('replaceEachInner balances a non-div tag when told to', () => {
  const html = `<ul class="f"><li>a</li><li>b</li></ul>`;
  const out = replaceEachInner(html, /<ul class="f">/, ['<li>x</li>'], 'ul');
  assert.equal(out, `<ul class="f"><li>x</li></ul>`);
});

test('replaceCount asserts a match exists', () => {
  assert.equal(
    replaceCount('<p class="c">Showing all 12 results</p>', /Showing all \d+ results/, 'Showing all 4 results'),
    '<p class="c">Showing all 4 results</p>');
  assert.throws(() => replaceCount('<p>none</p>', /Showing all \d+ results/, 'x'));
});

// ── Task 4: single-category PLP injector ────────────────────────────

test('injectSingleCatPlp swaps cards and updates the count', () => {
  const html = `<div class="plp-category__toolbar"><p class="plp-category__count">Showing all 12 results</p></div>
<div class="plp-category__grid">
  <article class="plp__card">OLD</article>
</div>`;
  const out = injectSingleCatPlp(html, `        <article class="plp__card">NEW</article>`, 4);
  assert.match(out, /Showing all 4 results/);
  assert.match(out, /plp__card">NEW/);
  assert.doesNotMatch(out, /plp__card">OLD/);
});

// ── Task 6: Shop All injector ───────────────────────────────────────

test('injectShopAll fills each category section grid in document order', () => {
  const html = `<section data-plp-category="racks-benches"><div class="plp__grid"><article>OLD</article></div></section>
<section data-plp-category="storage"><div class="plp__grid"><article>OLD</article></div></section>`;
  const out = injectShopAll(html, [
    { attr: 'racks-benches', cards: '<article>RB</article>' },
    { attr: 'storage', cards: '<article>ST</article>' },
  ]);
  assert.match(out, /data-plp-category="racks-benches"><div class="plp__grid"><article>RB/);
  assert.match(out, /data-plp-category="storage"><div class="plp__grid"><article>ST/);
  assert.doesNotMatch(out, /OLD/);
});
