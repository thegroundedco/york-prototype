import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts, validateProduct } from '../lib/products.js';

const products = loadProducts('data/products.json');
const bySlug = new Map(products.map((p) => [p.slug, p]));

// ── Task 1: variant data + validation ───────────────────────────────

test('the 2 weight-selector products have valid option data', () => {
  for (const slug of ['rubber-training-bumper-plates', 'slam-ball']) {
    const p = bySlug.get(slug);
    assert.equal(p.variants.type, 'weight-selector');
    assert.ok(Array.isArray(p.variants.options) && p.variants.options.length >= 1);
    for (const o of p.variants.options) {
      assert.match(o.weight, /\d+\s*lb/i);
      assert.equal(typeof o.price, 'number');
      assert.ok(o.price > 0);
    }
    assert.deepEqual(validateProduct(p), []);
  }
});

test('validateProduct rejects a malformed weight-selector', () => {
  const bad = { ...bySlug.get('slam-ball'), variants: { type: 'weight-selector', options: [{ weight: '5 lb' }] } };
  assert.ok(validateProduct(bad).some((e) => /weight-selector|price/i.test(e)));
});
