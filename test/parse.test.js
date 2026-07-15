import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, splitBullets, splitSpecs, escapeHtml, formatPrice } from '../lib/parse.js';

test('slugify', () => {
  assert.equal(slugify('FTS Power Cage'), 'fts-power-cage');
  assert.equal(slugify('York R-350 Rower'), 'york-r-350-rower');
  assert.equal(slugify('Olympic A-Frame 2″ Weight Plate Tree'), 'olympic-a-frame-2-weight-plate-tree');
});

test('splitBullets strips markers and drops empties', () => {
  const raw = '* Adjustable Backrest – flat to 90°. * Built-In Storage – three rungs. ';
  assert.deepEqual(splitBullets(raw), ['Adjustable Backrest – flat to 90°.', 'Built-In Storage – three rungs.']);
  assert.deepEqual(splitBullets('- one\n- two\n'), ['one', 'two']);
});

test('splitSpecs splits on newline and " - " without label parsing', () => {
  assert.deepEqual(splitSpecs('Material: 12 gauge steel\nWeight Capacity: 500 lbs'),
    ['Material: 12 gauge steel', 'Weight Capacity: 500 lbs']);
  assert.deepEqual(splitSpecs('MSRP $160 - Selling $104 - Weight 38 lb'),
    ['MSRP $160', 'Selling $104', 'Weight 38 lb']);
});

test('escapeHtml', () => {
  assert.equal(escapeHtml('Tom & "Jerry" <b>'), 'Tom &amp; &quot;Jerry&quot; &lt;b&gt;');
});

test('formatPrice', () => {
  assert.equal(formatPrice(1999), '$1,999.00');
  assert.equal(formatPrice(104), '$104.00');
  assert.equal(formatPrice(null), 'Price TBD');
});
