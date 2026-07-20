# York PLP / Collection / Goal Linking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate every placeholder product-listing card (5 category PLPs, 3 new collection pages, Shop All, 3 goal pages) with real products linked to their `<slug>.html`, driven from the new sheet taxonomy.

**Architecture:** A new `data/merchandising.json` holds ordered product lists per collection and per goal-subsection (resolved to real slugs). A dev-time injector (`tools/inject-grids.mjs`) rewrites *only* the cards inside each grid container via a tested, zero-dep balanced-tag string helper (`lib/html-inject.js`), leaving bespoke heroes/editorial/filters intact. Card HTML comes from two renderers added beside the existing `recCardHtml`. Site stays build-step-free (committed static HTML).

**Tech Stack:** Node ESM, zero runtime deps, `node --test`. Matches the existing `tools/build-products.mjs` + `templates/` + `lib/` pipeline.

## Global Constraints

- **Zero dependencies.** No npm packages; `node --test` only. (Repo has no `node_modules` runtime deps.)
- **No build step for the site.** The injector is a dev tool; its output is committed static HTML served by `npx serve .`.
- **Source of truth = the spec's Appendices.** Membership/counts: `docs/superpowers/specs/2026-07-20-york-plp-collection-goal-linking-design.md` App. A; name→slug + filterType: App. B. Do not re-derive from the sheet.
- **Card image** = `product.images.gallery[0]`. **CTA** keeps `href="#cart"`. The **title link** carries the product href (`<slug>.html`).
- **Text case:** ALL CAPS display/heading, sentence case body, title case labels (repo `CLAUDE.md`).
- **Preserve working filters** (PLP `data-plp-filters`; goal `data-collection-*` sub-filters) — no regression.
- **Branch:** `plp-collection-linking` (already created; spec committed there @ `22d44de`). Commit after every task.
- **Push workaround if a commit/push hangs:** `git -c credential.helper="!gh auth git-credential" push`.

---

## File structure

| File | Responsibility |
|---|---|
| `data/merchandising.json` | **new** — ordered slug/label lists per collection + goal section; `shopAll` config. |
| `data/products.json` | **modify** — add `filterType` to each of 23 products. |
| `lib/merchandising.js` | **new** — `loadMerchandising`, `resolveEntry`, `FILTER_LABELS`. |
| `lib/html-inject.js` | **new** — `replaceEachInner` (balanced-tag inner replace), `replaceCount`. |
| `templates/shared.js` | **modify** — add `plpCardHtml`, `collectionCardHtml`. |
| `tools/inject-grids.mjs` | **new** — orchestration: per page family, render cards + inject + update filters/counts. CLI. |
| `tools/inject-grids.test.mjs` | **new** — unit tests for helpers, renderers, injector families. |
| `tools/verify.mjs` | **modify** — assert no placeholder hrefs, all hrefs resolve, counts match, filterType present. |
| `plp-systems.html`, `plp-recovery-mobility.html`, `plp-essentials.html` | **new** — cloned from `plp-accessories.html`. |
| `package.json` | **modify** — add `"grids"` script. |

---

## Task 1: Merchandising data + `filterType`

**Files:**
- Create: `data/merchandising.json`
- Modify: `data/products.json` (add `filterType` to all 23 products)
- Create: `lib/merchandising.js`
- Test: `tools/inject-grids.test.mjs`

**Interfaces:**
- Produces: `loadMerchandising(path) -> { collections, shopAll, goals }`;
  `resolveEntry(entry, bySlug) -> { slug, href, name, image, price, filterType }` where `entry` is a slug string or `{ slug, label }`;
  `FILTER_LABELS: Record<filterType,string>`.

- [ ] **Step 1: Write `data/merchandising.json`** (exact content):

