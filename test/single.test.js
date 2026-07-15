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
