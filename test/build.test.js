import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProducts } from '../lib/products.js';
import { buildAll } from '../tools/build-products.mjs';

test('buildAll writes one file per product', () => {
  const products = loadProducts('data/products.sample.json');
  const out = mkdtempSync(join(tmpdir(), 'york-'));
  const res = buildAll(products, out);
  assert.deepEqual(res.errors, []);
  assert.equal(res.written.length, 1);
  const file = join(out, 'sample-bench.html');
  assert.ok(existsSync(file));
  const html = readFileSync(file, 'utf8');
  assert.match(html, /Sample Bench/);
  assert.doesNotMatch(html, /\{\{/);
});

test('buildAll reports invalid products and skips writing them', () => {
  const bad = [{ slug: 'x', template: 'nope', images: { gallery: [] } }];
  const out = mkdtempSync(join(tmpdir(), 'york-'));
  const res = buildAll(bad, out);
  assert.ok(res.errors.length > 0);
  assert.equal(res.written.length, 0);
  assert.ok(!existsSync(join(out, 'x.html')));
});

test('buildAll isolates a per-product render failure and still builds the rest', () => {
  const [sample] = loadProducts('data/products.sample.json');
  // Passes validateProduct (valid slug/template/name/etc.) but throws during
  // rendering: reading `keyFeatures` blows up. Proves one bad product is collected
  // as an error instead of crashing the whole batch.
  const exploding = {
    slug: 'kaboom',
    template: 'single',
    name: 'Kaboom',
    shortDescription: 'boom',
    categoryLabel: 'Cat',
    category: 'equipment',
    price: null,
    images: { gallery: ['a.jpg', 'b.jpg', 'c.jpg'] },
    detailsBody: '',
    get keyFeatures() { throw new Error('boom'); },
  };
  const out = mkdtempSync(join(tmpdir(), 'york-'));
  // Bad product FIRST: if the loop aborted on its throw, the sample would never build.
  const res = buildAll([exploding, sample], out);

  // The valid product still built...
  assert.ok(existsSync(join(out, 'sample-bench.html')));
  assert.ok(res.written.some((f) => f.endsWith('sample-bench.html')));
  // ...and the exploding one was collected as an error, not written.
  assert.ok(res.errors.some((e) => e.includes('kaboom')));
  assert.ok(!existsSync(join(out, 'kaboom.html')));
});