```json
{
  "collections": {
    "racks-benches": { "page": "plp-racks-benches.html", "label": "Racks & Benches", "products": ["york-fitness-bench", "fts-flat-to-incline-utility-bench", "fts-power-cage", "york-performance-package"] },
    "bars-weights": { "page": "plp-bars-weights.html", "label": "Bars & Weights", "products": ["mens-north-american-chrome-olympic-training-weight-bar", "womens-elite-olympic-training-weight-bar", "rubber-training-bumper-plates", "rubber-hex-dumbbell-set", { "slug": "vinyl-fitbell", "label": "Neoprene Hex Dumbbells" }, "kettlebells", "york-quick-access-collar", "essential-olympic-training-set", "york-performance-package"] },
    "cardio-conditioning": { "page": "plp-cardio-conditioning.html", "label": "Cardio & Conditioning", "products": ["york-aspire-366-stationary-bike", "york-r-350-rower", "york-fb-300-fan-bike", "battle-rope", "slam-ball", "resistance-bands", "plyo-package"] },
    "accessories": { "page": "plp-accessories.html", "label": "Accessories", "products": ["resistance-bands", "york-yoga-mat", "york-quick-access-collar", "floor-guards-pack-of-4"] },
    "storage": { "page": "plp-storage.html", "label": "Storage", "products": [{ "slug": "york-dumbbell-stand", "label": "Mini 2-Tier Dumbbell Stand" }, { "slug": "york-dumbbell-stand", "label": "2-Tier Dumbbell Stand" }, { "slug": "york-dumbbell-stand", "label": "3-Tier Dumbbell Stand" }, "olympic-a-frame-weight-plate-tree"] },
    "systems": { "page": "plp-systems.html", "label": "Systems", "new": true, "products": ["essential-olympic-training-set", "york-performance-package", "plyo-package", { "slug": "rubber-hex-dumbbell-set", "label": "Rubber Hex Dumbbell Sets" }, { "slug": "resistance-bands", "label": "Resistance Band Sets" }, { "slug": "slam-ball", "label": "Slam Ball Sets" }, { "slug": "kettlebells", "label": "Kettlebell Packages" }] },
    "recovery-mobility": { "page": "plp-recovery-mobility.html", "label": "Recovery & Mobility", "new": true, "products": ["resistance-bands", "york-yoga-mat", "kettlebells", "floor-guards-pack-of-4", "plyo-package"] },
    "essentials": { "page": "plp-essentials.html", "label": "Essentials", "new": true, "products": ["york-performance-package", "essential-olympic-training-set", "rubber-hex-dumbbell-set", "resistance-bands", "york-aspire-366-stationary-bike", "york-r-350-rower", "kettlebells", "york-yoga-mat", "floor-guards-pack-of-4"] }
  },
  "shopAll": { "page": "plp-equipment.html", "groupBy": "category" },
  "goals": {
    "beginners": { "page": "beginners-collection.html", "sections": [
      { "products": [{ "slug": "vinyl-fitbell", "label": "Neoprene Hex Dumbbells" }, "york-fitness-bench", "resistance-bands", "rubber-hex-dumbbell-set", "kettlebells", "fts-flat-to-incline-utility-bench", "mens-north-american-chrome-olympic-training-weight-bar", "womens-elite-olympic-training-weight-bar", "rubber-training-bumper-plates", "york-quick-access-collar", "essential-olympic-training-set", "fts-power-cage"] },
      { "products": ["york-aspire-366-stationary-bike", "york-r-350-rower", "battle-rope", "slam-ball", "resistance-bands", "plyo-package"] },
      { "products": ["york-yoga-mat", "resistance-bands", "kettlebells", "floor-guards-pack-of-4", "plyo-package"] }
    ] },
    "muscle-maintenance": { "page": "muscle-maintenance.html", "sections": [
      { "products": ["york-performance-package", "fts-power-cage", "fts-flat-to-incline-utility-bench", "mens-north-american-chrome-olympic-training-weight-bar", "womens-elite-olympic-training-weight-bar", "rubber-training-bumper-plates", "york-quick-access-collar", "rubber-hex-dumbbell-set", "kettlebells", "olympic-a-frame-weight-plate-tree"] },
      { "products": ["york-r-350-rower", "york-aspire-366-stationary-bike", "york-fb-300-fan-bike", "battle-rope", "slam-ball", "resistance-bands", "plyo-package"] },
      { "products": ["resistance-bands", "york-yoga-mat", "kettlebells", "plyo-package", "floor-guards-pack-of-4"] }
    ] },
    "longevity": { "page": "longevity-collection.html", "sections": [
      { "products": ["york-performance-package", "fts-flat-to-incline-utility-bench", "rubber-hex-dumbbell-set", "kettlebells", "mens-north-american-chrome-olympic-training-weight-bar", "womens-elite-olympic-training-weight-bar", "rubber-training-bumper-plates", "york-quick-access-collar"] },
      { "products": ["york-aspire-366-stationary-bike", "york-r-350-rower", "york-fb-300-fan-bike", "battle-rope", "plyo-package"] },
      { "products": ["kettlebells", "resistance-bands", "york-yoga-mat", "slam-ball", "plyo-package", "floor-guards-pack-of-4"] }
    ] }
  }
}
```

- [ ] **Step 2: Add `filterType` to every product in `data/products.json`.** For each product object add one field per this map (App. B):

```
york-fitness-bench: benches            fts-flat-to-incline-utility-bench: benches
fts-power-cage: cages                  york-performance-package: systems
mens-north-american-chrome-olympic-training-weight-bar: bars
womens-elite-olympic-training-weight-bar: bars
rubber-training-bumper-plates: plates  rubber-hex-dumbbell-set: dumbbells
vinyl-fitbell: dumbbells               kettlebells: kettlebells
york-quick-access-collar: collars      essential-olympic-training-set: systems
york-aspire-366-stationary-bike: bikes york-r-350-rower: rower
york-fb-300-fan-bike: bikes            battle-rope: ropes
slam-ball: balls                       resistance-bands: bands
plyo-package: systems                  york-yoga-mat: mats
floor-guards-pack-of-4: floor          york-dumbbell-stand: storage
olympic-a-frame-weight-plate-tree: storage
```

