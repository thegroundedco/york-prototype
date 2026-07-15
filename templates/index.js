// templates/index.js
import { renderSingle } from './single.js';
import { renderGeneric } from './generic.js';
import { renderPackage } from './package.js';

const RENDERERS = { single: renderSingle, generic: renderGeneric, package: renderPackage };

export function renderProduct(product) {
  const fn = RENDERERS[product.template];
  if (!fn) throw new Error(`Unknown template "${product.template}" for ${product.slug}`);
  return fn(product);
}

// Fill up to 5 related slugs from same-category peers (single/generic show 4,
// package shows 5). Excludes self and already-listed peers; degrades gracefully
// when a category has fewer than 5 members.
export function withRelatedFallback(product, allProducts) {
  const related = [...(product.relatedSlugs || [])];
  if (related.length >= 5) return product;
  const pool = allProducts
    .filter((q) => q.slug !== product.slug && q.category === product.category && !related.includes(q.slug))
    .map((q) => q.slug);
  while (related.length < 5 && pool.length) related.push(pool.shift());
  return { ...product, relatedSlugs: related };
}
