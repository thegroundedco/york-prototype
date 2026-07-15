import { test } from 'node:test';
import assert from 'node:assert/strict';
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
