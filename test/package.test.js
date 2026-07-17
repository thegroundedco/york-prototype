import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPackage } from '../templates/package.js';

const p = {
  slug: 'plyo-package', name: 'Plyo Package', template: 'package',
  category: 'equipment', categoryLabel: 'Equipment',
  price: { current: 499, compareAt: 599, sourceUrl: '' },
  shortDescription: '<p>Bundle.</p>', included: ['Plyo box', 'Slam ball', 'Mat'],
  specs: ['Full kit'], detailsBody: 'Details.',
  whyBody: 'Building a home gym shouldn\'t feel like solving a puzzle.',
  keyDetails: [
    { title: "Choose the Bar That's Right for You", body: 'Select the premium bar that best fits your training style.' },
    { title: 'Premium Equipment. Better Experience.', body: 'Quick Access Collars make changing weights fast and effortless.' },
    { title: 'Train Smarter. Progress Gradually:', body: 'A complete range of bumper plates gives you flexibility.' },
  ],
  highlights: [
    { title: 'Thoughtfully Designed to Train Better', body: 'Why body copy.' },
    { title: 'Built for Steady Progress', body: 'Feature 1 body copy.' },
  ],
  keyFeatures: [],
  variants: { type: 'quantity' }, relatedSlugs: [],
  // plyo-package is a real product slug (assets/images/products/plyo-package/ exists on
  // disk with only gallery-*/editorial.jpg, no dedicated key-detail-N/feature-N.jpg
  // exports) — deliberately reused here so resolveKeyDetailImage/resolveFeaturedCardImage
  // exercise their real existsSync-false gallery-fallback branch, not just a mocked path.
  images: { gallery: ['g1.jpg', 'g2.jpg', 'g3.jpg', 'g4.jpg', 'g5.jpg'], editorial: 'e.jpg' },
  copySource: 'sheet', imageSource: 'figma',
};

