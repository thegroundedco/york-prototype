// Shared building blocks for the PDP renderers (Single, Generic, ...). Extracted in
// Task 6, once the Generic template needed the same buy-box / related-card pieces
// Task 5 built for Single — the second usage crossed the rule-of-three, so the pieces
// that render identically across layouts moved here instead of being copy-pasted.
import { escapeHtml, formatPrice } from '../lib/parse.js';

// "fts-power-cage" -> "Fts Power Cage". Historically a display fallback for related-
// product cards that, at render time, had nothing but a slug to show. Single/Generic's
// recCardHtml no longer needs it — templates/index.js's resolveRelated resolves each
// relatedSlugs entry to the real product's {slug, name, price, image} before a product
// ever reaches a renderer, so those cards show real names now. Still used by
// templates/package.js's own pkgRecCardHtml, which hasn't been converted to the resolved-
// object shape (out of scope for this pass — package's recs are a separate, accordion-
// embedded UI, not the shared recCardHtml/recsSectionHtml this file also exports).
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
  const categoryHref = `plp-${p.category}.html`;
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

// Section 2 "Additional Features" card — a full-bleed photo + a real title/body pair
// (single.js resolves these from the product's own highlights[1] / keyFeatures[3], not
// from relatedSlugs — see single-rework-spec.md Section 2). Deliberately NOT a link: the
// prior secondaryCardHtml wrapped the title in <a href="${slug}.html"> pointing at an
// unrelated product ("Featured Products Section" in Figma was a mislabel — it's a
// benefit-spotlight band, not a related-product card), which is the bug this replaces.
export function additionalFeatureCardHtml({ title, body, image }) {
  return `        <article class="pdp-single__product">
          <div class="pdp-single__product-image">
            <img src="${image}" alt="">
          </div>
          <div class="pdp-single__product-text">
            <h3 class="pdp-single__product-title">${escapeHtml(title)}</h3>
            <p class="pdp-single__product-body">${escapeHtml(body)}</p>
          </div>
        </article>`;
}

function recPriceHtml(price) {
  if (!price) return `<span class="pdp-single__rec-price">Price TBD</span>`;
  if (price.compareAt) {
    return `<span class="pdp-single__rec-price--original">${formatPrice(price.compareAt)}</span><span class="pdp-single__rec-price--sale">${formatPrice(price.current)}</span>`;
  }
  return `<span class="pdp-single__rec-price">${formatPrice(price.current)}</span>`;
}

// Shared price fragment for listing cards. `base` is the base price class.
// compareAt → sale (current) + original (strikethrough), in that order.
// The two card families differ in markup: PLP sale/original spans carry the
// modifier class ONLY; collection spans carry base + modifier. `withBaseOnMods`
// selects which, so each renderer reproduces its family's original markup exactly.
function cardPrices(price, base, withBaseOnMods) {
  if (!price) return `<span class="${base}">Price TBD</span>`;
  if (price.compareAt) {
    const mod = (name) => (withBaseOnMods ? `${base} ${base}--${name}` : `${base}--${name}`);
    return `<span class="${mod('sale')}">${formatPrice(price.current)}</span>`
      + `<span class="${mod('original')}">${formatPrice(price.compareAt)}</span>`;
  }
  return `<span class="${base}">${formatPrice(price.current)}</span>`;
}

// PLP grid card (`.plp__card`). Takes a resolved card object from
// lib/merchandising.js resolveEntry — { href, name, image, price }. Title link +
// CTA point at the PDP/cart the same way the placeholder cards did.
export function plpCardHtml({ href, name, image, price }) {
  const badge = price?.compareAt ? `\n            <span class="plp__card-badge">Sale</span>` : '';
  return `        <article class="plp__card">
          <div class="plp__card-image">
            <img src="${image}" alt="">${badge}
          </div>
          <h3 class="plp__card-title"><a class="plp__card-title-link" href="${href}">${escapeHtml(name)}</a></h3>
          <div class="plp__card-prices">${cardPrices(price, 'plp__card-price', false)}</div>
          <a class="btn btn--primary plp__card-cta" href="#cart">Add To Cart</a>
        </article>`;
}

// Collection/goal grid card (`.collections-product-card`). Same resolved object
// plus `filterType`, which becomes the `data-collection-card-category` the goal
// sub-filter JS matches against.
export function collectionCardHtml({ href, name, image, price, filterType }) {
  const badge = price?.compareAt ? `\n            <span class="collections-product-card__badge">Sale</span>` : '';
  return `        <article class="collections-product-card" data-collection-card-category="${filterType}">
          <div class="collections-product-card__media">
            <img class="collections-product-card__image" src="${image}" alt="${escapeHtml(name)}">${badge}
          </div>
          <div class="collections-product-card__body">
            <h4 class="collections-product-card__title"><a class="collections-product-card__title-link" href="${href}">${escapeHtml(name)}</a></h4>
            <div class="collections-product-card__prices">${cardPrices(price, 'collections-product-card__price', true)}</div>
            <a class="btn btn--primary collections-product-card__cta" href="#cart">Add To Cart</a>
          </div>
        </article>`;
}