- [ ] **Step 3: Write `lib/merchandising.js`:**

```js
import { readFileSync } from 'node:fs';

export const FILTER_LABELS = {
  benches: 'Benches', cages: 'Cages', systems: 'Systems', bars: 'Bars',
  plates: 'Plates', dumbbells: 'Dumbbells', kettlebells: 'Kettlebells',
  collars: 'Collars', bikes: 'Bikes', rower: 'Rower', ropes: 'Ropes',
  balls: 'Balls', bands: 'Bands', mats: 'Mats', storage: 'Storage', floor: 'Floor',
};

export function loadMerchandising(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// entry: a slug string OR { slug, label }. bySlug: Map<slug, product>.
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
```

- [ ] **Step 4: Write the failing data test** in `tools/inject-grids.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts } from '../lib/products.js';
import { loadMerchandising, resolveEntry } from '../lib/merchandising.js';

const products = loadProducts('data/products.json');
const bySlug = new Map(products.map((p) => [p.slug, p]));
const merch = loadMerchandising('data/merchandising.json');

test('every product has a filterType', () => {
  for (const p of products) assert.ok(p.filterType, `${p.slug} missing filterType`);
});

test('every merchandising slug resolves to a real product', () => {
  const entries = [
    ...Object.values(merch.collections).flatMap((c) => c.products),
    ...Object.values(merch.goals).flatMap((g) => g.sections.flatMap((s) => s.products)),
  ];
  for (const e of entries) assert.doesNotThrow(() => resolveEntry(e, bySlug));
});

test('resolveEntry applies label override but resolves image/price from base slug', () => {
  const r = resolveEntry({ slug: 'vinyl-fitbell', label: 'Neoprene Hex Dumbbells' }, bySlug);
  assert.equal(r.name, 'Neoprene Hex Dumbbells');
  assert.equal(r.href, 'vinyl-fitbell.html');
  assert.ok(r.image.includes('vinyl-fitbell'));
});

test('collection card counts match the spec (App. A)', () => {
  const counts = Object.fromEntries(
    Object.entries(merch.collections).map(([k, c]) => [k, c.products.length]));
  assert.deepEqual(counts, {
    'racks-benches': 4, 'bars-weights': 9, 'cardio-conditioning': 7, 'accessories': 4,
    'storage': 4, 'systems': 7, 'recovery-mobility': 5, 'essentials': 9,
  });
});
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test`
Expected: the 4 new tests PASS alongside the existing suite.

- [ ] **Step 6: Commit**

```bash
git add data/merchandising.json data/products.json lib/merchandising.js tools/inject-grids.test.mjs
git commit -m "feat: merchandising data model + filterType tags"
```

---

## Task 2: Card renderers

**Files:**
- Modify: `templates/shared.js` (add two exports beside `recCardHtml`)
- Test: `tools/inject-grids.test.mjs`

**Interfaces:**
- Consumes: resolved card `{ href, name, image, price, filterType }` from `resolveEntry`.
- Produces: `plpCardHtml(card) -> string` (`.plp__card` markup); `collectionCardHtml(card) -> string` (`.collections-product-card` markup incl. `data-collection-card-category`).

- [ ] **Step 1: Write failing tests** (append to `tools/inject-grids.test.mjs`):

```js
import { plpCardHtml, collectionCardHtml } from '../templates/shared.js';

const sale = { href: 'slam-ball.html', name: 'Slam Ball', image: 'a.jpg', price: { current: 40, compareAt: 60 }, filterType: 'balls' };
const plain = { href: 'kettlebells.html', name: 'Kettlebells', image: 'k.jpg', price: { current: 80 }, filterType: 'kettlebells' };

test('plpCardHtml links title to the PDP and shows a sale badge + strikethrough', () => {
  const h = plpCardHtml(sale);
  assert.match(h, /class="plp__card"/);
  assert.match(h, /href="slam-ball\.html"[^>]*>Slam Ball</);
  assert.match(h, /plp__card-badge">Sale/);
  assert.match(h, /plp__card-price--original">\$60/);
});

test('collectionCardHtml tags the card with its filterType', () => {
  const h = collectionCardHtml(plain);
  assert.match(h, /data-collection-card-category="kettlebells"/);
  assert.match(h, /href="kettlebells\.html"[^>]*>Kettlebells</);
  assert.doesNotMatch(h, /badge">Sale/); // no compareAt -> no sale badge
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL — `plpCardHtml`/`collectionCardHtml` not exported.

- [ ] **Step 3: Implement in `templates/shared.js`.** Reuse the existing `escapeHtml` and `formatPrice` already in that file. Add:

```js
// Shared price fragment for listing cards: strikethrough compareAt + current.
function cardPrices(price, cls) {
  if (!price) return `<span class="${cls}">Price TBD</span>`;
  const sale = price.compareAt
    ? `<span class="${cls} ${cls}--original">${formatPrice(price.compareAt)}</span>`
    : '';
  const current = price.compareAt
    ? `<span class="${cls} ${cls}--sale">${formatPrice(price.current)}</span>`
    : `<span class="${cls}">${formatPrice(price.current)}</span>`;
  return `${current}${sale}`;
}

