import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verify } from '../tools/verify.mjs';

test('verify flags a broken local link and a leftover token', () => {
  const dir = mkdtempSync(join(tmpdir(), 'york-v-'));
  writeFileSync(join(dir, 'a.html'), '<a href="missing.html">x</a> {{oops}}');
  const { errors } = verify(dir);
  assert.ok(errors.some((e) => e.includes('missing.html')));
  assert.ok(errors.some((e) => e.includes('token')));
});

test('verify flags a link to a retired template', () => {
  const dir = mkdtempSync(join(tmpdir(), 'york-v-'));
  writeFileSync(join(dir, 'a.html'), '<a href="product-generic.html">x</a>');
  const { errors } = verify(dir);
  assert.ok(errors.some((e) => e.includes('product-generic.html')));
});

test('verify passes a clean file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'york-v-'));
  writeFileSync(join(dir, 'a.html'), '<a href="a.html">self</a>');
  assert.deepEqual(verify(dir).errors, []);
});

test('verify flags a single-quoted broken link', () => {
  const dir = mkdtempSync(join(tmpdir(), 'york-v-'));
  writeFileSync(join(dir, 'a.html'), "<a href='missing.html'>x</a>");
  const { errors } = verify(dir);
  assert.ok(errors.some((e) => e.includes('missing.html')));
});

test('verify leaves external refs clean', () => {
  const dir = mkdtempSync(join(tmpdir(), 'york-v-'));
  writeFileSync(
    join(dir, 'a.html'),
    '<a href="tel:5551234">t</a>' +
      '<a href="#top">top</a>' +
      '<a href="mailto:a@b.com">m</a>' +
      '<img src="data:image/png;base64,xxx">' +
      '<script src="//cdn.example.com/x.js"></script>'
  );
  assert.deepEqual(verify(dir).errors, []);
});

test('verify strips fragment and query before checking existence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'york-v-'));
  writeFileSync(join(dir, 'a.html'), '<a href="a.html?x=1#y">self</a>');
  assert.deepEqual(verify(dir).errors, []);
});

test('verify does not flag data-* attributes as nav targets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'york-v-'));
  writeFileSync(join(dir, 'a.html'), '<div data-href="nope.html"></div>');
  assert.deepEqual(verify(dir).errors, []);
});
