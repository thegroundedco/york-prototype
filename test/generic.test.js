import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGeneric } from '../templates/generic.js';

const p = {
  slug: 'battle-rope', name: 'Battle Rope', template: 'generic',
  category: 'accessories', categoryLabel: 'Accessories',
  price: { current: 89, compareAt: null, sourceUrl: '' },
  shortDescription: '<p>Heavy rope.</p>',
  keyFeatures: [
    'Durable Construction: Heavy-duty poly dacron withstands daily commercial use.',
    'Full-Body Burn: Engages arms, shoulders, core, and legs in a single movement.',
    'No Assembly Required: Ships ready to anchor and use out of the box.',
  ],
  specs: ['30 ft'],
  detailsBody: 'Details.', highlights: [{ title: 'Tough', body: 'Very.' }],
  variants: { type: 'quantity' }, relatedSlugs: [],
  images: { gallery: ['g1.jpg', 'g2.jpg', 'g3.jpg'], editorial: 'e.jpg' },
  copySource: 'sheet', imageSource: 'figma',
};

test('generic renders name + single price, no compareAt span', () => {
  const html = renderGeneric(p);
  assert.match(html, /Battle Rope/);
  assert.match(html, /\$89\.00/);
  assert.doesNotMatch(html, /pdp__price-original/);   // no compareAt → no strikethrough
  assert.doesNotMatch(html, /Select Popular Add Ons/); // generic has no add-ons
  assert.doesNotMatch(html, /\{\{/);
});

test('generic is a complete document with the editorial image', () => {
  const html = renderGeneric(p);
  // As in single.test.js: renderHead (Task 4, committed) unconditionally prefixes a
  // one-line "GENERATED ... do not edit by hand" comment ahead of <!DOCTYPE html>, so
  // the brief's literal /^<!DOCTYPE html>/ never matches. Assert the doc opens with
  // that comment immediately followed by the doctype instead.
  assert.match(html, /^<!--[^\n]*-->\n<!DOCTYPE html>\n<html/);
  assert.match(html, /e\.jpg/);
});

test('feature section renders one column per keyFeatures entry, split on the first colon', () => {
  const html = renderGeneric(p);
  assert.match(html, /<h3 class="pdp-generic__features-title">Durable Construction<\/h3>/);
  assert.match(html, /<p class="pdp-generic__features-body">Heavy-duty poly dacron withstands daily commercial use\.<\/p>/);
  assert.match(html, /<h3 class="pdp-generic__features-title">Full-Body Burn<\/h3>/);
  assert.match(html, /<h3 class="pdp-generic__features-title">No Assembly Required<\/h3>/);
  // 3 keyFeatures entries -> 3 columns, custom property drives the grid's column count.
  assert.equal((html.match(/pdp-generic__features-item/g) || []).length, 3);
  assert.match(html, /--pdp-generic-features-count: 3;/);
  // The old mismapped single card (categoryLabel-fallback title) is gone entirely.
  assert.doesNotMatch(html, /pdp-generic__feature-card/);
  assert.doesNotMatch(html, /pdp-generic__feature-title/);
});

test('a keyFeatures entry with no colon becomes a header-only column, not a crash', () => {
  const noColon = { ...p, keyFeatures: ['Just A Header With No Colon'] };
  const html = renderGeneric(noColon);
  assert.match(html, /<h3 class="pdp-generic__features-title">Just A Header With No Colon<\/h3>/);
  assert.equal((html.match(/pdp-generic__features-item/g) || []).length, 1);
  assert.doesNotMatch(html, /pdp-generic__features-body/); // no colon -> no body paragraph
});

test('feature section degrades to zero columns without crashing when keyFeatures is empty', () => {
  const empty = { ...p, keyFeatures: [] };
  const html = renderGeneric(empty);
  assert.doesNotMatch(html, /pdp-generic__features-item/);
  assert.match(html, /--pdp-generic-features-count: 1;/); // guarded, never 0
});

test('featured section is a single static banner image, no carousel', () => {
  const html = renderGeneric(p);
  // The gallery-image modal elsewhere on the page has its own, separate data-carousel
  // instance (modal--gallery-image__slide/-dot) — untouched by this change — so assert
  // against the pdp-generic__featured-* names specifically, not "no data-carousel at all".
  assert.doesNotMatch(html, /data-carousel-interval/); // was unique to the old auto-rotate carousel
  assert.doesNotMatch(html, /pdp-generic__featured-slide/);
  assert.doesNotMatch(html, /pdp-generic__featured-dot/);
  assert.match(html, /<section class="pdp-generic__featured" aria-label="Featured">\s*<img class="pdp-generic__featured-image" src="e\.jpg" alt="">/);
  // The <section> itself carries no data-carousel attribute.
  assert.doesNotMatch(html, /pdp-generic__featured" aria-label="Featured" data-carousel/);
});

test('featured banner prefers product.featuredBanner over images.editorial when present', () => {
  const withBanner = { ...p, featuredBanner: 'assets/images/products/battle-rope/featured-banner.jpg' };
  const html = renderGeneric(withBanner);
  assert.match(html, /<img class="pdp-generic__featured-image" src="assets\/images\/products\/battle-rope\/featured-banner\.jpg" alt="">/);
});
