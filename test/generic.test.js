import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGeneric } from '../templates/generic.js';

const p = {
  slug: 'battle-rope', name: 'Battle Rope', template: 'generic',
  category: 'accessories', categoryLabel: 'Accessories',
  price: { current: 89, compareAt: null, sourceUrl: '' },
  shortDescription: '<p>Heavy rope.</p>', keyFeatures: ['Grip'], specs: ['30 ft'],
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
