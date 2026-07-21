// Retarget product links to the real generated PDP pages.
//
// The site's nav (mega menu, mobile drawer) and some PLP/collection cards link
// to the three placeholder templates (product-single/generic/package.html) with
// the product's NAME as the anchor text. This rewrites each such link to the real
// <slug>.html when the anchor text confidently matches one of the 23 products.
//
// Matching is an EXACT (decoded) anchor-text lookup against a curated map — no
// fuzzy guessing. Placeholder cards ("Product Title …") and out-of-scope products
// (e.g. "Aspire 110 Rower", "Cast Iron Kettlebell Set") are intentionally left as
// they are and reported as unmatched, for review.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Decoded anchor text -> product slug. Curated from the actual link inventory.
export const LINK_MAP = {
  'Fitness Bench': 'york-fitness-bench',
  'FTS Power Cage': 'fts-power-cage',
  'Aspire 366 Stationary Bike Flywheel': 'york-aspire-366-stationary-bike',
  'R-350 Rower': 'york-r-350-rower',
  '300 Fan Bike': 'york-fb-300-fan-bike',
  'Resistance Bands': 'resistance-bands',
  'Plyo Package': 'plyo-package',
  'Kettlebells': 'kettlebells',
  'Rubber Training Bumper Plates': 'rubber-training-bumper-plates',
  'Rubber Hex Dumbbell Set': 'rubber-hex-dumbbell-set',
  'Quick Access Collar': 'york-quick-access-collar',
  'York Quick Access Collar': 'york-quick-access-collar',
  'Yoga Mat': 'york-yoga-mat',
  "Women's Elite Olympic Training Weight Bar": 'womens-elite-olympic-training-weight-bar',
  'Slam Ball': 'slam-ball',
  'Performance Package': 'york-performance-package',
  "Men's North American Chrome Olympic Training Weight Bar": 'mens-north-american-chrome-olympic-training-weight-bar',
  'Battle Rope': 'battle-rope',
  'Mini 2-Tier Dumbbell Stand': 'york-dumbbell-stand',
  '2 Tier Dumbbell Stand': 'york-dumbbell-stand',
  '3 Tier Dumbbell Stand': 'york-dumbbell-stand',
  'Mini Dumbbell Stand': 'york-dumbbell-stand',
  'Olympic Training Set: Plates + 44 lb (20 Kg)': 'essential-olympic-training-set',
  'Olympic Training Set: Plates + 33 lb (15 Kg)': 'essential-olympic-training-set',
  'Olympic Training Set: Plates + 44 lb Bar': 'essential-olympic-training-set',
};

// Out-of-scope products that still appear in the NAV chrome (not built as PDPs
// in this pass) → point at their category PLP so nav never dead-ends. Card-grid
// placeholders on the PLPs themselves are intentionally NOT covered here (deferred
// to the PLP pass); they keep their current target.
export const NAV_FALLBACK = {
  'Aspire 110 Rower': 'plp-cardio-conditioning',
};

const TEMPLATE_RE = /href="product-(?:single|generic|package)\.html"(\s*[^>]*)>([^<]+)<\/a>/g;

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

// Rewrite one HTML string. Returns { html, rewired: number, unmatched: string[] }.
export function rewrite(html) {
  let rewired = 0;
  const unmatched = new Set();
  const out = html.replace(TEMPLATE_RE, (full, attrs, text) => {
    const slug = LINK_MAP[decode(text)];
    if (slug) { rewired++; return `href="${slug}.html"${attrs}>${text}</a>`; }
    const nav = NAV_FALLBACK[decode(text)];
    if (nav) { rewired++; return `href="${nav}.html"${attrs}>${text}</a>`; }
    unmatched.add(decode(text));
    return full;
  });
  return { html: out, rewired, unmatched: [...unmatched] };
}

// CLI: rewrite templates/partials.js (chrome source) + all hand-authored root
// .html EXCEPT the generated <slug>.html (those get correct chrome on rebuild).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = '.';
  const slugs = new Set(Object.values(LINK_MAP));
  const generated = new Set([...slugs].map((s) => `${s}.html`));
  const targets = ['templates/partials.js',
    ...readdirSync(root).filter((f) => f.endsWith('.html') && !generated.has(f) && f !== 'index.html')];
  let total = 0;
  const allUnmatched = new Set();
  for (const f of targets) {
    const src = readFileSync(join(root, f), 'utf8');
    const { html, rewired, unmatched } = rewrite(src);
    if (rewired) writeFileSync(join(root, f), html, 'utf8');
    total += rewired;
    unmatched.forEach((u) => allUnmatched.add(u));
  }
  console.log(`Rewired ${total} links across ${targets.length} files.`);
  console.log(`Unmatched anchor texts (left as-is, review): ${allUnmatched.size}`);
  [...allUnmatched].sort().forEach((u) => console.log('  - ' + u));
}
