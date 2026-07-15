import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProducts, validateProduct } from '../lib/products.js';

const valid = {
  slug: 'x', name: 'X', template: 'single', category: 'c', categoryLabel: 'C',
  price: { current: 10, compareAt: null, sourceUrl: '' },
  shortDescription: 'desc', keyFeatures: [], specs: [], detailsBody: '', highlights: [],
  variants: { type: 'quantity' }, relatedSlugs: [],
  images: { gallery: ['a', 'b', 'c'], editorial: 'e' },
  copySource: 'sheet', imageSource: 'figma',
};

test('a valid product yields no errors', () => {
  assert.deepEqual(validateProduct(valid), []);
});

test('bad template and short gallery are reported', () => {
  const bad = { ...valid, template: 'nope', images: { gallery: ['a'], editorial: 'e' } };
  const errs = validateProduct(bad);
  assert.ok(errs.some((e) => e.includes('template')));
  assert.ok(errs.some((e) => e.includes('gallery')));
});

test('null price is allowed (renders as TBD)', () => {
  assert.deepEqual(validateProduct({ ...valid, price: null }), []);
});

test('loadProducts reads the sample fixture', () => {
  const list = loadProducts('data/products.sample.json');
  assert.equal(list.length, 1);
  assert.equal(validateProduct(list[0]).length, 0);
});

test('missing category, non-array specs are reported', () => {
  const errs = validateProduct({ ...valid, category: '', specs: undefined });
  assert.ok(errs.some((e) => e.includes('category')), 'category');
  assert.ok(errs.some((e) => e.includes('specs')), 'specs');
});

test('generic/package require images.editorial; single does not', () => {
  const noEd = { images: { gallery: ['a', 'b', 'c'], editorial: '' } };
  assert.ok(validateProduct({ ...valid, template: 'generic', ...noEd }).some((e) => e.includes('editorial')));
  assert.ok(validateProduct({ ...valid, template: 'package', ...noEd }).some((e) => e.includes('editorial')));
  assert.deepEqual(validateProduct({ ...valid, template: 'single', ...noEd }), []); // single uses a fixed asset
});

test('non-array relatedSlugs is reported, not thrown', () => {
  let errs;
  assert.doesNotThrow(() => { errs = validateProduct({ ...valid, relatedSlugs: 'oops' }); });
  assert.ok(errs.some((e) => e.includes('relatedSlugs')));
});

test('loadProducts throws on non-array JSON', () => {
  const tmpPath = join(tmpdir(), `york-products-${process.pid}-${Date.now()}.json`);
  writeFileSync(tmpPath, JSON.stringify({ not: 'an array' }), 'utf8');
  try {
    assert.throws(() => loadProducts(tmpPath));
  } finally {
    rmSync(tmpPath, { force: true });
  }
});
