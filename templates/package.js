// Package-template PDP body — renders the <main> content of product-package.html
// (buy box with a "What's Included" list + Why/Key-Details/Featured sections + a
// standalone "You May Also Like" section) around the Task-4 chrome partials.
//
// Differs from Single/Generic: no quantity stepper, no add-ons — the buy box shows a
// `pdp__included` "What's Included" list (from p.included) instead of quantityHtml().
// The accordion also differs: product-package.html has no Description entry (the
// buy-box description above already covers it). "You May Also Like" no longer lives
// inside the accordion (see package-rework-spec.md Section 4) — it's now the shared
// `recCardHtml`/`recsSectionHtml` 4-card row + Shop All, same as Single/Generic,
// rendered as its own section after the Featured band.
import { existsSync } from 'node:fs';
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml, formatPrice } from '../lib/parse.js';
import { priceRow, galleryHtml, breadcrumbHtml, descriptionHtml, variantBlock, recCardHtml, recsSectionHtml } from './shared.js';

// Key Details (Section 2) per-column image: prefers a purpose-shot key-detail-N.jpg
// (only essential-olympic-training-set has these exported today — see
// package-rework-spec.md Section 2), falling back to the product's own gallery photos
// when no dedicated export exists yet for a given slug/column.
function resolveKeyDetailImage(p, n, galleryIndex) {
  const named = `assets/images/products/${p.slug}/key-detail-${n}.jpg`;
  if (existsSync(named)) return named;
  const gallery = p.images?.gallery || [];
  return gallery[galleryIndex] ?? gallery[0] ?? '';
}

// Built for Steady Progress (Section 3) card image: same existsSync-then-gallery-
// fallback pattern as resolveKeyDetailImage, feature-N.jpg naming matches the
// convention single.js's resolveFeatureImage already established for this "2-card
// featured band" shape.
function resolveFeaturedCardImage(p, n, galleryIndex) {
  const named = `assets/images/products/${p.slug}/feature-${n}.jpg`;
  if (existsSync(named)) return named;
  const gallery = p.images?.gallery || [];
  return gallery[galleryIndex] ?? gallery[0] ?? '';
}

// Package's accordion: Features & Specs (button->modal) + Shipping & Returns (details,
// copy identical to shared.js's accordionHtml). No Description entry here, unlike
// shared.js's accordionHtml — product-package.html doesn't repeat the buy-box
// description the way Single/Generic's accordion does. No longer takes a recCards
// param — "You May Also Like" moved out of the accordion (see package-rework-spec.md
// Section 4).
function packageAccordionHtml() {
  return `          <div class="pdp__accordion">
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
          </div>`;
}