export function plpCardHtml({ href, name, image, price }) {
  const badge = price?.compareAt ? `\n            <span class="plp__card-badge">Sale</span>` : '';
  return `        <article class="plp__card">
          <div class="plp__card-image">
            <img src="${image}" alt="">${badge}
          </div>
          <h3 class="plp__card-title"><a class="plp__card-title-link" href="${href}">${escapeHtml(name)}</a></h3>
          <div class="plp__card-prices">${cardPrices(price, 'plp__card-price')}</div>
          <a class="btn btn--primary plp__card-cta" href="#cart">Add To Cart</a>
        </article>`;
}

export function collectionCardHtml({ href, name, image, price, filterType }) {
  const badge = price?.compareAt ? `\n            <span class="collections-product-card__badge">Sale</span>` : '';
  return `        <article class="collections-product-card" data-collection-card-category="${filterType}">
          <div class="collections-product-card__media">
            <img class="collections-product-card__image" src="${image}" alt="${escapeHtml(name)}">${badge}
          </div>
          <div class="collections-product-card__body">
            <h4 class="collections-product-card__title"><a class="collections-product-card__title-link" href="${href}">${escapeHtml(name)}</a></h4>
            <div class="collections-product-card__prices">${cardPrices(price, 'collections-product-card__price')}</div>
            <a class="btn btn--primary collections-product-card__cta" href="#cart">Add To Cart</a>
          </div>
        </article>`;
}
```

> Note: confirm `escapeHtml` and `formatPrice` are exported/available in `shared.js` (they back `recCardHtml`/`priceRow`). If `formatPrice` is not module-scope-visible, hoist it — do not duplicate.

- [ ] **Step 4: Run, verify pass** — `npm test` → the 2 new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add templates/shared.js tools/inject-grids.test.mjs
git commit -m "feat: plp + collection listing-card renderers"
```

---

## Task 3: Balanced-tag inner-replace helper

**Files:**
- Create: `lib/html-inject.js`
- Test: `tools/inject-grids.test.mjs`

**Interfaces:**
- Produces: `replaceEachInner(html, openRe, newInners, tag='div') -> string` — replaces the inner HTML of the i-th element matching `openRe` with `newInners[i]`, balanced on `tag`. Throws if fewer than `newInners.length` containers are found or a container is unbalanced.
  `replaceCount(html, re, replacement) -> string` — single regex replace with a required-match assertion.

- [ ] **Step 1: Write failing tests** (append):

```js
import { replaceEachInner, replaceCount } from '../lib/html-inject.js';

test('replaceEachInner swaps inner of one container, keeps surroundings', () => {
  const html = `<x><div class="grid">\n  <article>OLD</article>\n</div><y>`;
  const out = replaceEachInner(html, /<div class="grid">/, ['NEW']);
  assert.equal(out, `<x><div class="grid">NEW</div><y>`);
});

test('replaceEachInner handles nested same-tag children', () => {
  const html = `<div class="grid"><article><div class="card"><div>x</div></div></article></div>`;
  const out = replaceEachInner(html, /<div class="grid">/, ['Z']);
  assert.equal(out, `<div class="grid">Z</div>`);
});

test('replaceEachInner replaces N containers left-to-right', () => {
  const html = `<section><div class="g">A</div></section><section><div class="g">B</div></section>`;
  const out = replaceEachInner(html, /<div class="g">/, ['1', '2']);
  assert.equal(out, `<section><div class="g">1</div></section><section><div class="g">2</div></section>`);
});

test('replaceEachInner is idempotent when fed identical new inner', () => {
  const html = `<div class="g"><article>OLD</article></div>`;
  const once = replaceEachInner(html, /<div class="g">/, ['<article>NEW</article>']);
  const twice = replaceEachInner(once, /<div class="g">/, ['<article>NEW</article>']);
  assert.equal(once, twice);
});

test('replaceEachInner throws when a container is missing', () => {
  assert.throws(() => replaceEachInner('<div class="g">x</div>', /<div class="g">/, ['a', 'b']));
});

test('replaceCount asserts a match exists', () => {
  assert.equal(replaceCount('<p class="c">Showing all 12 results</p>', /Showing all \d+ results/, 'Showing all 4 results'),
    '<p class="c">Showing all 4 results</p>');
  assert.throws(() => replaceCount('<p>none</p>', /Showing all \d+ results/, 'x'));
});
```

- [ ] **Step 2: Run, verify fail** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/html-inject.js`:**

```js
// Zero-dep HTML surgery for the grid injector. Operates on strings, not a DOM.