// "You May Also Like" rec card. Takes a resolved related-product object (see
// templates/index.js's resolveRelated) — {slug, name, price, image} — not a bare slug, so
// the card shows the peer's real name/price/image instead of a humanized-slug guess and a
// permanent "Price TBD".
export function recCardHtml({ slug, name, price, image }) {
  return `        <article class="pdp-single__rec-card">
          <div class="pdp-single__rec-image">
            <img src="${image || ''}" alt="">
          </div>
          <h3 class="pdp-single__rec-title"><a class="pdp-single__rec-title-link" href="${slug}.html">${escapeHtml(name)}</a></h3>
          <div class="pdp-single__rec-prices">${recPriceHtml(price)}</div>
          <a class="btn btn--primary pdp-single__rec-cta" href="${slug}.html">View Product</a>
        </article>`;
}

// Static quantity stepper, shared verbatim by the Single and Generic buy boxes. Kept a
// standalone export (not baked into any larger buy-box helper) because the Package
// template deliberately does NOT show a quantity control.
export function quantityHtml() {
  return `          <!-- Quantity -->
          <div class="pdp__quantity">
            <label class="pdp__quantity-label" for="pdp-qty">Quantity</label>
            <div class="pdp__quantity-input">
              <button type="button" class="pdp__quantity-btn" data-qty-decrement aria-label="Decrease quantity">–</button>
              <input id="pdp-qty" class="pdp__quantity-value" type="text" inputmode="numeric" value="1" data-qty-value aria-live="polite">
              <button type="button" class="pdp__quantity-btn" data-qty-increment aria-label="Increase quantity">+</button>
            </div>
          </div>`;
}

// Buy-box accordion (Description / Features & Specs modal-trigger / Shipping & Returns),
// shared verbatim by the Single and Generic buy boxes. Only the Description body varies
// per product (escapeHtml(p.detailsBody)); the Features & Specs trigger and the static
// Shipping & Returns copy are identical everywhere.
export function accordionHtml(p) {
  return `          <!-- Accordion: Description + Shipping & Returns inline expand; Features & Specs opens side modal -->
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
          </div>`;
}

// "You May Also Like" — 4-card recommended row + Shop All link. product-generic.html
// ships this section with the literal comment "same 4-card row + Shop All used by
// single PDP" — it is byte-identical markup to the Single layout's recs section, so it
// lives here once instead of being copy-pasted per template. Callers keep their own
// leading HTML comment (its wording differs slightly per template).
//
// cardCount is the actual number of <article> cards in recCards (1-4). The Shop All link
// is a grid item INSIDE .pdp-single__recs-row (its own 2nd grid row), positioned via an
// inline grid-column matching cardCount — .pdp-single__recs-row keeps a fixed
// repeat(4, 1fr) track definition regardless of cardCount (so card width never changes),
// but the Shop All link needs to sit under the LAST real card, not under an empty track.
// Previously it was a flex sibling of the row with align-self:flex-end, which aligned to
// the always-4-wide flex parent's edge — i.e. stranded far-right whenever <4 cards
// rendered instead of sitting under the last real card.
export function recsSectionHtml(recCards, shopAllHref, cardCount = 4) {
  const col = Math.min(Math.max(cardCount, 1), 4);
  return `    <section class="pdp-single__recs" aria-label="You may also like">
      <div class="pdp-single__recs-intro">
        <h2 class="pdp-single__recs-heading display-lg">You May Also Like</h2>
        <p class="pdp-single__recs-desc">The essentials, perfected. These top-tier selections combine our legendary commercial-grade durability with refined modern aesthetics. We've curated our most iconic gear to deliver a professional-grade training experience in any environment.</p>
      </div>
      <div class="pdp-single__recs-row">
${recCards}
        <a class="pdp-single__recs-shop-all" style="grid-column: ${col};" href="${shopAllHref}">
          <span>Shop All</span>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </section>`;
}

// PDP description ("Read More" control): only shown when the description is long enough
// to need truncating. Word count is measured on the tag-stripped text of
// p.shortDescription (which ships from the sheet as one or more <p> blocks).
//  - <=60 words: renders plainly, no clamp wrapper, no toggle button at all — a short
//    description has nothing to truncate, so a Read More that reveals nothing new (or a
//    handful of extra characters) is just visual noise.
//  - >60 words: wraps the text in an inner .pdp__description-text clamp wrapper (CSS
//    line-clamps it to ~4 lines when collapsed) alongside the Read More/Less toggle
//    button. js/chrome.js's existing [data-pdp-description] / [data-pdp-description-toggle]
//    listener drives the expand/collapse — untouched, it only needs the outer element to
//    carry data-pdp-description and a child with data-pdp-description-toggle, both of
//    which this still provides.
const DESCRIPTION_WORD_LIMIT = 60;

export function descriptionHtml(p) {
  const raw = p.shortDescription || '';
  const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;

  if (wordCount <= DESCRIPTION_WORD_LIMIT) {
    return `          <div class="pdp__description">
            ${raw}
          </div>`;
  }

  return `          <div class="pdp__description" data-pdp-description>
            <div class="pdp__description-text">${raw}</div>
            <button type="button" class="pdp__read-more" data-pdp-description-toggle aria-expanded="false">
              <span data-pdp-description-label-more>Read More</span>
              <span data-pdp-description-label-less hidden>Read Less</span>
            </button>
          </div>`;
}