export function renderPackage(p) {
  const relatedProducts = p.relatedProducts || [];
  const recCardCount = Math.min(relatedProducts.length, 4);
  const recCards = relatedProducts.slice(0, 4).map(recCardHtml).join('\n');
  const shopAllHref = p.category ? `plp-${p.category}.html` : 'plp-equipment.html';

  const includedItems = (p.included || [])
    .map((item) => '              <li>' + escapeHtml(item) + '</li>')
    .join('\n');

  const currentPriceLabel = formatPrice(p.price ? p.price.current : null);
  // Products with a custom variant selector (e.g. rubber-hex set-or-individual)
  // show the toggle + a plain CTA; the other packages keep their no-control buy box.
  const hasVariantBlock = p.variants && p.variants.type !== 'quantity';
  const ctaLabel = hasVariantBlock ? 'Add to cart' : `Add Bundle to cart - ${currentPriceLabel}`;
  // package-selector renders its own dynamic "What's Included" per package, so
  // the static list is suppressed for it (other packages keep theirs).
  const showStaticIncluded = !(p.variants && p.variants.type === 'package-selector');

  // "Why The [Product]?" section: hero image + intro paragraph. Prefers the real
  // per-product whyBody field (see package-rework-spec.md Section 1); the
  // highlights[0]/detailsBody fallback chain stays for defensive coverage but fires 0%
  // of the time today since every package product ships whyBody.
  const whyBody = escapeHtml(p.whyBody || p.highlights?.[0]?.body || p.detailsBody || '');

  // Key Details (Section 2): 3 columns, real title/body from p.keyDetails, each with a
  // per-column resolved image (dedicated key-detail-N.jpg export when it exists,
  // otherwise a gallery-photo stand-in — see resolveKeyDetailImage above). Renders
  // fewer cards (never crashes) when keyDetails has <3 entries.
  const keyDetails = (p.keyDetails || []).slice(0, 3);
  const testimonials = keyDetails
    .map(
      (kd, i) => `          <article class="pdp__why-testimonial">
            <div class="pdp__why-testimonial-image">
              <img src="${resolveKeyDetailImage(p, i + 1, i + 1)}" alt="">
            </div>
            <h3 class="pdp__why-testimonial-title">${escapeHtml(kd.title)}</h3>
            <p class="pdp__why-testimonial-body">${escapeHtml(kd.body)}</p>
          </article>`,
    )
    .join('\n');

  // Built for Steady Progress (Section 3): 2 large cards. Data-driven via the same
  // highlights-then-categoryLabel/detailsBody fallback chain generic.js established for
  // its own feature block. Images now via resolveFeaturedCardImage() (dedicated
  // feature-N.jpg lifestyle shot when it exists, gallery stand-in otherwise) instead of
  // the raw galleryImgs[n % len] plain product photos this used to show.
  const feature1 = p.highlights?.[1] || {};
  const feature2 = p.highlights?.[2] || {};
  const featuredTitle1 = escapeHtml(feature1.title || p.categoryLabel || p.name);
  const featuredBody1 = escapeHtml(feature1.body || p.detailsBody || '');
  const featuredTitle2 = escapeHtml(feature2.title || p.categoryLabel || p.name);
  const featuredBody2 = escapeHtml(feature2.body || p.detailsBody || '');

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
${hasVariantBlock ? '\n' + variantBlock(p) + '\n' : ''}
${showStaticIncluded ? `          <div class="pdp__included">
            <p class="pdp__included-title">What's Included</p>
            <ul class="pdp__included-list" role="list">
${includedItems}
            </ul>
          </div>` : ''}

          <button type="button" class="btn btn--primary pdp__cta">${ctaLabel}</button>

          <p class="pdp__financing">
            From $0.00/mo with Paypal
            <a href="#financing">Learn More</a>
          </p>

${packageAccordionHtml()}

        </div>

      </div>

    </section>

    <!-- Why the Package -->
    <section class="pdp__why" aria-labelledby="pdp-why-heading">
      <div class="pdp__why-inner">
        <div class="pdp__why-intro">
          <h2 class="pdp__why-heading" id="pdp-why-heading">Why The ${escapeHtml(p.name)}?</h2>
          <div class="pdp__why-desc">
            <p>${whyBody}</p>
          </div>
        </div>
        <div class="pdp__why-hero">
          <img src="${p.images.editorial}" alt="">
        </div>
        <div class="pdp__why-testimonials">
${testimonials}
        </div>
      </div>
    </section>

    <!-- Featured Products: 2 large cards -->
    <section class="pdp__featured" aria-label="Featured products">
      <article class="pdp__featured-card">
        <div class="pdp__featured-image">
          <img src="${resolveFeaturedCardImage(p, 1, 0)}" alt="">
        </div>
        <div class="pdp__featured-text">
          <h3 class="pdp__featured-title">${featuredTitle1}</h3>
          <p class="pdp__featured-body">${featuredBody1}</p>
        </div>
      </article>
      <article class="pdp__featured-card">
        <div class="pdp__featured-image">
          <img src="${resolveFeaturedCardImage(p, 2, 4)}" alt="">
        </div>
        <div class="pdp__featured-text">
          <h3 class="pdp__featured-title">${featuredTitle2}</h3>
          <p class="pdp__featured-body">${featuredBody2}</p>
        </div>
      </article>
    </section>

    <!-- You May Also Like — same 4-card row + Shop All used by single/generic PDPs -->
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
