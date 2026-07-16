// Single-template PDP body — renders the <main> content of product-single.html
// (buy box + secondary feature band + recs) around the Task-4 chrome partials.
import { existsSync } from 'node:fs';
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml } from '../lib/parse.js';
import { priceRow, galleryHtml, breadcrumbHtml, quantityHtml, accordionHtml, additionalFeatureCardHtml, recCardHtml, recsSectionHtml, descriptionHtml } from './shared.js';

// Section 2 "Additional Features" images: prefers a purpose-shot feature-N.jpg (only
// york-r-350-rower has these exported today — see single-rework-spec.md Section 2),
// falling back to the product's own gallery photos (gallery[3] for card 1, gallery[4] for
// card 2 — matching where those lifestyle shots land in every single-template product's
// 5-photo gallery) when no dedicated export exists yet for a given slug.
function resolveFeatureImage(p, n, galleryIndex) {
  const named = `assets/images/products/${p.slug}/feature-${n}.jpg`;
  if (existsSync(named)) return named;
  const gallery = p.images?.gallery || [];
  return gallery[galleryIndex] ?? gallery[gallery.length - 1] ?? gallery[0] ?? '';
}

// Card 1 = highlights[1] (title + body, as-is). Card 2 = keyFeatures[3], split at its own
// en dash into title (before) + body (after) — every keyFeatures string ships as
// "Bold lead – sentence", so this reuses that existing shape rather than needing new copy.
// Renders fewer cards (never crashes) when a product doesn't have that highlight or that
// keyFeatures entry doesn't split into a title/body pair.
function resolveAdditionalFeatureCards(p) {
  const cards = [];

  const h1 = p.highlights?.[1];
  if (h1?.title && h1?.body) {
    cards.push({ title: h1.title, body: h1.body, image: resolveFeatureImage(p, 1, 3) });
  }

  const kf3 = p.keyFeatures?.[3];
  const dashIndex = kf3 ? kf3.indexOf('–') : -1;
  if (dashIndex !== -1) {
    cards.push({
      title: kf3.slice(0, dashIndex).trim(),
      body: kf3.slice(dashIndex + 1).trim(),
      image: resolveFeatureImage(p, 2, 4),
    });
  }

  return cards;
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

export function renderSingle(p) {
  const relatedProducts = p.relatedProducts || [];
  const feature = p.highlights?.[0] || {};
  const featureTitle = escapeHtml(feature.title || p.categoryLabel || p.name);
  const featureBody = escapeHtml(feature.body || p.detailsBody || '');
  const shopAllHref = p.category ? `plp-${p.category}.html` : 'plp-equipment.html';

  const additionalFeatureCards = resolveAdditionalFeatureCards(p).map(additionalFeatureCardHtml).join('\n');
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

${quantityHtml()}
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
${(p.keyFeatures || []).map((f) => '              <li>' + escapeHtml(f) + '</li>').join('\n')}
            </ul>
          </div>

${accordionHtml(p)}

        </div>

      </div>

    </section>

    <!-- Secondary content: full-bleed feature + 2 product cards on dark band -->
    <section class="pdp-single__secondary" aria-label="Featured categories">
      <div class="pdp-single__feature">
        <div class="pdp-single__feature-image">
          <img src="${p.images.editorial}" alt="">
        </div>
        <div class="pdp-single__feature-text">
          <h2 class="pdp-single__feature-title">${featureTitle}</h2>
          <p class="pdp-single__feature-body">${featureBody}</p>
        </div>
      </div>

      <div class="pdp-single__products">
${additionalFeatureCards}
      </div>
    </section>

    <!-- You May Also Like — 4-card recommended row + Shop All link -->
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