// Replace the inner HTML of the i-th element matching `openRe` with `newInners[i]`.
// `tag` is the element's tag name; nested same-tag children are balanced correctly.
export function replaceEachInner(html, openRe, newInners, tag = 'div') {
  const re = new RegExp(openRe.source, openRe.flags.includes('g') ? openRe.flags : openRe.flags + 'g');
  let out = '';
  let cursor = 0; // chars of `html` already copied into `out`
  let i = 0;
  let m;
  while (i < newInners.length && (m = re.exec(html))) {
    const innerStart = m.index + m[0].length;
    const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
    token.lastIndex = innerStart;
    let depth = 1, t, innerEnd = -1;
    while ((t = token.exec(html))) {
      depth += t[1] === '/' ? -1 : 1;
      if (depth === 0) { innerEnd = t.index; break; }
    }
    if (innerEnd === -1) throw new Error(`replaceEachInner: unbalanced <${tag}>`);
    out += html.slice(cursor, innerStart) + newInners[i];
    cursor = innerEnd;
    re.lastIndex = innerEnd;
    i++;
  }
  if (i < newInners.length) {
    throw new Error(`replaceEachInner: expected ${newInners.length} <${tag}> containers, found ${i}`);
  }
  return out + html.slice(cursor);
}

// Single required replace — throws if the pattern is not present (guards against
// silently-missed count/label updates).
export function replaceCount(html, re, replacement) {
  if (!re.test(html)) throw new Error(`replaceCount: pattern not found: ${re}`);
  return html.replace(re, replacement);
}
```

- [ ] **Step 4: Run, verify pass** — `npm test` → all 6 new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/html-inject.js tools/inject-grids.test.mjs
git commit -m "feat: balanced-tag inner-replace helper for grid injection"
```

---

## Task 4: Injector — single-category PLPs (5 pages)

**Files:**
- Create: `tools/inject-grids.mjs`
- Modify: `package.json` (add `"grids"` script)
- Test: `tools/inject-grids.test.mjs`

**Interfaces:**
- Produces: `injectSingleCatPlp(html, cards, count) -> string` — replaces the `.plp-category__grid` inner with `cards` and rewrites the "Showing all N results" count. `cards` is pre-rendered card HTML (joined). Used by the CLI for the 5 single-category collections.

- [ ] **Step 1: Write failing test** (append):

```js
import { injectSingleCatPlp } from '../tools/inject-grids.mjs';

test('injectSingleCatPlp swaps cards and updates the count', () => {
  const html = `<div class="plp-category__toolbar"><p class="plp-category__count">Showing all 12 results</p></div>
<div class="plp-category__grid">
  <article class="plp__card">OLD</article>
</div>`;
  const out = injectSingleCatPlp(html, `        <article class="plp__card">NEW</article>`, 4);
  assert.match(out, /Showing all 4 results/);
  assert.match(out, /plp__card">NEW/);
  assert.doesNotMatch(out, /plp__card">OLD/);
});
```

- [ ] **Step 2: Run, verify fail** — `npm test` → FAIL (no export).

- [ ] **Step 3: Implement `tools/inject-grids.mjs`** (start the file; later tasks extend it):

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadProducts } from '../lib/products.js';
import { loadMerchandising, resolveEntry, FILTER_LABELS } from '../lib/merchandising.js';
import { plpCardHtml, collectionCardHtml } from '../templates/shared.js';
import { replaceEachInner, replaceCount } from '../lib/html-inject.js';

export function injectSingleCatPlp(html, cards, count) {
  let out = replaceEachInner(html, /<div class="plp-category__grid">/, [`\n${cards}\n      `]);
  out = replaceCount(out, /Showing all \d+ results/, `Showing all ${count} results`);
  return out;
}

