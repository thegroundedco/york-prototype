import { readFileSync } from 'node:fs';

// filterType -> sidebar label (title case) for the goal-page sub-filters.
export const FILTER_LABELS = {
  benches: 'Benches', cages: 'Cages', systems: 'Systems', bars: 'Bars',
  plates: 'Plates', dumbbells: 'Dumbbells', kettlebells: 'Kettlebells',
  collars: 'Collars', bikes: 'Bikes', rower: 'Rower', ropes: 'Ropes',
  balls: 'Balls', bands: 'Bands', mats: 'Mats', storage: 'Storage', floor: 'Floor',
};

export function loadMerchandising(path = 'data/merchandising.json') {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// entry: a slug string OR { slug, label }. bySlug: Map<slug, product>.
// Returns the resolved card shape consumed by the card renderers. The label
// override changes only the displayed name — image/price/href come from the
// base product, so several tier/"…Sets" cards can share one PDP.
export function resolveEntry(entry, bySlug) {
  const slug = typeof entry === 'string' ? entry : entry.slug;
  const p = bySlug.get(slug);
  if (!p) throw new Error(`resolveEntry: unknown slug "${slug}"`);
  const label = typeof entry === 'object' && entry.label ? entry.label : p.name;
  return {
    slug,
    href: `${slug}.html`,
    name: label,
    image: p.images?.gallery?.[0] || '',
    price: p.price || null,
    filterType: p.filterType || '',
  };
}
