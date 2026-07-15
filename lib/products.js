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
  const gallery = p.images && Array.isArray(p.images.gallery) ? p.images.gallery : [];
  if (gallery.length < 3) e.push(`images.gallery must have ≥3 entries (has ${gallery.length})`);
  if (p.relatedSlugs != null && !Array.isArray(p.relatedSlugs)) {
    e.push('relatedSlugs must be an array of strings');
  } else if (Array.isArray(p.relatedSlugs) && !p.relatedSlugs.every((s) => typeof s === 'string')) {
    e.push('relatedSlugs must be an array of strings');
  }
  return e;
}
