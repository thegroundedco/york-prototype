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

export function withRelatedFallback(product, allProducts) {
  const related = [...(product.relatedSlugs || [])];
  if (related.length >= 4) return product;
  const pool = allProducts
    .filter((q) => q.slug !== product.slug && q.category === product.category && !related.includes(q.slug))
    .map((q) => q.slug);
  while (related.length < 4 && pool.length) related.push(pool.shift());
  return { ...product, relatedSlugs: related };
}
