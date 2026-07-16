import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  descriptionHtml,
  additionalFeatureCardHtml,
  recCardHtml,
  recsSectionHtml,
} from '../templates/shared.js';

// ── descriptionHtml (Part B1 — Read More only when the description is actually long) ──

test('descriptionHtml: <=60 words renders plainly, no toggle, no clamp wrapper', () => {
  const html = descriptionHtml({ shortDescription: '<p>A short sample description under sixty words.</p>' });
  assert.match(html, /<div class="pdp__description">/);
  assert.doesNotMatch(html, /data-pdp-description/);
  assert.doesNotMatch(html, /pdp__description-text/);
  assert.doesNotMatch(html, /pdp__read-more/);
  assert.match(html, /A short sample description under sixty words\./);
});

test('descriptionHtml: >60 words gets the clamp wrapper + Read More/Less toggle', () => {
  const words = new Array(75).fill('word').join(' ');
  const html = descriptionHtml({ shortDescription: `<p>${words}</p>` });
  assert.match(html, /<div class="pdp__description" data-pdp-description>/);
  assert.match(html, /<div class="pdp__description-text">/);
  assert.match(html, /data-pdp-description-toggle/);
  assert.match(html, /data-pdp-description-label-more/);
  assert.match(html, /data-pdp-description-label-less/);
});

test('descriptionHtml: word count strips HTML tags before counting (a tag-heavy 55-word description still counts as short)', () => {
  const words = new Array(55).fill('<strong>word</strong>').join(' ');
  const html = descriptionHtml({ shortDescription: `<p>${words}</p>` });
  assert.doesNotMatch(html, /data-pdp-description/);
});

test('descriptionHtml: exactly 60 words is still short (threshold is <=60)', () => {
  const words = new Array(60).fill('word').join(' ');
  const html = descriptionHtml({ shortDescription: `<p>${words}</p>` });
  assert.doesNotMatch(html, /data-pdp-description/);
});

test('descriptionHtml: 61 words crosses into long', () => {
  const words = new Array(61).fill('word').join(' ');
  const html = descriptionHtml({ shortDescription: `<p>${words}</p>` });
  assert.match(html, /data-pdp-description/);
});

// ── additionalFeatureCardHtml (Section 2 — replaces secondaryCardHtml) ──

test('additionalFeatureCardHtml renders an image, title, and body — not a link', () => {
  const html = additionalFeatureCardHtml({ title: 'Low Impact', body: 'Smooth workouts.', image: 'a.jpg' });
  assert.match(html, /<img src="a\.jpg" alt="">/);
  assert.match(html, /<h3 class="pdp-single__product-title">Low Impact<\/h3>/);
  assert.match(html, /<p class="pdp-single__product-body">Smooth workouts\.<\/p>/);
  assert.doesNotMatch(html, /<a /);
});

test('additionalFeatureCardHtml escapes title and body', () => {
  const html = additionalFeatureCardHtml({ title: 'A & B', body: '<b>bold</b>', image: 'a.jpg' });
  assert.match(html, /A &amp; B/);
  assert.match(html, /&lt;b&gt;bold&lt;\/b&gt;/);
});

// ── recCardHtml (Part B3 — takes a resolved related-product object, not a bare slug) ──

test('recCardHtml with compareAt shows original (strikethrough) + sale price', () => {
  const html = recCardHtml({ slug: 'a', name: 'A Product', price: { current: 90, compareAt: 120 }, image: 'a.jpg' });
  assert.match(html, /<img src="a\.jpg" alt="">/);
  assert.match(html, /<a class="pdp-single__rec-title-link" href="a\.html">A Product<\/a>/);
  assert.match(html, /<span class="pdp-single__rec-price--original">\$120\.00<\/span><span class="pdp-single__rec-price--sale">\$90\.00<\/span>/);
  assert.match(html, /href="a\.html">View Product<\/a>/);
});

test('recCardHtml with no compareAt shows a single undecorated price', () => {
  const html = recCardHtml({ slug: 'a', name: 'A Product', price: { current: 90, compareAt: null }, image: 'a.jpg' });
  assert.match(html, /<span class="pdp-single__rec-price">\$90\.00<\/span>/);
  assert.doesNotMatch(html, /rec-price--sale/);
  assert.doesNotMatch(html, /rec-price--original/);
});

test('recCardHtml with no price at all falls back to Price TBD', () => {
  const html = recCardHtml({ slug: 'a', name: 'A Product', price: null, image: 'a.jpg' });
  assert.match(html, /<span class="pdp-single__rec-price">Price TBD<\/span>/);
});

test('recCardHtml escapes the product name', () => {
  const html = recCardHtml({ slug: 'a', name: 'Rack & Bench', price: null, image: '' });
  assert.match(html, />Rack &amp; Bench</);
});

// ── recsSectionHtml (Section 3 — Shop All is a grid item, positioned by actual card count) ──

test('recsSectionHtml places Shop All at grid-column matching cardCount', () => {
  const html = recsSectionHtml('<article></article>', 'plp-equipment.html', 2);
  assert.match(html, /class="pdp-single__recs-shop-all" style="grid-column: 2;"/);
});

test('recsSectionHtml clamps cardCount to the 1-4 range', () => {
  const zero = recsSectionHtml('', 'plp-equipment.html', 0);
  assert.match(zero, /style="grid-column: 1;"/);
  const six = recsSectionHtml('', 'plp-equipment.html', 6);
  assert.match(six, /style="grid-column: 4;"/);
});

test('recsSectionHtml defaults cardCount to 4 when omitted', () => {
  const html = recsSectionHtml('', 'plp-equipment.html');
  assert.match(html, /style="grid-column: 4;"/);
});
