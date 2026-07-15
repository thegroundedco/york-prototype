import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRelatedFallback } from '../templates/index.js';

test('fills related from same category up to 4', () => {
  const all = [
    { slug: 'a', category: 'x' }, { slug: 'b', category: 'x' },
    { slug: 'c', category: 'x' }, { slug: 'd', category: 'y' },
  ];
  const out = withRelatedFallback({ slug: 'a', category: 'x', relatedSlugs: [] }, all);
  assert.deepEqual(out.relatedSlugs, ['b', 'c']); // only 2 same-category peers exist
});
