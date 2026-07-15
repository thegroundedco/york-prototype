// Generic-template PDP body — renders the <main> content of product-generic.html
// (buy box + full-bleed feature + featured-products carousel + recs) around the
// Task-4 chrome partials.
//
// Differs from Single (templates/single.js): no add-ons, no key-features list, no
// financing line in the buy box — buy box is breadcrumb + title + price + description +
// pdp__quantity + Add To Cart + accordion. The source product-generic.html actually
// ships a `pdp__financing` paragraph and an "Add Bundle to cart - $222.00" CTA (both
// copy-pasted from the Package template, per its own HTML comments), which is exactly
// the kind of leftover junk this generator exists to remove — omitted here per the
// task brief.
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml } from '../lib/parse.js';
import { priceRow, galleryHtml, breadcrumbHtml, recCardHtml, recsSectionHtml } from './shared.js';

// Featured-products carousel: full-bleed slides + dots, one pair per image, mirroring
// the slide/dot pattern in partials.js's renderGalleryModal but with the
// pdp-generic__featured-* classes. Reuses product.images.gallery (up to 3, matching
// the 3 dots the source markup ships) instead of the source's hardcoded homepage/
// package hero images.
function featuredSlideHtml(src, i) {
  return `        <div class="pdp-generic__featured-slide" data-carousel-slide${i === 0 ? '' : ' hidden'}>
          <img src="${src}" alt="">
        </div>`;
}
function featuredDotHtml(i) {
  return `        <button type="button" class="pdp-generic__featured-dot" data-carousel-dot role="tab" aria-selected="${i === 0}">
          <span class="visually-hidden">Slide ${i + 1}</span>
        </button>`;
}

export function renderGeneric(p) {
  const relatedSlugs = p.relatedSlugs || [];
  const feature = p.highlights?.[0] || {};
  const featureTitle = escapeHtml(feature.title || p.categoryLabel || p.name);
  const featureBody = escapeHtml(feature.body || p.detailsBody || '');
  const shopAllHref = p.category ? `plp-${p.category}.html` : 'plp-equipment.html';

  const featuredImages = p.images.gallery.slice(0, 3);
  const featuredSlides = featuredImages.map(featuredSlideHtml).join('\n');
  const featuredDots = featuredImages.map((_, i) => featuredDotHtml(i)).join('\n');

  const recCards = relatedSlugs.slice(0, 4).map(recCardHtml).join('\n');

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

          <div class="pdp__description" data-pdp-description>
            ${p.shortDescription}
            <button type="button" class="pdp__read-more" data-pdp-description-toggle aria-expanded="false">
              <span data-pdp-description-label-more>Read More</span>
              <span data-pdp-description-label-less hidden>Read Less</span>
            </button>
          </div>

          <!-- Quantity -->
          <div class="pdp__quantity">
            <label class="pdp__quantity-label" for="pdp-qty">Quantity</label>
            <div class="pdp__quantity-input">
              <button type="button" class="pdp__quantity-btn" data-qty-decrement aria-label="Decrease quantity">–</button>
              <input id="pdp-qty" class="pdp__quantity-value" type="text" inputmode="numeric" value="1" data-qty-value aria-live="polite">
              <button type="button" class="pdp__quantity-btn" data-qty-increment aria-label="Increase quantity">+</button>
            </div>
          </div>

          <button type="button" class="btn btn--primary pdp__cta">Add To Cart</button>

          <!-- Accordion: Description + Shipping & Returns inline expand; Features & Specs opens side modal -->
          <div class="pdp__accordion">
            <details class="pdp__acc-entry" id="description">
              <summary class="pdp__acc-summary">
                <span>Description</span>
                <span class="pdp__acc-icon" aria-hidden="true"></span>
              </summary>
              <div class="pdp__acc-body">
                <p class="body-md">${escapeHtml(p.detailsBody)}</p>
              </div>
            </details>
            <button type="button" class="pdp__acc-entry pdp__acc-entry--button" data-modal="features-specs" id="features-specs">
              <span class="pdp__acc-summary">
                <span>Features &amp; Specs</span>
                <span class="pdp__acc-icon" aria-hidden="true"></span>
              </span>
            </button>
            <details class="pdp__acc-entry">
              <summary class="pdp__acc-summary">
                <span>Shipping &amp; Returns</span>
                <span class="pdp__acc-icon" aria-hidden="true"></span>
              </summary>
              <div class="pdp__acc-body">
                <p class="body-md">Freight shipping included. Carrier will schedule a delivery appointment 24 hours in advance. Returns accepted within 30 days. See our <a href="shipping.html">shipping</a> and <a href="returns-refunds.html">returns</a> pages for details.</p>
              </div>
            </details>
          </div>

        </div>

      </div>

    </section>

    <!-- Feature: full-bleed image + single horizontal card with title + description -->
    <section class="pdp-generic__feature" aria-label="Feature">
      <div class="pdp-generic__feature-image">
        <img src="${p.images.editorial}" alt="">
      </div>
      <div class="pdp-generic__feature-card">
        <h2 class="pdp-generic__feature-title">${featureTitle}</h2>
        <p class="pdp-generic__feature-body">${featureBody}</p>
      </div>
    </section>

    <!-- Featured Products: single full-bleed carousel with dot indicators, auto-advance -->
    <section class="pdp-generic__featured" aria-label="Featured products" data-carousel data-carousel-interval="5000">
      <div class="pdp-generic__featured-slides">
${featuredSlides}
      </div>
      <div class="pdp-generic__featured-dots" role="tablist" aria-label="Featured slides">
${featuredDots}
      </div>
    </section>

    <!-- You May Also Like — same 4-card row + Shop All used by single PDP -->
${recsSectionHtml(recCards, shopAllHref)}

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