test('package lists included items and shows both prices', () => {
  const html = renderPackage(p);
  assert.match(html, /What.s Included/);
  assert.match(html, /Plyo box/);
  assert.match(html, /Slam ball/);
  assert.match(html, /\$499\.00/);
  assert.match(html, /\$599\.00/);
  assert.doesNotMatch(html, /pdp__quantity/); // package has no qty stepper
  assert.doesNotMatch(html, /\{\{/);
});

test('package is a complete document with no leftover source junk', () => {
  const html = renderPackage(p);
  // As in single/generic.test.js: renderHead unconditionally prefixes a one-line
  // "GENERATED ... do not edit by hand" comment ahead of <!DOCTYPE html>.
  assert.match(html, /^<!--[^\n]*-->\n<!DOCTYPE html>\n<html/);
  assert.match(html, /<\/html>\s*$/);
  assert.doesNotMatch(html, /Lorem ipsum/i);
  assert.doesNotMatch(html, /Product Name Product Title/);
  assert.doesNotMatch(html, /Product Name/); // breadcrumb placeholder from the source
  assert.doesNotMatch(html, /\$1,2200\.00/); // the old junk rec-card price is gone
  assert.doesNotMatch(html, /Select Popular Add Ons/); // package has no add-ons
});

test('"Why This Package" intro uses whyBody, not highlights[0]', () => {
  const html = renderPackage(p);
  assert.match(html, /Building a home gym shouldn&#39;t feel like solving a puzzle\./);
  assert.doesNotMatch(html, /Why body copy\./); // highlights[0].body must NOT win when whyBody is present
});

test('whyBody falls back to highlights[0].body, then detailsBody, when whyBody is absent', () => {
  const { whyBody, ...noWhyBody } = p;
  const withHighlight = renderPackage(noWhyBody);
  assert.match(withHighlight, /Why body copy\./);

  const { whyBody: _wb, highlights, ...noneAtAll } = p;
  const withDetailsBody = renderPackage({ ...noneAtAll, highlights: [] });
  assert.match(withDetailsBody, /Details\./);
});

test('Key Details renders real keyDetails titles/bodies, not "Key Detail #N" placeholders', () => {
  const html = renderPackage(p);
  assert.match(html, /<h3 class="pdp__why-testimonial-title">Choose the Bar That&#39;s Right for You<\/h3>/);
  assert.match(html, /<p class="pdp__why-testimonial-body">Select the premium bar that best fits your training style\.<\/p>/);
  assert.match(html, /<h3 class="pdp__why-testimonial-title">Premium Equipment\. Better Experience\.<\/h3>/);
  assert.match(html, /<h3 class="pdp__why-testimonial-title">Train Smarter\. Progress Gradually:<\/h3>/);
  assert.doesNotMatch(html, /Key Detail #/);
  assert.equal((html.match(/pdp__why-testimonial"/g) || []).length, 3);
});

test('Key Details column images fall back to gallery photos when no dedicated key-detail-N.jpg export exists', () => {
  const html = renderPackage(p);
  // plyo-package has no key-detail-*.jpg on disk, so each column falls back to
  // gallery[i+1] per resolveKeyDetailImage's existsSync-then-gallery-fallback chain.
  assert.match(html, /<div class="pdp__why-testimonial-image">\s*<img src="g2\.jpg" alt="">/);
  assert.match(html, /<div class="pdp__why-testimonial-image">\s*<img src="g3\.jpg" alt="">/);
  assert.match(html, /<div class="pdp__why-testimonial-image">\s*<img src="g4\.jpg" alt="">/);
});

test('Key Details renders fewer columns (not a crash) when keyDetails has fewer than 3 entries', () => {
  const html = renderPackage({ ...p, keyDetails: [p.keyDetails[0]] });
  assert.equal((html.match(/pdp__why-testimonial"/g) || []).length, 1);
  assert.doesNotMatch(html, /Key Detail #/);
});

test('Key Details degrades to zero columns (not a crash) when keyDetails is empty', () => {
  const html = renderPackage({ ...p, keyDetails: [] });
  assert.doesNotMatch(html, /pdp__why-testimonial"/);
});

test('Built for Steady Progress card images fall back to gallery photos when no dedicated feature-N.jpg export exists', () => {
  const html = renderPackage(p);
  // plyo-package has no feature-*.jpg on disk, so card 1 falls back to gallery[0] and
  // card 2 falls back to gallery[4] per resolveFeaturedCardImage.
  assert.match(html, /<div class="pdp__featured-image">\s*<img src="g1\.jpg" alt="">/);
  assert.match(html, /<div class="pdp__featured-image">\s*<img src="g5\.jpg" alt="">/);
});

test('"You May Also Like" is a standalone section after the featured band, not embedded in the accordion', () => {
  const html = renderPackage({
    ...p,
    relatedProducts: [
      { slug: 'york-performance-package', name: 'York Performance Package', price: { current: 799, compareAt: 999 }, image: 'assets/images/products/york-performance-package/gallery-1.jpg' },
      { slug: 'rubber-hex-dumbbell-set', name: 'Rubber Hex Dumbbell Set', price: { current: 349, compareAt: null }, image: 'assets/images/products/rubber-hex-dumbbell-set/gallery-1.jpg' },
    ],
  });
  // Old accordion-embedded recs UI is gone entirely.
  assert.doesNotMatch(html, /<details class="pdp__acc-entry" open>/);
  assert.doesNotMatch(html, /pdp__acc-body--recs/);
  assert.doesNotMatch(html, /pdp__recs-scroller/);
  assert.doesNotMatch(html, /Price TBD/);
  // New: shared recCardHtml/recsSectionHtml with real name/price/image, same as single/generic.
  assert.match(html, /<section class="pdp-single__recs" aria-label="You may also like">/);
  assert.match(html, /<img src="assets\/images\/products\/york-performance-package\/gallery-1\.jpg" alt="">/);
  assert.match(html, /<a class="pdp-single__rec-title-link" href="york-performance-package\.html">York Performance Package<\/a>/);
  assert.match(html, /<span class="pdp-single__rec-price--original">\$999\.00<\/span><span class="pdp-single__rec-price--sale">\$799\.00<\/span>/);
  assert.match(html, /<a class="pdp-single__rec-title-link" href="rubber-hex-dumbbell-set\.html">Rubber Hex Dumbbell Set<\/a>/);
  assert.match(html, /<span class="pdp-single__rec-price">\$349\.00<\/span>/);
  // Features & Specs / Shipping & Returns accordion entries are untouched.
  assert.match(html, /Features &amp; Specs/);
  assert.match(html, /Shipping &amp; Returns/);
});

test('"You May Also Like" renders zero rec cards (not a crash) when relatedProducts is empty', () => {
  const html = renderPackage(p);
  assert.match(html, /<section class="pdp-single__recs" aria-label="You may also like">/);
  assert.doesNotMatch(html, /pdp-single__rec-card/);
});

test('null price renders Price TBD and no compareAt strikethrough', () => {
  const html = renderPackage({ ...p, price: null });
  assert.match(html, /Price TBD/);
  assert.doesNotMatch(html, /pdp__price-original/);
});
