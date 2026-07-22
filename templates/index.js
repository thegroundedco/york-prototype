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

// Fill up to 5 related slugs from a peer pool (single/generic show 4, package shows up
// to 4 too via its own recCardCount cap — see templates/package.js). Excludes self and
// already-listed peers; degrades gracefully when the pool has fewer than 5 members.
//
// Pool selection branches on the product's own template: a package product pools other
// `template === 'package'` products ("other packages" per client feedback #2 — see
// package-rework-spec.md Section 4), since relatedSlugs is empty on all 4 package
// products today and a same-category filter can't reliably surface "other packages"
// (the 4 packages don't all share one category). Single/Generic products keep the
// original same-category behavior, unchanged.
export function withRelatedFallback(product, allProducts) {
  const related = [...(product.relatedSlugs || [])];
  if (related.length >= 5) return product;
  const pool = allProducts
    .filter((q) => q.slug !== product.slug && !related.includes(q.slug))
    .filter((q) => (product.template === 'package' ? q.template === 'package' : q.category === product.category))
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

// Resolves a curated accessories list ({slug}-only options — see the 2026-07-22
// power-cage spec) to real roster data {slug, name, price:number} for accessoriesHtml.
// Unlike resolveRelated, a bad slug THROWS: a curated add-on list with a missing
// product is a build failure, not a silent omission.
export function resolveAccessories(product, allProducts) {
  if (product?.variants?.type !== 'accessories') return product;
  const bySlug = new Map(allProducts.map((q) => [q.slug, q]));
  const accessoryProducts = product.variants.options.map((o) => {
    const q = bySlug.get(o.slug);
    if (!q) throw new Error(`accessories: unknown slug "${o.slug}" on ${product.slug}`);
    if (!(q.price?.current > 0)) throw new Error(`accessories: "${o.slug}" has no price.current`);
    return { slug: q.slug, name: q.name, price: q.price.current };
  });
  return { ...product, accessoryProducts };
}
