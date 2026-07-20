// Generic-template PDP body — renders the <main> content of product-generic.html
// (buy box + full-bleed feature + 4-column features grid + static featured banner +
// recs) around the Task-4 chrome partials.
//
// Differs from Single (templates/single.js): no add-ons, no key-features list, no
// financing line in the buy box — buy box is breadcrumb + title + price + description +
// pdp__quantity + Add To Cart + accordion. The source product-generic.html actually
// ships a `pdp__financing` paragraph and an "Add Bundle to cart - $222.00" CTA (both
// copy-pasted from the Package template, per its own HTML comments), which is exactly
// the kind of leftover junk this generator exists to remove — omitted here per the
// task brief.
import { existsSync } from 'node:fs';
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml } from '../lib/parse.js';
import { priceRow, galleryHtml, breadcrumbHtml, variantBlock, accordionHtml, recCardHtml, recsSectionHtml, descriptionHtml } from './shared.js';

// Section 1 "Features" — one column per keyFeatures entry, split on the entry's own
// FIRST colon into a bold header + body paragraph (every generic product's keyFeatures
// ships as "Bold Header: body sentence." — checked across all 13 generic products, see
// generic-rework-spec.md). Generic-only: Single's Section 1 is a real highlights-driven
// single card and is untouched by this change.
//
// Renders one column per keyFeatures entry (not capped at 4) — 8 of 13 generic products
// ship exactly 4 keyFeatures, the other 5 ship 3; the CSS grid's column count is driven
// by an inline custom property so both counts render as even columns instead of a
// stretched/broken track. A keyFeatures entry with no colon becomes a header-only column
// (whole string as title, empty body) rather than being skipped, so a malformed/edge-case
// entry still shows something instead of silently vanishing.
function featureColumnHtml({ title, body }) {
  const bodyHtml = body ? `\n          <p class="pdp-generic__features-body">${escapeHtml(body)}</p>` : '';
  return `        <article class="pdp-generic__features-item">
          <h3 class="pdp-generic__features-title">${escapeHtml(title)}</h3>${bodyHtml}
        </article>`;
}

function resolveFeatureColumns(p) {
  return (p.keyFeatures || []).map((raw) => {
    const idx = raw.indexOf(':');
    if (idx === -1) return { title: raw.trim(), body: '' };
    return { title: raw.slice(0, idx).trim(), body: raw.slice(idx + 1).trim() };
  });
}

// Section 2 "Featured" banner — single static full-bleed image, no carousel. Figma's own
// "Slide Indictator" dots are hidden in the source document (this was never meant to
// auto-rotate) — see generic-rework-spec.md Section 2. Only york-yoga-mat has a real,
// purpose-shot featured-banner.jpg today (a new export, not one of the 5 gallery photos),
// recorded on the product as `featuredBanner` rather than probed for on disk at render
// time; every other generic product falls back to its own editorial image.
function resolveFeaturedBannerImage(p) {
  const named = `assets/images/products/${p.slug}/featured-banner.jpg`;
  if (existsSync(named)) return named;
  return p.featuredBanner || p.images.editorial;
}

export function renderGeneric(p) {
  const relatedProducts = p.relatedProducts || [];
  const shopAllHref = p.category ? `plp-${p.category}.html` : 'plp-equipment.html';

  const featureColumns = resolveFeatureColumns(p);
  const featureColumnCount = Math.max(featureColumns.length, 1);
  const featureColumnsHtml = featureColumns.map(featureColumnHtml).join('\n');

  const featuredBannerImage = resolveFeaturedBannerImage(p);

  const recCardCount = Math.min(relatedProducts.length, 4);
  const recCards = relatedProducts.slice(0, 4).map(recCardHtml).join('\n');

  const main = `  <main id="main">

    <section class="pdp__container" aria-label="Product details">

      <!-- Gallery (left) + Buy box (right) -->
      <div class="pdp__split">

        <!-- Gallery: main product shot + supporting images -->
        <div class="pdp__gallery">
${galleryHtml(p.images.gallery)}
        </div>

        <!-- Buy box -->
        <div class="pdp__info">

${breadcrumbHtml(p)}

          <h1 class="pdp__title">${escapeHtml(p.name)}</h1>

          <div class="pdp__price-row">
            ${priceRow(p.price)}
          </div>

          <hr class="pdp__rule">

${descriptionHtml(p)}

${variantBlock(p)}

          <button type="button" class="btn btn--primary pdp__cta">Add To Cart</button>

${accordionHtml(p)}

        </div>

      </div>

    </section>

    <!-- Feature: full-bleed image + 4-column header/body features grid -->
    <section class="pdp-generic__feature" aria-label="Feature">
      <div class="pdp-generic__feature-image">
        <img src="${p.images.editorial}" alt="">
      </div>
      <div class="pdp-generic__features-row" style="--pdp-generic-features-count: ${featureColumnCount};">
${featureColumnsHtml}
      </div>
    </section>

    <!-- Featured: single static full-bleed banner (Figma's own dots are hidden — this
         was never meant to auto-rotate) -->
    <section class="pdp-generic__featured" aria-label="Featured">
      <img class="pdp-generic__featured-image" src="${featuredBannerImage}" alt="">
    </section>

    <!-- You May Also Like — same 4-card row + Shop All used by single PDP -->
${recsSectionHtml(recCards, shopAllHref, recCardCount)}

  </main>`;

  return [
    renderHead(p),
    renderBodyOpen(p),
    main,
    renderFooter(),
    renderGalleryModal(p),
    renderSpecsModal(p),
    renderScripts(),
  ].join('\n');
}
