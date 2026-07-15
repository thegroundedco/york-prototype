// Single-template PDP body — renders the <main> content of product-single.html
// (buy box + secondary feature band + recs) around the Task-4 chrome partials.
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml, formatPrice } from '../lib/parse.js';

// "fts-power-cage" -> "Fts Power Cage". Used only as a display fallback for related-
// product cards, which at this stage (Task 5) receive nothing but a slug — the
// category-fallback / full-catalog lookup that fills relatedSlugs with real peers
// happens upstream, in Task 15's withRelatedFallback (templates/index.js), before a
// product ever reaches renderSingle.
function humanizeSlug(slug) {
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function priceRow(price) {
  if (!price) return `<span class="pdp__price-current">Price TBD</span>`;
  const compare = price.compareAt
    ? `<span class="pdp__price-original">${formatPrice(price.compareAt)}</span>`
    : '';
  return `${compare}<span class="pdp__price-current">${formatPrice(price.current)}</span>`;
}

function addOnHtml(a, i) {
  return `              <label class="pdp__addon">
                <input type="checkbox" class="pdp__addon-checkbox" name="addon-${i + 1}">
                <img src="${a.image || ''}" alt="" class="pdp__addon-image">
                <div class="pdp__addon-text">
                  <div class="pdp__addon-top">
                    <span class="pdp__addon-name">${escapeHtml(a.name)}</span>
                    <span class="pdp__addon-price">${escapeHtml(a.price || '')}</span>
                  </div>
                  <span class="pdp__addon-desc">${escapeHtml(a.desc || '')}</span>
                </div>
              </label>`;
}

function addOnsSectionHtml(p) {
  if (!p.addOns?.length) return '';
  return `
          <!-- Popular add-ons -->
          <div class="pdp__addons">
            <p class="pdp__addons-title">Select Popular Add Ons</p>
            <div class="pdp__addons-list">
${p.addOns.slice(0, 3).map(addOnHtml).join('\n')}
            </div>
          </div>
`;
}

// Main gallery (left column): main shot + up to 4 thumbnail cells, built from
// product.images.gallery so every product shows its own photos (the source hardcodes
// one specific bench's images/alt text here, which would otherwise leak into every
// generated page regardless of product).
function galleryHtml(images) {
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

function secondaryCardHtml(slug) {
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

function recCardHtml(slug) {
  const title = escapeHtml(humanizeSlug(slug));
  return `        <article class="pdp-single__rec-card">
          <div class="pdp-single__rec-image">
            <img src="assets/images/products/${slug}/gallery-1.jpg" alt="">
          </div>
          <h3 class="pdp-single__rec-title"><a class="pdp-single__rec-title-link" href="${slug}.html">${title}</a></h3>
          <a class="btn btn--primary pdp-single__rec-cta" href="${slug}.html">View Product</a>
        </article>`;
}

export function renderSingle(p) {
  const relatedSlugs = p.relatedSlugs || [];
  const feature = p.highlights?.[0] || {};
  const featureTitle = escapeHtml(feature.title || p.categoryLabel || p.name);
  const featureBody = escapeHtml(feature.body || p.detailsBody || '');
  const categoryHref = `${p.category}-collection.html`;
  const shopAllHref = p.category ? `plp-${p.category}.html` : 'plp-equipment.html';

  const secondaryCards = relatedSlugs.slice(0, 2).map(secondaryCardHtml).join('\n');
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

          <nav class="pdp__breadcrumbs" aria-label="Breadcrumb">
            <ol role="list">
              <li><a href="homepage.html">Home</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="${categoryHref}">${escapeHtml(p.categoryLabel)}</a></li>
              <li aria-hidden="true">/</li>
              <li><span aria-current="page">${escapeHtml(p.name)}</span></li>
            </ol>
          </nav>

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
${addOnsSectionHtml(p)}
          <button type="button" class="btn btn--primary pdp__cta">Add To Cart</button>

          <p class="pdp__financing">
            From $0.00/mo with Paypal
            <a href="#financing">Learn More</a>
          </p>

          <!-- Key features list -->
          <div class="pdp__key-features">
            <p class="pdp__key-features-title">Key Features:</p>
            <ul class="pdp__key-features-list" role="list">
${p.keyFeatures.map((f) => '              <li>' + escapeHtml(f) + '</li>').join('\n')}
            </ul>
          </div>

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

    <!-- Secondary content: full-bleed feature + 2 product cards on dark band -->
    <section class="pdp-single__secondary" aria-label="Featured categories">
      <div class="pdp-single__feature">
        <div class="pdp-single__feature-image">
          <img src="assets/images/pdp/single-feature.jpg" alt="">
        </div>
        <div class="pdp-single__feature-text">
          <h2 class="pdp-single__feature-title">${featureTitle}</h2>
          <p class="pdp-single__feature-body">${featureBody}</p>
        </div>
      </div>

      <div class="pdp-single__products">
${secondaryCards}
      </div>
    </section>

    <!-- You May Also Like — 4-card recommended row + Shop All link -->
    <section class="pdp-single__recs" aria-label="You may also like">
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
