import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRelatedFallback, resolveRelated } from '../templates/index.js';

test('fills related from same category up to 4', () => {
  const all = [
    { slug: 'a', category: 'x' }, { slug: 'b', category: 'x' },
    { slug: 'c', category: 'x' }, { slug: 'd', category: 'y' },
  ];
  const out = withRelatedFallback({ slug: 'a', category: 'x', relatedSlugs: [] }, all);
  assert.deepEqual(out.relatedSlugs, ['b', 'c']); // only 2 same-category peers exist
});

test('resolveRelated maps relatedSlugs to real product data (name/price/first gallery image)', () => {
  const all = [
    { slug: 'a', name: 'A Product', price: { current: 10, compareAt: null }, images: { gallery: ['a1.jpg', 'a2.jpg'] } },
    { slug: 'b', name: 'B Product', price: { current: 20, compareAt: 30 }, images: { gallery: ['b1.jpg'] } },
  ];
  const out = resolveRelated({ slug: 'self', relatedSlugs: ['a', 'b'] }, all);
  assert.deepEqual(out.relatedProducts, [
    { slug: 'a', name: 'A Product', price: { current: 10, compareAt: null }, image: 'a1.jpg' },
    { slug: 'b', name: 'B Product', price: { current: 20, compareAt: 30 }, image: 'b1.jpg' },
  ]);
});

test('resolveRelated drops relatedSlugs entries with no matching product', () => {
  const all = [{ slug: 'a', name: 'A Product', price: null, images: { gallery: ['a1.jpg'] } }];
  const out = resolveRelated({ slug: 'self', relatedSlugs: ['a', 'missing-slug'] }, all);
  assert.equal(out.relatedProducts.length, 1);
  assert.equal(out.relatedProducts[0].slug, 'a');
});

test('resolveRelated returns an empty array when relatedSlugs is missing entirely', () => {
  const out = resolveRelated({ slug: 'self' }, []);
  assert.deepEqual(out.relatedProducts, []);
});