// --- CLI ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const products = loadProducts('data/products.json');
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const merch = loadMerchandising('data/merchandising.json');
  const SINGLE_CAT = ['racks-benches', 'bars-weights', 'cardio-conditioning', 'accessories', 'storage'];
  let touched = 0;
  for (const key of SINGLE_CAT) {
    const c = merch.collections[key];
    const cards = c.products.map((e) => plpCardHtml(resolveEntry(e, bySlug))).join('\n');
    const html = readFileSync(c.page, 'utf8');
    writeFileSync(c.page, injectSingleCatPlp(html, cards, c.products.length), 'utf8');
    touched++;
    console.log(`  ${c.page}: ${c.products.length} cards`);
  }
  console.log(`Injected single-category PLPs: ${touched}`);
}
```

- [ ] **Step 4: Run, verify unit test passes** — `npm test` → PASS.

- [ ] **Step 5: Add the `grids` script** to `package.json` scripts: `"grids": "node tools/inject-grids.mjs",`

- [ ] **Step 6: Run the injector for real, then verify no placeholders remain on the 5 pages**

```bash
npm run grids
grep -l 'product-\(single\|generic\|package\)\.html' plp-racks-benches.html plp-bars-weights.html plp-cardio-conditioning.html plp-accessories.html plp-storage.html || echo "CLEAN: no placeholder hrefs"
```
Expected: `CLEAN: no placeholder hrefs`. Spot-check one file's grid shows real slugs + names.

- [ ] **Step 7: Commit**

```bash
git add tools/inject-grids.mjs package.json tools/inject-grids.test.mjs plp-racks-benches.html plp-bars-weights.html plp-cardio-conditioning.html plp-accessories.html plp-storage.html
git commit -m "feat: populate the 5 category PLPs from merchandising data"
```

**REVIEW CHECKPOINT** — show Adam the 5 populated PLPs before continuing.

---

## Task 5: New collection pages (Systems, Recovery & Mobility, Essentials)

**Files:**
- Create: `plp-systems.html`, `plp-recovery-mobility.html`, `plp-essentials.html` (clones of `plp-accessories.html`)
- Modify: `tools/inject-grids.mjs` (add the 3 keys to the single-cat loop)

- [ ] **Step 1: Clone `plp-accessories.html` to each new file.** For each clone, edit exactly these, leaving everything else (chrome, hero shell, toolbar) intact:
  - `<title>…</title>` → `Systems | York Barbell` / `Recovery & Mobility | York Barbell` / `Essentials | York Barbell`
  - breadcrumb final crumb text (`<span aria-current="page">…`) → `Systems` / `Recovery & Mobility` / `Essentials`
  - `<h1 class="plp__title …">…</h1>` → same label
  - `<section class="plp__container" aria-label="…">` → matching label
  - Hero/intro copy blocks that mention "Accessories": replace with a one-line description (placeholder-quality; flagged for Adam). Systems: "Complete, ready-to-train packages." Recovery & Mobility: "Recover well, move better, train longer." Essentials: "The core of a York home gym."

- [ ] **Step 2: Extend the CLI loop** in `tools/inject-grids.mjs` — change the `SINGLE_CAT` array to include the new keys:

```js
const SINGLE_CAT = ['racks-benches', 'bars-weights', 'cardio-conditioning', 'accessories', 'storage',
  'systems', 'recovery-mobility', 'essentials'];
```

- [ ] **Step 3: Run + verify**

```bash
npm run grids
grep -l 'product-\(single\|generic\|package\)\.html' plp-systems.html plp-recovery-mobility.html plp-essentials.html || echo "CLEAN"
```
Expected: `CLEAN`; each new page shows its card list (7 / 5 / 9).

- [ ] **Step 4: Commit**

```bash
git add plp-systems.html plp-recovery-mobility.html plp-essentials.html tools/inject-grids.mjs
git commit -m "feat: add + populate 3 new collection pages (Systems, Recovery & Mobility, Essentials)"
```

**REVIEW CHECKPOINT.**

---

## Task 6: Shop All (`plp-equipment.html`)

**Files:**
- Modify: `tools/inject-grids.mjs` (add `injectShopAll`)
- Test: `tools/inject-grids.test.mjs`

**Interfaces:**
- Produces: `injectShopAll(html, sectionCardsByCat) -> string` — replaces each `[data-plp-category="<cat>"]` section's `.plp__grid` inner with its cards; rewrites each section count if present.

**Context:** `plp-equipment.html` has 5 `data-plp-category` sections (`racks-benches`, `bars-weights`, `cardio`, `accessories`, `storage`). The `cardio` section uses `data-plp-category="cardio"` (note: short name). Products are grouped by their primary `category` field. The 3 packages (`category: equipment`) have no section — **skip them in this task** and note the gap (full re-section is deferred with the nav, per spec §6/§9.5).

- [ ] **Step 1: Write failing test** (append):

```js
import { injectShopAll } from '../tools/inject-grids.mjs';

test('injectShopAll fills each category section grid in document order', () => {
  const html = `<section data-plp-category="racks-benches"><div class="plp__grid"><article>OLD</article></div></section>
<section data-plp-category="storage"><div class="plp__grid"><article>OLD</article></div></section>`;
  const out = injectShopAll(html, [
    { attr: 'racks-benches', cards: '<article>RB</article>' },
    { attr: 'storage', cards: '<article>ST</article>' },
  ]);
  assert.match(out, /data-plp-category="racks-benches"><div class="plp__grid"><article>RB/);
  assert.match(out, /data-plp-category="storage"><div class="plp__grid"><article>ST/);
});
```

- [ ] **Step 2: Run, verify fail** — `npm test`.

- [ ] **Step 3: Implement `injectShopAll`** in `tools/inject-grids.mjs` and wire it into the CLI. The category field → section attr map: `racks-benches→racks-benches`, `bars-weights→bars-weights`, `cardio-conditioning→cardio`, `accessories→accessories`, `storage→storage`.

```js
export function injectShopAll(html, sections) {
  let out = html;
  for (const { attr, cards } of sections) {
    const openRe = new RegExp(`<section[^>]*data-plp-category="${attr}"[^>]*>[\\s\\S]*?<div class="plp__grid">`);
    out = replaceEachInner(out, openRe, [cards]);
  }
  return out;
}
```

Add to the CLI (after the single-cat loop):

```js
  // Shop All — group all products by primary category into the existing sections.
  const CAT_TO_ATTR = { 'racks-benches': 'racks-benches', 'bars-weights': 'bars-weights',
    'cardio-conditioning': 'cardio', 'accessories': 'accessories', 'storage': 'storage' };
  const byCat = {};
  for (const p of products) {
    const attr = CAT_TO_ATTR[p.category];
    if (!attr) continue; // packages (category: equipment) skipped — deferred with nav
    (byCat[attr] ||= []).push(`        ${plpCardHtml(resolveEntry(p.slug, bySlug))}`);
  }
  const shopAllHtml = readFileSync(merch.shopAll.page, 'utf8');
  const sections = Object.entries(byCat).map(([attr, cards]) => ({ attr, cards: `\n${cards.join('\n')}\n          ` }));
  writeFileSync(merch.shopAll.page, injectShopAll(shopAllHtml, sections), 'utf8');
  console.log(`Shop All: ${sections.length} sections populated (packages deferred)`);
