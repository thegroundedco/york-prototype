// templates/index.js
import { renderSingle } from './single.js';
import { renderGeneric } from './generic.js';
import { renderPackage } from './package.js';

const RENDERERS = { single: renderSingle, generic: renderGeneric, package: renderPackage };

export function renderProduct(product) {
  const fn = RENDERERS[product.template];
  if (!fn) throw new Error(`Unknown template "${product.template}" for ${product.slug}`);
  return fn(product);
}
