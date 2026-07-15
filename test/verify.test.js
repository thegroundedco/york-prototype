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
