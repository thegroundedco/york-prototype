// Shared building blocks for the PDP renderers (Single, Generic, ...). Extracted in
// Task 6, once the Generic template needed the same buy-box / related-card pieces
// Task 5 built for Single — the second usage crossed the rule-of-three, so the pieces
// that render identically across layouts moved here instead of being copy-pasted.
import { escapeHtml, formatPrice } from '../lib/parse.js';

// "fts-power-cage" -> "Fts Power Cage". Used only as a display fallback for related-
// product cards, which at this stage receive nothing but a slug — the category-fallback
// / full-catalog lookup that fills relatedSlugs with real peers happens upstream, in
// Task 15's withRelatedFallback (templates/index.js), before a product ever reaches a
// renderer.
export function humanizeSlug(slug) {
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function priceRow(price) {
  if (!price) return `<span class="pdp__price-current">Price TBD</span>`;
  const compare = price.compareAt
    ? `<span class="pdp__price-original">${formatPrice(price.compareAt)}</span>`
    : '';
  return `${compare}<span class="pdp__price-current">${formatPrice(price.current)}</span>`;
}

// Main gallery (left column): main shot + up to 4 thumbnail cells, built from
// product.images.gallery so every product shows its own photos (the source hardcodes
// one specific product's images/alt text here, which would otherwise leak into every
// generated page regardless of product). Shared by every layout that uses the
// pdp__gallery split (Single, Generic).
export function galleryHtml(images) {
  const [main, ...rest] = images;
  const thumbs = rest.slice(0, 4);
  const mainCell = `          <button type="button" class="pdp__gallery-main" data-modal="gallery-image" data-gallery-index="0" aria-label="View larger image">
            <img src="${main}" alt="" class="pdp__gallery-image">
          </button>`;
  const rows = [];
  for (let i = 0; i < thumbs.length; i += 2) {
    const cells = thumbs
      .slice(i, i + 2)
      .map(
        (src, j) => `            <button type="button" class="pdp__gallery-cell" data-modal="gallery-image" data-gallery-index="${i + j + 1}" aria-label="View larger image">
              <img src="${src}" alt="" class="pdp__gallery-image">
            </button>`,
      )
      .join('\n');
    rows.push(`          <div class="pdp__gallery-row">\n${cells}\n          </div>`);
  }
  return `${mainCell}\n${rows.join('\n')}`;
}

// Breadcrumb nav shared by every PDP layout: Home / category / product name.
export function breadcrumbHtml(p) {
  const categoryHref = `${p.category}-collection.html`;
  return `          <nav class="pdp__breadcrumbs" aria-label="Breadcrumb">
            <ol role="list">
              <li><a href="homepage.html">Home</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="${categoryHref}">${escapeHtml(p.categoryLabel)}</a></li>
              <li aria-hidden="true">/</li>
              <li><span aria-current="page">${escapeHtml(p.name)}</span></li>
            </ol>
          </nav>`;
}

export function secondaryCardHtml(slug) {
  const title = escapeHtml(humanizeSlug(slug));
  return `        <article class="pdp-single__product">
          <div class="pdp-single__product-image">
            <img src="assets/images/products/${slug}/gallery-1.jpg" alt="">
          </div>
          <div class="pdp-single__product-text">
            <h3 class="pdp-single__product-title"><a href="${slug}.html">${title}</a></h3>
          </div>
        </article>`;
}

export function recCardHtml(slug) {
  const title = escapeHtml(humanizeSlug(slug));
  return `        <article class="pdp-single__rec-card">
          <div class="pdp-single__rec-image">
            <img src="assets/images/products/${slug}/gallery-1.jpg" alt="">
          </div>
          <h3 class="pdp-single__rec-title"><a class="pdp-single__rec-title-link" href="${slug}.html">${title}</a></h3>
          <a class="btn btn--primary pdp-single__rec-cta" href="${slug}.html">View Product</a>
        </article>`;
}

// "You May Also Like" — 4-card recommended row + Shop All link. product-generic.html
// ships this section with the literal comment "same 4-card row + Shop All used by
// single PDP" — it is byte-identical markup to the Single layout's recs section, so it
// lives here once instead of being copy-pasted per template. Callers keep their own
// leading HTML comment (its wording differs slightly per template).
export function recsSectionHtml(recCards, shopAllHref) {
  return `    <section class="pdp-single__recs" aria-label="You may also like">
      <div class="pdp-single__recs-intro">
        <h2 class="pdp-single__recs-heading display-lg">You May Also Like</h2>
        <p class="pdp-single__recs-desc">The essentials, perfected. These top-tier selections combine our legendary commercial-grade durability with refined modern aesthetics. We've curated our most iconic gear to deliver a professional-grade training experience in any environment.</p>
      </div>
      <div class="pdp-single__recs-row">
${recCards}
      </div>
      <a class="pdp-single__recs-shop-all" href="${shopAllHref}">
        <span>Shop All</span>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </section>`;
}
