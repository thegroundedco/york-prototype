import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewrite, LINK_MAP } from '../tools/rewire-links.mjs';

test('rewrites a confident match to the real slug', () => {
  const { html, rewired } = rewrite('<a href="product-generic.html">Fitness Bench</a>');
  assert.match(html, /href="york-fitness-bench\.html">Fitness Bench<\/a>/);
  assert.equal(rewired, 1);
});

test('decodes HTML entities before matching', () => {
  const { html } = rewrite('<a href="product-single.html">Men&#39;s North American Chrome Olympic Training Weight Bar</a>');
  assert.match(html, /href="mens-north-american-chrome-olympic-training-weight-bar\.html"/);
});

test('all three tier-stand variants map to the one stand product', () => {
  for (const t of ['Mini 2-Tier Dumbbell Stand', '2 Tier Dumbbell Stand', '3 Tier Dumbbell Stand']) {
    const { html } = rewrite(`<a href="product-generic.html">${t}</a>`);
    assert.match(html, /href="york-dumbbell-stand\.html"/, `${t} should map to the stand`);
  }
});

test('leaves placeholder and out-of-scope links untouched, reports them', () => {
  const { html, rewired, unmatched } = rewrite(
    '<a href="product-generic.html">Product Title</a><a href="product-single.html">Cast Iron Kettlebell Set</a>',
  );
  assert.match(html, /href="product-generic\.html">Product Title/);
  assert.match(html, /href="product-single\.html">Cast Iron Kettlebell Set/);
  assert.equal(rewired, 0);
  assert.deepEqual(unmatched.sort(), ['Cast Iron Kettlebell Set', 'Product Title']);
});

test('preserves extra attributes on the anchor', () => {
  const { html } = rewrite('<a class="x" href="product-package.html">Plyo Package</a>');
  assert.match(html, /<a class="x" href="plyo-package\.html">Plyo Package<\/a>/);
});

test('every LINK_MAP target is a real product slug shape', () => {
  for (const slug of Object.values(LINK_MAP)) assert.match(slug, /^[a-z0-9-]+$/);
});

test('out-of-scope nav item falls back to its category PLP', () => {
  const { html, rewired } = rewrite('<a href="product-single.html">Aspire 110 Rower</a>');
  assert.match(html, /href="plp-cardio-conditioning\.html">Aspire 110 Rower<\/a>/);
  assert.equal(rewired, 1);
});
