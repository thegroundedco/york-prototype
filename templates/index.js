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

// Resolves product.relatedSlugs to real peer data — {slug, name, price, image} — so the
// "You May Also Like" / "Additional Features" rec cards can show an actual name, price
// (with compareAt), and photo instead of a humanized-slug guess and a permanent
// "Price TBD". image is the peer's first gallery photo (images.gallery[0]). Any slug with
// no matching product (shouldn't happen once withRelatedFallback has run, but a stale or
// hand-edited relatedSlugs entry could still reference a retired/missing slug) is dropped
// rather than rendering a broken card.
export function resolveRelated(product, allProducts) {
  const bySlug = new Map(allProducts.map((q) => [q.slug, q]));
  const relatedProducts = (product.relatedSlugs || [])
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .map((q) => ({
      slug: q.slug,
      name: q.name,
      price: q.price || null,
      image: q.images?.gallery?.[0] || '',
    }));
  return { ...product, relatedProducts };
}
