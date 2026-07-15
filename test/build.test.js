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
});
