// Package-template PDP body — renders the <main> content of product-package.html
// (buy box with a "What's Included" list + accordion-embedded recs + Why/Featured
// sections) around the Task-4 chrome partials.
//
// Differs from Single/Generic: no quantity stepper, no add-ons — the buy box shows a
// `pdp__included` "What's Included" list (from p.included) instead of quantityHtml().
// The accordion also differs: product-package.html has no Description entry (the
// buy-box description above already covers it) and embeds the "You May Also Like" recs
// directly inside an OPEN accordion entry (`pdp__acc-body--recs`), using package-
// specific rec-card markup (`pdp__rec-card` / `pdp__rec-prices` / "Add To Cart") that
// doesn't match the shared `recCardHtml`/`recsSectionHtml` used by Single/Generic — so
// the accordion and its rec cards are built inline here rather than reusing
// `accordionHtml`/`recCardHtml`/`recsSectionHtml` from shared.js.
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml, formatPrice } from '../lib/parse.js';
import { priceRow, galleryHtml, breadcrumbHtml, humanizeSlug } from './shared.js';

// Package's own "You May Also Like" rec card — visually similar to shared.js's
// recCardHtml but with a price row and an "Add To Cart" action instead of a
// "View Product" link, matching product-package.html's pdp__rec-card markup. There is
// no per-related-product price data available at this stage (relatedSlugs is just an
// array of slugs — see shared.js's humanizeSlug comment), so the price shows "Price TBD"
// rather than carrying over the source's hardcoded/junk "$0.00 / $1,2200.00" figures.
function pkgRecCardHtml(slug) {
  const title = escapeHtml(humanizeSlug(slug));
  return `                  <article class="pdp__rec-card">
                    <div class="pdp__rec-image"><img src="assets/images/products/${slug}/gallery-1.jpg" alt=""></div>
                    <h4 class="pdp__rec-title"><a class="pdp__rec-title-link" href="${slug}.html">${title}</a></h4>
                    <div class="pdp__rec-prices">
                      <span class="pdp__rec-price--sale">Price TBD</span>
                    </div>
                    <a class="btn btn--primary pdp__rec-cta" href="#cart">Add To Cart</a>
                  </article>`;
}

// Package's accordion: Features & Specs (button->modal) + Shipping & Returns (details,
// copy identical to shared.js's accordionHtml) + an OPEN "You May Also Like" details
// embedding the rec-card scroller. No Description entry here, unlike shared.js's
// accordionHtml — product-package.html doesn't repeat the buy-box description the way
// Single/Generic's accordion does.
function packageAccordionHtml(recCards) {
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
            <details class="pdp__acc-entry" open>
              <summary class="pdp__acc-summary">
                <span>You May Also Like</span>
                <span class="pdp__acc-icon pdp__acc-icon--chevron" aria-hidden="true"></span>
              </summary>
              <div class="pdp__acc-body pdp__acc-body--recs">
                <div class="pdp__recs-scroller" data-pdp-recs>
${recCards}
                </div>
                <div class="pdp__recs-progress" aria-hidden="true">
                  <div class="pdp__recs-progress-bar" data-pdp-recs-bar></div>
                </div>
              </div>
            </details>
          </div>`;
}

export function renderPackage(p) {
  const relatedSlugs = p.relatedSlugs || [];
  // The source ships 5 cards in the recs scroller (it's a horizontal scroller, not the
  // fixed 4-up grid Single/Generic use for their "You May Also Like" section).
  const recCards = relatedSlugs.slice(0, 5).map(pkgRecCardHtml).join('\n');

  const includedItems = (p.included || [])
    .map((item) => '              <li>' + escapeHtml(item) + '</li>')
    .join('\n');

  const currentPriceLabel = formatPrice(p.price ? p.price.current : null);

  // "Why The [Product]?" section: hero image + intro paragraph + up to 3 "Key Detail"
  // testimonial cards. product-package.html ships this with 2 paragraphs of lorem ipsum
  // intro copy and 3 testimonials of lorem ipsum body copy — all placeholder junk that
  // never varies per product. Replaced here with real per-product data, falling back
  // gracefully (same pattern generic.js uses for its one feature block: highlights[0]
  // then detailsBody) when a product has no highlights/keyFeatures.
  const why = p.highlights?.[0] || {};
  const whyBody = escapeHtml(why.body || p.detailsBody || '');
  const galleryImgs = p.images.gallery.length ? p.images.gallery : [''];
  const testimonials = (p.keyFeatures || [])
    .slice(0, 3)
    .map(
      (text, i) => `          <article class="pdp__why-testimonial">
            <div class="pdp__why-testimonial-image">
              <img src="${galleryImgs[i % galleryImgs.length]}" alt="">
            </div>
            <h3 class="pdp__why-testimonial-title">Key Detail #${i + 1}</h3>
            <p class="pdp__why-testimonial-body">${escapeHtml(text)}</p>
          </article>`,
    )
    .join('\n');

  // Featured Products: 2 large cards. The source repeats the literal title
  // "Product Callout" verbatim on both cards with lorem ipsum bodies — an unfilled
  // placeholder, not real per-product copy (contrast Single/Generic's feature title,
  // which ships real editorial text — "Built To Last" / "Racks & Benches" — in the
  // source). Data-driven here via the same highlights-then-categoryLabel/detailsBody
  // fallback chain generic.js established for its own feature block.
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

          <div class="pdp__description" data-pdp-description>
            ${p.shortDescription}
            <button type="button" class="pdp__read-more" data-pdp-description-toggle aria-expanded="false">
              <span data-pdp-description-label-more>Read More</span>
              <span data-pdp-description-label-less hidden>Read Less</span>
            </button>
          </div>

          <div class="pdp__included">
            <p class="pdp__included-title">What's Included</p>
            <ul class="pdp__included-list" role="list">
${includedItems}
            </ul>
          </div>

          <button type="button" class="btn btn--primary pdp__cta">Add Bundle to cart - ${currentPriceLabel}</button>

          <p class="pdp__financing">
            From $0.00/mo with Paypal
            <a href="#financing">Learn More</a>
          </p>

${packageAccordionHtml(recCards)}

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
          <img src="${galleryImgs[0 % galleryImgs.length]}" alt="">
        </div>
        <div class="pdp__featured-text">
          <h3 class="pdp__featured-title">${featuredTitle1}</h3>
          <p class="pdp__featured-body">${featuredBody1}</p>
        </div>
      </article>
      <article class="pdp__featured-card">
        <div class="pdp__featured-image">
          <img src="${galleryImgs[1 % galleryImgs.length]}" alt="">
        </div>
        <div class="pdp__featured-text">
          <h3 class="pdp__featured-title">${featuredTitle2}</h3>
          <p class="pdp__featured-body">${featuredBody2}</p>
        </div>
      </article>
    </section>

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