```

- [ ] **Step 4: Run, verify** — `npm test` (unit PASS); `npm run grids`; confirm `plp-equipment.html` has no placeholder hrefs in the 5 sections:

```bash
grep -c 'product-\(single\|generic\|package\)\.html' plp-equipment.html
```
Expected: only the count for the (untouched) packages section area, if any — note it. Spot-check the 5 sections show real slugs.

- [ ] **Step 5: Commit**

```bash
git add tools/inject-grids.mjs tools/inject-grids.test.mjs plp-equipment.html
git commit -m "feat: populate Shop All category sections from products.json"
```

**REVIEW CHECKPOINT.**

---

## Task 7: Goal pages + sub-filter rebuild (3 pages)

**Files:**
- Modify: `tools/inject-grids.mjs` (add `injectGoal`)
- Test: `tools/inject-grids.test.mjs`

**Interfaces:**
- Produces: `injectGoal(html, sections) -> string` where `sections` is a length-3 array of `{ cards, subcats }`; replaces each `[data-collection-products]` section's `…__products-grid` inner with `cards` and its `…__products-subcats` `<ul>` inner with `subcats`.

**Context:** each goal page has 3 `data-collection-products` sections in document order (Strength / Cardio / Mobility). Each section holds a `…__products-sidebar` with a `<ul class="…__products-subcats">` of filter links and a `…__products-grid`. The BEM prefix differs per page (`collections-beginner__`, `collections-muscle__`, `collections-longevity__`) — match on the stable substrings `__products-grid` and `__products-subcats`, not the prefix.

- [ ] **Step 1: Write failing test** (append):

```js
import { injectGoal, subcatsHtml } from '../tools/inject-grids.mjs';

test('subcatsHtml lists distinct filterTypes in first-seen order with labels', () => {
  const cards = [{ filterType: 'bars' }, { filterType: 'plates' }, { filterType: 'bars' }];
  const html = subcatsHtml(cards);
  assert.match(html, /data-collection-filter="bars"[^>]*>Bars</);
  assert.match(html, /data-collection-filter="plates"[^>]*>Plates</);
  assert.equal((html.match(/<li>/g) || []).length, 2); // deduped
});

