import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts } from '../lib/products.js';
import { renderSingle } from '../templates/single.js';

const p = loadProducts('data/products.sample.json')[0];

test('single page renders name, price, description, no placeholders', () => {
  const html = renderSingle(p);
  assert.match(html, /<h1 class="pdp__title">Sample Bench<\/h1>/);
  assert.match(html, /\$104\.00/);          // current
  assert.match(html, /\$160\.00/);          // compareAt
  assert.match(html, /A sample bench for tests\./);
  assert.doesNotMatch(html, /Lorem ipsum/);
  assert.doesNotMatch(html, /Product Title Title/);
  assert.doesNotMatch(html, /\{\{/);
  assert.doesNotMatch(html, /\$1,2200\.00/); // the old junk price is gone
});

test('single page is a complete document', () => {
  const html = renderSingle(p);
  // renderHead (Task 4, committed) unconditionally prefixes a one-line
  // "GENERATED ... do not edit by hand" comment ahead of <!DOCTYPE html> — that banner
  // postdates this brief's original `/^<!DOCTYPE html>/` assumption (see task-4-report.md
  // and the Task 17 contract in the phase-1 plan). Assert the doc opens with that comment
  // immediately followed by the doctype, rather than requiring <!DOCTYPE html> to be the
  // literal first bytes.
  assert.match(html, /^<!--[^\n]*-->\n<!DOCTYPE html>\n<html/);
  assert.match(html, /<\/html>\s*$/);
  assert.match(html, /js\/chrome\.js/);
});

test('add-ons section omitted when empty', () => {
  const html = renderSingle({ ...p, addOns: [] });
  assert.doesNotMatch(html, /Select Popular Add Ons/);
});

test('relatedProducts render as rec cards with real name/price/image, linked to the slug', () => {
  // Single now receives already-resolved relatedProducts (templates/index.js's
  // resolveRelated), not raw relatedSlugs — recCardHtml no longer humanizes a slug into a
  // guessed title with a permanent "Price TBD".
  const html = renderSingle({
    ...p,
    relatedProducts: [
      { slug: 'york-r-350-rower', name: 'York R-350 Rower', price: { current: 932.49, compareAt: 1313.99 }, image: 'assets/images/products/york-r-350-rower/gallery-1.jpg' },
      { slug: 'fts-power-cage', name: 'FTS Power Cage', price: { current: 799, compareAt: null }, image: 'assets/images/products/fts-power-cage/gallery-1.jpg' },
    ],
  });
  assert.match(html, /<img src="assets\/images\/products\/york-r-350-rower\/gallery-1\.jpg" alt="">/);
  assert.match(html, /<a class="pdp-single__rec-title-link" href="york-r-350-rower\.html">York R-350 Rower<\/a>/);
  // compareAt present -> strikethrough original + sale price
  assert.match(html, /<span class="pdp-single__rec-price--original">\$1,313\.99<\/span><span class="pdp-single__rec-price--sale">\$932\.49<\/span>/);
  assert.match(html, /<a class="pdp-single__rec-title-link" href="fts-power-cage\.html">FTS Power Cage<\/a>/);
  // no compareAt -> single undecorated price, no strikethrough span
  assert.match(html, /<span class="pdp-single__rec-price">\$799\.00<\/span>/);
  assert.doesNotMatch(html, /Price TBD/);
});

test('rec card with no price falls back to Price TBD', () => {
  const html = renderSingle({ ...p, relatedProducts: [{ slug: 'x', name: 'X Thing', price: null, image: '' }] });
  assert.match(html, /<span class="pdp-single__rec-price">Price TBD<\/span>/);
});

test('shop-all link grid-column reflects the actual rendered rec card count', () => {
  const oneCard = renderSingle({ ...p, relatedProducts: [{ slug: 'a', name: 'A', price: null, image: '' }] });
  assert.match(oneCard, /class="pdp-single__recs-shop-all" style="grid-column: 1;"/);
  const fourCards = renderSingle({
    ...p,
    relatedProducts: [
      { slug: 'a', name: 'A', price: null, image: '' },
      { slug: 'b', name: 'B', price: null, image: '' },
      { slug: 'c', name: 'C', price: null, image: '' },
      { slug: 'd', name: 'D', price: null, image: '' },
    ],
  });
  assert.match(fourCards, /class="pdp-single__recs-shop-all" style="grid-column: 4;"/);
});

test('additional feature cards use highlights[1] + keyFeatures[3] split on its en dash, not clickable', () => {
  const html = renderSingle({
    ...p,
    highlights: [{ title: 'H0', body: 'B0' }, { title: 'Low Impact. High Performance.', body: 'Smooth, joint-friendly workouts.' }],
    keyFeatures: ['a', 'b', 'c', 'Easy to Store & Built to Last – Durable construction for any home gym.'],
  });
  assert.match(html, /<h3 class="pdp-single__product-title">Low Impact\. High Performance\.<\/h3>/);
  assert.match(html, /<p class="pdp-single__product-body">Smooth, joint-friendly workouts\.<\/p>/);
  assert.match(html, /<h3 class="pdp-single__product-title">Easy to Store &amp; Built to Last<\/h3>/);
  assert.match(html, /<p class="pdp-single__product-body">Durable construction for any home gym\.<\/p>/);
  // no <a> anywhere inside the product-title (the old secondaryCardHtml linked to a slug)
  assert.doesNotMatch(html, /<h3 class="pdp-single__product-title"><a/);
});

test('additional feature section renders fewer cards (not a crash) when a product lacks highlights[1] or a splittable keyFeatures[3]', () => {
  // sample-bench (the default fixture `p`) ships only 1 highlight and 2 keyFeatures —
  // neither highlights[1] nor keyFeatures[3] exists, so 0 cards should render.
  const html = renderSingle(p);
  assert.doesNotMatch(html, /pdp-single__product-title/);
});

test('feature banner image uses the product\'s own editorial image, not a hardcoded shared asset', () => {
  const html = renderSingle(p);
  assert.match(html, /<img src="assets\/images\/products\/sample-bench\/editorial\.jpg" alt="">/);
  assert.doesNotMatch(html, /single-feature\.jpg/);
});

test('null price renders Price TBD and no compareAt strikethrough', () => {
  const html = renderSingle({ ...p, price: null });
  assert.match(html, /Price TBD/);
  assert.doesNotMatch(html, /pdp__price-original/);
});

test('price with current but no compareAt renders a single price, no strikethrough', () => {
  const html = renderSingle({ ...p, price: { current: 89, compareAt: null, sourceUrl: '' } });
  assert.match(html, /<span class="pdp__price-current">\$89\.00<\/span>/);
  assert.doesNotMatch(html, /pdp__price-original/);
});
