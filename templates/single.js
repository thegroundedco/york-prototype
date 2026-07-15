// Single-template PDP body — renders the <main> content of product-single.html
// (buy box + secondary feature band + recs) around the Task-4 chrome partials.
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml } from '../lib/parse.js';
import { priceRow, galleryHtml, breadcrumbHtml, quantityHtml, accordionHtml, secondaryCardHtml, recCardHtml, recsSectionHtml } from './shared.js';

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
  const relatedSlugs = p.relatedSlugs || [];
  const feature = p.highlights?.[0] || {};
  const featureTitle = escapeHtml(feature.title || p.categoryLabel || p.name);
  const featureBody = escapeHtml(feature.body || p.detailsBody || '');
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
${p.keyFeatures.map((f) => '              <li>' + escapeHtml(f) + '</li>').join('\n')}
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
