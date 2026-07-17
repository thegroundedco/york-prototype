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

test('package products pool other packages, not same-category peers', () => {
  // Mirrors the real catalog shape: 4 package products spread across 2 different
  // categories (equipment / bars-weights) alongside plain equipment products — a
  // same-category filter could never reliably surface "other packages" here (client
  // feedback #2 — see package-rework-spec.md Section 4).
  const all = [
    { slug: 'essential-olympic-training-set', template: 'package', category: 'equipment' },
    { slug: 'york-performance-package', template: 'package', category: 'equipment' },
    { slug: 'plyo-package', template: 'package', category: 'equipment' },
    { slug: 'rubber-hex-dumbbell-set', template: 'package', category: 'bars-weights' },
    { slug: 'fts-power-cage', template: 'single', category: 'equipment' },
    { slug: 'battle-rope', template: 'generic', category: 'equipment' },
  ];
  const out = withRelatedFallback(
    { slug: 'essential-olympic-training-set', template: 'package', category: 'equipment', relatedSlugs: [] },
    all,
  );
  assert.deepEqual(out.relatedSlugs, ['york-performance-package', 'plyo-package', 'rubber-hex-dumbbell-set']);
});

test('non-package products keep the original same-category pool, unaffected by the package branch', () => {
  const all = [
    { slug: 'fts-power-cage', template: 'single', category: 'equipment' },
    { slug: 'battle-rope', template: 'generic', category: 'equipment' },
    { slug: 'plyo-package', template: 'package', category: 'equipment' },
  ];
  const out = withRelatedFallback(
    { slug: 'fts-power-cage', template: 'single', category: 'equipment', relatedSlugs: [] },
    all,
  );
  // Same-category filter, exactly as before this change — a same-category package peer
  // is still eligible (the branch only changes the pool for package products themselves).
  assert.deepEqual(out.relatedSlugs, ['battle-rope', 'plyo-package']);
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
