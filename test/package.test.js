import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPackage } from '../templates/package.js';

const p = {
  slug: 'plyo-package', name: 'Plyo Package', template: 'package',
  category: 'equipment', categoryLabel: 'Equipment',
  price: { current: 499, compareAt: 599, sourceUrl: '' },
  shortDescription: '<p>Bundle.</p>', included: ['Plyo box', 'Slam ball', 'Mat'],
  specs: ['Full kit'], detailsBody: 'Details.', highlights: [], keyFeatures: [],
  variants: { type: 'quantity' }, relatedSlugs: [],
  images: { gallery: ['g1.jpg', 'g2.jpg', 'g3.jpg'], editorial: 'e.jpg' },
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

test('package embeds recs in an open accordion entry', () => {
  const html = renderPackage({ ...p, relatedSlugs: ['york-r-350-rower', 'fts-power-cage'] });
  assert.match(html, /<details class="pdp__acc-entry" open>/);
  assert.match(html, /pdp__acc-body--recs/);
  assert.match(html, /<a class="pdp__rec-title-link" href="york-r-350-rower\.html">York R 350 Rower<\/a>/);
  assert.match(html, /<a class="pdp__rec-title-link" href="fts-power-cage\.html">Fts Power Cage<\/a>/);
});

test('null price renders Price TBD and no compareAt strikethrough', () => {
  const html = renderPackage({ ...p, price: null });
  assert.match(html, /Price TBD/);
  assert.doesNotMatch(html, /pdp__price-original/);
});
