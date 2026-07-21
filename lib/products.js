import { readFileSync } from 'node:fs';

export function loadProducts(path = 'data/products.json') {
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`${path}: expected a JSON array`);
  return data;
}

const TEMPLATES = new Set(['single', 'generic', 'package']);

export function validateProduct(p) {
  const e = [];
  if (!p || typeof p !== 'object') return ['product is not an object'];
  if (!/^[a-z0-9-]+$/.test(p.slug || '')) e.push(`slug invalid: ${JSON.stringify(p.slug)}`);
  if (!TEMPLATES.has(p.template)) e.push(`template invalid: ${JSON.stringify(p.template)}`);
  if (!p.name) e.push('name empty');
  if (!p.shortDescription) e.push('shortDescription empty');
  if (!p.categoryLabel) e.push('categoryLabel empty');
  if (p.price !== null) {
    if (!p.price || typeof p.price.current !== 'number') e.push('price.current must be a number or price must be null');
  }
  if (!p.category) e.push('category empty');           // breadcrumb builds plp-${category}.html
  if (!Array.isArray(p.specs)) e.push('specs must be an array');  // rendered by the specs modal in all templates
  const gallery = p.images && Array.isArray(p.images.gallery) ? p.images.gallery : [];
  if (gallery.length < 3) e.push(`images.gallery must have ≥3 entries (has ${gallery.length})`);
  // generic + package inject images.editorial as a raw <img src>; single uses a fixed asset.
  if ((p.template === 'generic' || p.template === 'package') && !(p.images && p.images.editorial)) {
    e.push('images.editorial required for generic/package templates');
  }
  if (p.relatedSlugs != null && !Array.isArray(p.relatedSlugs)) {
    e.push('relatedSlugs must be an array of strings');
  } else if (Array.isArray(p.relatedSlugs) && !p.relatedSlugs.every((s) => typeof s === 'string')) {
    e.push('relatedSlugs must be an array of strings');
  }
  if (p.variants && p.variants.type === 'weight-selector') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) {
      e.push('weight-selector variants.options must be a non-empty array');
    } else {
      opts.forEach((o, i) => {
        if (!o || !/\d+\s*lb/i.test(o.weight || '')) e.push(`weight-selector option ${i}: weight must look like "10 lb"`);
        if (typeof o?.price !== 'number' || !(o.price > 0)) e.push(`weight-selector option ${i}: price must be a positive number`);
      });
    }
  }
  if (p.variants && p.variants.type === 'set-or-individual') {
    if (!['bundle', 'individual'].includes(p.variants.default)) e.push('set-or-individual: default must be "bundle" or "individual"');
    if (typeof p.variants.bundleLabel !== 'string' || !p.variants.bundleLabel) e.push('set-or-individual: bundleLabel required');
    const b = p.variants.bundles, ind = p.variants.individual;
    if (!Array.isArray(b) || b.length === 0) e.push('set-or-individual: bundles must be a non-empty array');
    else b.forEach((o, i) => { if (!o?.label || typeof o.price !== 'number' || !(o.price > 0)) e.push(`set-or-individual bundle ${i}: label + positive price required`); });
    if (!Array.isArray(ind) || ind.length === 0) e.push('set-or-individual: individual must be a non-empty array');
    else ind.forEach((o, i) => { if (!/\d+(\.\d+)?\s*lb/i.test(o?.weight || '') || typeof o.price !== 'number' || !(o.price > 0)) e.push(`set-or-individual individual ${i}: weight + positive price required`); });
  }
  if (p.variants && p.variants.type === 'tier-selector') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) e.push('tier-selector: options must be a non-empty array');
    else opts.forEach((o, i) => {
      if (!o?.label) e.push(`tier-selector option ${i}: label required`);
      if (typeof o?.price !== 'number' || !(o.price > 0)) e.push(`tier-selector option ${i}: price must be a positive number`);
    });
  }
  if (p.variants && p.variants.type === 'package-selector') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) e.push('package-selector: options must be a non-empty array');
    else opts.forEach((o, i) => {
      if (!o?.label) e.push(`package-selector option ${i}: label required`);
      if (typeof o?.price !== 'number' || !(o.price > 0)) e.push(`package-selector option ${i}: price must be a positive number`);
      if (!Array.isArray(o?.included) || o.included.length === 0) e.push(`package-selector option ${i}: included must be a non-empty array`);
    });
  }
  if (p.variants && p.variants.type === 'accessories') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) e.push('accessories: options must be a non-empty array');
    else opts.forEach((o, i) => {
      if (!o?.label) e.push(`accessories option ${i}: label required`);
      if (typeof o?.price !== 'number' || !(o.price > 0)) e.push(`accessories option ${i}: price must be a positive number`);
      if (typeof o?.url !== 'string' || !/^https?:\/\//.test(o.url)) e.push(`accessories option ${i}: url must be an absolute link`);
    });
  }
  return e;
}