test('injectGoal fills all three section grids + subcat lists', () => {
  const sec = (n) => `<section data-collection-products><div class="x__products-sidebar"><ul class="x__products-subcats"><li>OLD</li></ul></div><div class="x__products-grid"><article>OLD${n}</article></div></section>`;
  const html = sec(1) + sec(2) + sec(3);
  const out = injectGoal(html, [
    { cards: '<article>A</article>', subcats: '<li>a</li>' },
    { cards: '<article>B</article>', subcats: '<li>b</li>' },
    { cards: '<article>C</article>', subcats: '<li>c</li>' },
  ]);
  assert.match(out, /x__products-grid"><article>A/);
  assert.match(out, /x__products-grid"><article>C/);
  assert.doesNotMatch(out, /OLD/);
});
```

- [ ] **Step 2: Run, verify fail** — `npm test`.

- [ ] **Step 3: Implement `injectGoal` + `subcatsHtml`** in `tools/inject-grids.mjs`:

```js
export function subcatsHtml(cards) {
  const seen = [];
  for (const c of cards) if (c.filterType && !seen.includes(c.filterType)) seen.push(c.filterType);
  return seen.map((t) =>
    `          <li><a href="#${t}" data-collection-filter="${t}">${FILTER_LABELS[t] || t}</a></li>`
  ).join('\n');
}

export function injectGoal(html, sections) {
  // Replace all three grids (in order), then all three subcat lists (in order).
  let out = replaceEachInner(html, /<div class="[^"]*__products-grid">/, sections.map((s) => s.cards));
  out = replaceEachInner(out, /<ul class="[^"]*__products-subcats"[^>]*>/, sections.map((s) => s.subcats), 'ul');
  return out;
}
```

Wire into the CLI (after Shop All):

```js
  for (const [key, goal] of Object.entries(merch.goals)) {
    const html2 = readFileSync(goal.page, 'utf8');
    const sections = goal.sections.map((sec) => {
      const resolved = sec.products.map((e) => resolveEntry(e, bySlug));
      const cards = resolved.map((c) => collectionCardHtml(c)).join('\n');
      return { cards: `\n${cards}\n      `, subcats: `\n${subcatsHtml(resolved)}\n        ` };
    });
    if (sections.length !== 3) throw new Error(`${goal.page}: expected 3 sections, got ${sections.length}`);
    writeFileSync(goal.page, injectGoal(html2, sections), 'utf8');
    console.log(`  ${goal.page}: ${goal.sections.map((s) => s.products.length).join('/')} cards`);
  }
```

- [ ] **Step 4: Run, verify** — `npm test` (unit PASS); `npm run grids`; then:

```bash
grep -l 'product-\(single\|generic\|package\)\.html' beginners-collection.html muscle-maintenance.html longevity-collection.html || echo "CLEAN"
```
Expected: `CLEAN`. Spot-check one goal page: 3 sections populated, sub-filter links match the products present.

- [ ] **Step 5: Commit**

```bash
git add tools/inject-grids.mjs tools/inject-grids.test.mjs beginners-collection.html muscle-maintenance.html longevity-collection.html
git commit -m "feat: populate 3 goal pages + rebuild sub-filters from data"
```

**REVIEW CHECKPOINT.**

---

## Task 8: Verify extension, walkthrough, finish

**Files:**
- Modify: `tools/verify.mjs`

- [ ] **Step 1: Extend `tools/verify.mjs`** to add these checks over the 12 in-scope pages (read the file first to match its existing reporting style; append checks, don't rewrite):
  - No `product-(single|generic|package)\.html` href on any of the 12 pages.
  - Every `href="<x>.html"` on those pages where `<x>` is a card title/CTA resolves to a file that exists at repo root.
  - Every product in `products.json` has a `filterType` in the allowed set (the 16 keys of `FILTER_LABELS`).
  - Every merchandising slug exists in `products.json` (reuse `resolveEntry` in a try/catch).
  - Each goal page contains exactly 3 `data-collection-products` sections.

Reference snippet for the placeholder check:

```js
const IN_SCOPE = ['plp-racks-benches','plp-bars-weights','plp-cardio-conditioning','plp-accessories',
  'plp-storage','plp-systems','plp-recovery-mobility','plp-essentials','plp-equipment',
  'beginners-collection','muscle-maintenance','longevity-collection'].map((s) => `${s}.html`);
for (const f of IN_SCOPE) {
  const html = readFileSync(f, 'utf8');
  if (/href="product-(single|generic|package)\.html"/.test(html)) fail(`${f}: still links to a retired template`);
}
```

- [ ] **Step 2: Run full verification**

Run: `npm test && npm run verify`
Expected: all tests PASS; verify reports OK with zero failures.

- [ ] **Step 3: Manual walkthrough** — `npx serve .`, open at ~1440px and click through:
  - one single-cat PLP (e.g. `plp-bars-weights.html`) → a card → lands on the right PDP;
  - one new collection page (`plp-systems.html`) → renders 7 cards;
  - one goal page (`beginners-collection.html`) → 3 sections, click a sub-filter → cards filter.
  Confirm images load and no card shows "Product Title" / `$1,2200.00`.

- [ ] **Step 4: Commit**

```bash
git add tools/verify.mjs
git commit -m "test: verify PLP/collection/goal links resolve + no placeholders remain"
```

- [ ] **Step 5: Finish the branch** — invoke `superpowers:finishing-a-development-branch` to merge `plp-collection-linking` → `main` (auto-deploys to GitHub Pages) or open a PR, per Adam's preference.

---

## Self-review (against the spec)

**Spec coverage:** §3 approach → Tasks 1–7. §4.1 merchandising.json → Task 1. §4.2 filterType → Task 1. §5 injector (locate/replace/counts/sidebars/warnings) → Tasks 3,4,6,7. §6 all 12 pages → Tasks 4 (5), 5 (3 new), 6 (Shop All), 7 (3 goals). §7 renderers → Task 2. §8 verify + tests → Tasks 1–3 (unit), 8 (verify + walkthrough). §9 open decisions → encoded in the data (Task 1) and Shop All skip (Task 6). §10 sequencing → task order + review checkpoints. ✅ No gaps.

**Placeholder scan:** merchandising.json and all code blocks are complete literal content; new-page hero copy is intentionally minimal and flagged for Adam (§9), not a plan gap. ✅

**Type consistency:** `resolveEntry` returns `{ slug, href, name, image, price, filterType }`, consumed unchanged by `plpCardHtml`/`collectionCardHtml` (Task 2) and `subcatsHtml` (Task 7, uses `.filterType`). `replaceEachInner(html, openRe, newInners, tag)` signature identical across Tasks 3/4/6/7. `injectSingleCatPlp`/`injectShopAll`/`injectGoal` names stable between their defining task and the CLI. ✅
