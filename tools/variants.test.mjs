import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts, validateProduct } from '../lib/products.js';
import { weightSelectorHtml, variantBlock, setOrIndividualHtml } from '../templates/shared.js';

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

// ── Task 2: renderer + dispatcher ───────────────────────────────────

test('variantBlock falls back to the quantity stepper for type=quantity', () => {
  assert.match(variantBlock({ variants: { type: 'quantity' } }), /pdp__quantity/);
  assert.match(variantBlock({}), /pdp__quantity/); // missing variants -> quantity
});

test('weightSelectorHtml renders one row per weight with price data + a subtotal', () => {
  const p = bySlug.get('rubber-training-bumper-plates');
  const h = weightSelectorHtml(p);
  assert.match(h, /data-weight-selector/);
  assert.equal((h.match(/data-weight-row/g) || []).length, 5);
  assert.match(h, /data-weight-price="20.80"[^>]*>\$20\.80 each/);
  assert.match(h, /pdp__weight-qty[^>]*value="0"[^>]*data-weight-qty/);
  assert.match(h, /data-weight-subtotal[^>]*>\$0\.00/);
});

test('variantBlock routes weight-selector products to the matrix', () => {
  assert.match(variantBlock(bySlug.get('slam-ball')), /data-weight-selector/);
});

// ── set-or-individual: data + validation ────────────────────────────

test('the 2 set-or-individual products have valid data', () => {
  for (const slug of ['rubber-hex-dumbbell-set', 'kettlebells']) {
    const p = bySlug.get(slug);
    assert.equal(p.variants.type, 'set-or-individual');
    assert.ok(['bundle', 'individual'].includes(p.variants.default));
    assert.ok(p.variants.bundles.length >= 1 && p.variants.individual.length >= 1);
    assert.deepEqual(validateProduct(p), []);
  }
});

test('validateProduct rejects a set-or-individual with an empty side', () => {
  const bad = { ...bySlug.get('kettlebells'), variants: { type: 'set-or-individual', default: 'bundle', bundleLabel: 'Package', bundles: [], individual: [{ weight: '5 lb', price: 8.45 }] } };
  assert.ok(validateProduct(bad).some((e) => /bundles|set-or-individual/i.test(e)));
});

// ── set-or-individual: renderer + dispatcher ────────────────────────

test('setOrIndividualHtml renders 2 tabs, 2 panels, both selects, default panel visible', () => {
  const h = setOrIndividualHtml(bySlug.get('rubber-hex-dumbbell-set'));
  assert.match(h, /data-soi-tab="bundle"[^>]*>Set</);
  assert.match(h, /data-soi-tab="individual"[^>]*>Individual</);
  assert.equal((h.match(/data-soi-select/g) || []).length, 2);
  assert.match(h, /data-soi-panel="individual"[^>]*hidden/);
  assert.match(h, /value="805.81"[^>]*selected>5 – 50 lb Set/);
  assert.match(h, /data-soi-total[^>]*>\$805\.81/);
});

test('setOrIndividualHtml honors default=individual (kettlebells) + bundleLabel', () => {
  const h = setOrIndividualHtml(bySlug.get('kettlebells'));
  assert.match(h, /data-soi-tab="bundle"[^>]*>Package</);
  assert.match(h, /data-soi-panel="bundle"[^>]*hidden/);
  assert.match(h, /data-soi-total[^>]*>\$8\.45/);
});

test('variantBlock routes set-or-individual to the toggle', () => {
  assert.match(variantBlock(bySlug.get('kettlebells')), /data-soi/);
});
