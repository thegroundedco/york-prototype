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

test('related slugs render as secondary + rec cards with humanized titles and slug links', () => {
  // The sample fixture ships relatedSlugs: [] — with no populated fixture, the
  // secondaryCardHtml/recCardHtml/humanizeSlug paths (and thus the whole related-card
  // surface Task 15 builds on) never execute in any other test. Cover them here.
  const html = renderSingle({ ...p, relatedSlugs: ['york-r-350-rower', 'fts-power-cage'] });
  // rec-row link + humanized title (assert the exact humanizeSlug output)
  assert.match(html, /<a class="pdp-single__rec-title-link" href="york-r-350-rower\.html">York R 350 Rower<\/a>/);
  assert.match(html, /<a class="pdp-single__rec-title-link" href="fts-power-cage\.html">Fts Power Cage<\/a>/);
  // secondary product card link + humanized title
  assert.match(html, /<h3 class="pdp-single__product-title"><a href="york-r-350-rower\.html">York R 350 Rower<\/a><\/h3>/);
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
