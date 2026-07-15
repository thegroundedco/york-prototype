# York Product PDPs — Phase 1 Implementation Plan (23 pages)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 23 standalone static product-detail pages from a single committed data
file (sheet copy + Figma images + yorkbarbell.com prices), and rewire the site's product
links to point at them — all quantity-default (custom variant selectors are Phase 2).

**Architecture:** A zero-dependency Node generator reads `data/products.json` and renders
each product through one of three JS template modules (which reuse shared chrome partials
extracted verbatim from `product-single.html`), writing pure static `.html` files to the
repo root. Data gathering (copy, images, prices) is agent-driven and populates
`products.json` + `assets/`. A verifier script fails the build on broken links, leftover
tokens, missing assets, or incomplete products. A link-rewire transform retargets existing
product links by matching anchor text to products.

**Tech Stack:** Node ≥ 20 (have v24.15.0), ES modules, built-in `node --test` +
`node:assert` (no third-party dependencies), plain HTML/CSS/vanilla JS output.

## Global Constraints

- **The site has no build step.** The generator/verifier under `tools/` are dev-time only;
  the committed output is pure static HTML served by `npx serve .`. Never make a *page*
  depend on running a script.
- **Zero third-party dependencies.** Tests use `node --test` + `node:assert`. No npm
  installs. `node_modules/` is already gitignored.
- **Generated pages live at the repo ROOT** (`fts-power-cage.html`), so their chrome/asset
  paths are byte-identical to hand-written pages (`assets/…`, `about.html`, not `../…`).
- **Chrome is reused verbatim** from `product-single.html` (lines 1–291 head+chrome-top,
  the footer block, and the two modal blocks). Partials must reproduce that markup exactly,
  varying only `<title>`, meta description, and `<body class>`.
- **Never invent prices or copy.** Missing price → visible `Price TBD`. Missing/ drafted
  copy → stamped `<!-- COPY DRAFTED BY CLAUDE — pending client approval -->` and reported.
- **Text case:** ALL CAPS for display/heading styles (applied via existing CSS classes, not
  by uppercasing source strings), sentence case for body/caption, title case for labels.
- **Slugs are explicit** in `products.json` — never derived at build time, so a name edit
  never silently moves a URL.
- **Phase 1 renders `quantity` for every product.** The 6 custom-variant products carry the
  quantity stepper as a visible interim; their real selectors are Phase 2.
- **Work happens on branch `product-pdps`.** Commit after every task.

**Canonical product object** (every task assumes this shape):

```jsonc
{
  "slug": "fts-power-cage", "name": "FTS Power Cage",
  "template": "single",                 // "single" | "generic" | "package"
  "category": "racks-benches",          // used for breadcrumb + Shop-All link
  "categoryLabel": "Racks & Benches",   // human label for breadcrumb
  "figmaFrame": "3018:25832",
  "price": { "current": 999.00, "compareAt": null, "sourceUrl": "https://yorkbarbell.com/..." },
  "shortDescription": "…",              // buy-box description (may contain <p> paragraphs)
  "keyFeatures": ["Adjustable Backrest – …", "…"],
  "specs": ["Material: 12 gauge steel", "Weight Capacity: 500 lbs"],
  "detailsBody": "…",                   // accordion Description body
  "highlights": [{ "title": "…", "body": "…" }],
  "variants": { "type": "quantity" },   // Phase 1: always "quantity"
  "relatedSlugs": ["fts-flat-to-incline-utility-bench"],
  "externalLinks": [{ "label": "Hi/Low Pulley", "url": "https://yorkbarbell.com/..." }],  // optional
  "included": ["…"],                    // package only
  "addOns": [{ "name": "…", "price": "$150", "desc": "…", "slug": "…" }],  // single only, ≤3
  "images": { "gallery": ["assets/images/products/fts-power-cage/gallery-1.jpg"], "editorial": "assets/images/products/fts-power-cage/editorial.jpg" },
  "copySource": "sheet",                // "sheet" | "drafted-by-claude"
  "imageSource": "figma"                // "figma" | "yorkbarbell.com"
}
```

---

## File structure

```
package.json                  dev-tooling manifest (type:module, scripts) — NO dependencies
data/
  products.json               23 products — single source of truth (committed)
  products.sample.json         1-product fixture for tests
lib/
  parse.js                    slugify, splitBullets, splitSpecs, escapeHtml, formatPrice
  products.js                 loadProducts, validateProduct
templates/
  partials.js                 renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts
  single.js                   renderSingle(product)
  generic.js                  renderGeneric(product)
  package.js                  renderPackage(product)
  index.js                    renderProduct(product) — dispatch by product.template
tools/
  build-products.mjs          data + templates → 23 root .html
  verify.mjs                  link/token/asset/completeness checks (exit 1 on failure)
  rewire-links.mjs            retarget existing product links to real slugs
test/
  parse.test.js  products.test.js  partials.test.js  single.test.js
  generic.test.js  package.test.js  build.test.js  verify.test.js  rewire.test.js
assets/images/products/<slug>/  gallery-1..5.jpg, editorial.jpg   (agent-exported)
<slug>.html ×23               generated, committed
```

---

### Task 1: Dev-tooling scaffold

**Files:**
- Create: `package.json`
- Create: `test/smoke.test.js`
- Create: `data/.gitkeep`, `lib/.gitkeep`, `templates/.gitkeep`, `tools/.gitkeep`

**Interfaces:**
- Produces: `npm test` → `node --test`; `npm run build` → `node tools/build-products.mjs`;
  `npm run verify` → `node tools/verify.mjs`.

- [ ] **Step 1: Write the failing test**

```js
// test/smoke.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — no `package.json` with `"type":"module"`, so the `import` line errors
(`Cannot use import statement` / "Unexpected token").

- [ ] **Step 3: Create the manifest**

```json
{
  "name": "york-prototype-tools",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Dev-time tooling for the York Barbell prototype. The SITE itself has no build step — these scripts generate/verify the committed static HTML.",
  "scripts": {
    "build": "node tools/build-products.mjs",
    "verify": "node tools/verify.mjs",
    "rewire": "node tools/rewire-links.mjs",
    "test": "node --test"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — `tests 1 / pass 1`.

- [ ] **Step 5: Commit**

```bash
git add package.json test/smoke.test.js data/.gitkeep lib/.gitkeep templates/.gitkeep tools/.gitkeep
git commit -m "chore: add zero-dep dev-tooling scaffold for PDP generator"
```

---

### Task 2: `lib/parse.js` — text utilities

**Files:**
- Create: `lib/parse.js`
- Test: `test/parse.test.js`

**Interfaces:**
- Produces:
  - `slugify(name: string): string` — lowercase, spaces→`-`, strip non `[a-z0-9-]`, collapse `-`.
  - `splitBullets(raw: string): string[]` — split a Key-Features blob on leading `*`/`-`
    markers or newlines; trim; drop empties; strip the leading marker.
  - `splitSpecs(raw: string): string[]` — split a Features-&-Specs blob on newlines and
    ` - ` sequences; trim; drop empties. No label/value parsing.
  - `escapeHtml(s: string): string` — `& < > " '` → entities.
  - `formatPrice(n: number|null): string` — `1999` → `"$1,999.00"`; `null` → `"Price TBD"`.

- [ ] **Step 1: Write the failing test**

```js
// test/parse.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/parse.test.js`
Expected: FAIL — `Cannot find module '../lib/parse.js'`.

- [ ] **Step 3: Write the implementation**

```js
// lib/parse.js
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[''"″"'`]/g, '')       // drop quotes/primes entirely (no dangling dash)
    .replace(/[^a-z0-9]+/g, '-')       // any run of non-alnum → single dash
    .replace(/^-+|-+$/g, '');          // trim leading/trailing dashes
}

export function splitBullets(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\s*(?:^|\n|\r|(?=\*)|(?=^-|\s-\s))\s*/m) // rough; refined by markers below
    .join('\n')
    .split(/\n|(?=\*)/)
    .map((s) => s.replace(/^[\*\-•]\s*/, '').trim())
    .filter(Boolean);
}

export function splitSpecs(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\n|\r| - /)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatPrice(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'Price TBD';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/parse.test.js`
Expected: PASS. If `splitBullets` fails on the `*`-joined case, simplify its body to:
`return String(raw).split(/\n|(?=\s\*\s)|(?=^\*)|(?=^-\s)/m).map(s => s.replace(/^[\*\-•]\s*/,'').trim()).filter(Boolean);`
and re-run until green. (The test is the contract; iterate the regex to satisfy it.)

- [ ] **Step 5: Commit**

```bash
git add lib/parse.js test/parse.test.js
git commit -m "feat: add text-parsing utilities for PDP data (slug, bullets, specs, price)"
```

---

### Task 3: `lib/products.js` — load + validate

**Files:**
- Create: `lib/products.js`
- Create: `data/products.sample.json` (one valid product fixture)
- Test: `test/products.test.js`

**Interfaces:**
- Consumes: none.
- Produces:
  - `loadProducts(path = 'data/products.json'): Product[]` — parse JSON, throw on malformed.
  - `validateProduct(p): string[]` — return array of human-readable errors (empty = valid).
    Rules: `slug` matches `^[a-z0-9-]+$`; `template` ∈ {single,generic,package}; `name`,
    `shortDescription`, `categoryLabel` non-empty; `price` has `current` (number) OR is
    explicitly `null`; `images.gallery` length ≥ 3; every `relatedSlugs` entry is a string.

- [ ] **Step 1: Write the failing test**

```js
// test/products.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts, validateProduct } from '../lib/products.js';

const valid = {
  slug: 'x', name: 'X', template: 'single', category: 'c', categoryLabel: 'C',
  price: { current: 10, compareAt: null, sourceUrl: '' },
  shortDescription: 'desc', keyFeatures: [], specs: [], detailsBody: '', highlights: [],
  variants: { type: 'quantity' }, relatedSlugs: [],
  images: { gallery: ['a', 'b', 'c'], editorial: 'e' },
  copySource: 'sheet', imageSource: 'figma',
};

test('a valid product yields no errors', () => {
  assert.deepEqual(validateProduct(valid), []);
});

test('bad template and short gallery are reported', () => {
  const bad = { ...valid, template: 'nope', images: { gallery: ['a'], editorial: 'e' } };
  const errs = validateProduct(bad);
  assert.ok(errs.some((e) => e.includes('template')));
  assert.ok(errs.some((e) => e.includes('gallery')));
});

test('null price is allowed (renders as TBD)', () => {
  assert.deepEqual(validateProduct({ ...valid, price: null }), []);
});

test('loadProducts reads the sample fixture', () => {
  const list = loadProducts('data/products.sample.json');
  assert.equal(list.length, 1);
  assert.equal(validateProduct(list[0]).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/products.test.js`
Expected: FAIL — module + fixture missing.

- [ ] **Step 3: Write implementation and fixture**

```js
// lib/products.js
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
  if (p.relatedSlugs && !p.relatedSlugs.every((s) => typeof s === 'string')) e.push('relatedSlugs must be strings');
  return e;
}
```

```json
// data/products.sample.json
[{
  "slug": "sample-bench", "name": "Sample Bench", "template": "single",
  "category": "racks-benches", "categoryLabel": "Racks & Benches", "figmaFrame": "0:0",
  "price": { "current": 104.00, "compareAt": 160.00, "sourceUrl": "" },
  "shortDescription": "<p>A sample bench for tests.</p>",
  "keyFeatures": ["Adjustable", "Durable"],
  "specs": ["Weight 38 lb", "Dimensions 44 × 17 × 9"],
  "detailsBody": "Longer marketing paragraph.",
  "highlights": [{ "title": "Adjustable", "body": "Flat to incline." }],
  "variants": { "type": "quantity" },
  "relatedSlugs": [], "addOns": [],
  "images": { "gallery": ["assets/images/products/sample-bench/gallery-1.jpg", "assets/images/products/sample-bench/gallery-2.jpg", "assets/images/products/sample-bench/gallery-3.jpg"], "editorial": "assets/images/products/sample-bench/editorial.jpg" },
  "copySource": "sheet", "imageSource": "figma"
}]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/products.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/products.js data/products.sample.json test/products.test.js
git commit -m "feat: add product loader + schema validator with sample fixture"
```

---

### Task 4: `templates/partials.js` — shared chrome (verbatim)

**Files:**
- Create: `templates/partials.js`
- Test: `test/partials.test.js`
- Reference (read, do not modify): `product-single.html` lines 1–291 (head + chrome-top),
  the `<footer id="site-footer">…</footer>` block (lines 550–668), and the two `<dialog>`
  modal blocks (lines 670–747).

**Interfaces:**
- Consumes: `escapeHtml` from `lib/parse.js`.
- Produces:
  - `renderHead(product): string` — `<!DOCTYPE html>…<head>…</head>` with `<title>${name} |
    York Barbell</title>`, meta description from `product.shortDescription` (tags stripped,
    truncated ~155 chars, escaped), and the 5 existing `<link rel=stylesheet>` lines
    verbatim. Emits the "generated — do not edit" banner (Task 17) and, when
    `product.copySource === 'drafted-by-claude'`, the drafted-copy banner (Task 14).
  - `renderBodyOpen(product): string` — `<body class="pdp-page ${bodyClass}">` + skip link +
    chrome-top block (announcement bar + header/nav/mega-menu) copied verbatim from
    `product-single.html` lines 16–291. `bodyClass` = `pdp-single` | `pdp-generic` |
    `pdp-package` derived from `product.template`.
  - `renderFooter(): string` — the `<footer id="site-footer">…</footer>` block verbatim.
  - `renderGalleryModal(product): string` — the gallery `<dialog>` with one `<slide>` +
    one `<dot>` per `product.images.gallery` entry (not hardcoded to 5).
  - `renderSpecsModal(product): string` — the Features-&-Specs side `<dialog>`; body is one
    `<p>` per `product.specs` entry under a single "Specifications" subheader (replacing the
    hardcoded Construction/Dimensions/etc. sections).
  - `renderScripts(): string` — the two `<script type="module">` lines + `</body></html>`.

- [ ] **Step 1: Write the failing test**

```js
// test/partials.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts } from '../lib/products.js';
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from '../templates/partials.js';

const p = loadProducts('data/products.sample.json')[0];

test('head has title, stylesheets, no leftover placeholder', () => {
  const h = renderHead(p);
  assert.match(h, /<title>Sample Bench \| York Barbell<\/title>/);
  assert.match(h, /href="css\/tokens\.css"/);
  assert.match(h, /href="css\/pages\.css"/);
  assert.doesNotMatch(h, /\{\{/);
});

test('body open carries the template-specific class and the mega menu', () => {
  const b = renderBodyOpen(p);
  assert.match(b, /<body class="pdp-page pdp-single">/);
  assert.match(b, /announcement-bar/);
  assert.match(b, /class="chrome-top"/);
});

test('gallery modal emits one slide per image (3 for the fixture)', () => {
  const g = renderGalleryModal(p);
  assert.equal((g.match(/data-carousel-slide/g) || []).length, 3);
});

test('specs modal lists each spec', () => {
  const s = renderSpecsModal(p);
  assert.match(s, /Weight 38 lb/);
  assert.match(s, /Dimensions 44 × 17 × 9/);
});

test('footer + scripts close the document', () => {
  assert.match(renderFooter(), /site-footer/);
  assert.match(renderScripts(), /js\/chrome\.js/);
  assert.match(renderScripts(), /<\/html>/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/partials.test.js`
Expected: FAIL — `templates/partials.js` missing.

- [ ] **Step 3: Write the implementation**

Procedure (mechanical, exact):
1. Open `product-single.html`. Copy lines **1–14** into a template literal returned by
   `renderHead`, replacing line 6 with `<title>${escapeHtml(product.name)} | York Barbell</title>`
   and line 7's `content="…"` with `content="${metaDescription(product)}"` where
   `metaDescription` strips HTML tags from `shortDescription`, collapses whitespace,
   truncates to 155 chars, and escapes.
2. Copy lines **15–291** into `renderBodyOpen`, replacing line 15 with
   `<body class="pdp-page ${bodyClass(product.template)}">` where `bodyClass` maps
   single→`pdp-single`, generic→`pdp-generic`, package→`pdp-package`.
3. Copy the `<footer …>…</footer>` block into `renderFooter` unchanged.
4. `renderGalleryModal`: keep the `<dialog>` wrapper; replace the hardcoded 5 `<slide>`s
   with `product.images.gallery.map((src,i) => slideHtml(src,i)).join('')` and the 5 dots
   with `product.images.gallery.map((_,i) => dotHtml(i)).join('')`.
5. `renderSpecsModal`: keep the `<dialog>` + heading; replace the five hardcoded
   `<section>`s with a single section whose body is
   `product.specs.map(s => '<p>' + escapeHtml(s) + '</p>').join('')`.
6. `renderScripts`: the two `<script type="module" src="js/…">` lines + `</body>\n</html>`.

```js
// templates/partials.js  (skeleton — paste the verbatim HTML from product-single.html into the marked spots)
import { escapeHtml } from '../lib/parse.js';

const BODY_CLASS = { single: 'pdp-single', generic: 'pdp-generic', package: 'pdp-package' };

function metaDescription(p) {
  const text = String(p.shortDescription).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return escapeHtml(text.slice(0, 155));
}

export function renderHead(p) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(p.name)} | York Barbell</title>
  <meta name="description" content="${metaDescription(p)}">

  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/chrome.css">
  <link rel="stylesheet" href="css/pages.css">
</head>`;
}

export function renderBodyOpen(p) {
  const cls = BODY_CLASS[p.template];
  return `<body class="pdp-page ${cls}">
  <a class="skip-link" href="#main">Skip to content</a>
  <!-- Chrome — renders once for every page -->
  <div class="chrome-top">
  /* … PASTE product-single.html lines 20–291 VERBATIM here … */
`;
}

function slideHtml(src, i) {
  return `        <div class="modal--gallery-image__slide" data-carousel-slide${i === 0 ? '' : ' hidden'}>
          <img src="${src}" alt="">
        </div>`;
}
function dotHtml(i) {
  return `        <button type="button" class="modal--gallery-image__dot" data-carousel-dot role="tab" aria-selected="${i === 0}">
          <span class="visually-hidden">Slide ${i + 1}</span>
        </button>`;
}

export function renderGalleryModal(p) {
  const slides = p.images.gallery.map(slideHtml).join('\n');
  const dots = p.images.gallery.map((_, i) => dotHtml(i)).join('\n');
  return `  <dialog class="modal modal--gallery-image" id="modal-gallery-image" aria-label="Product image gallery">
    <button type="button" class="modal__close modal__close--gallery" aria-label="Close">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M21 3L3 21" stroke="currentColor" stroke-width="2" fill="none"/></svg>
    </button>
    <div class="modal--gallery-image__carousel" data-carousel data-carousel-no-auto tabindex="0">
      <div class="modal--gallery-image__slides">
${slides}
      </div>
      <div class="modal--gallery-image__dots" role="tablist" aria-label="Gallery slides">
${dots}
      </div>
    </div>
  </dialog>`;
}

export function renderSpecsModal(p) {
  const body = p.specs.map((s) => `          <p>${escapeHtml(s)}</p>`).join('\n');
  return `  <dialog class="modal modal--side" id="modal-features-specs" aria-labelledby="modal-features-specs-title">
    <button type="button" class="modal__close modal__close--side" aria-label="Close">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M21 3L3 21" stroke="currentColor" stroke-width="2" fill="none"/></svg>
    </button>
    <div class="modal--side__inner">
      <h2 id="modal-features-specs-title" class="modal--side__heading">Features &amp; Specs</h2>
      <div class="modal--side__body">
        <div class="modal--side__section">
          <h3 class="modal--side__subheader">Specifications</h3>
${body}
        </div>
      </div>
    </div>
  </dialog>`;
}

export function renderFooter() {
  return `  <footer id="site-footer" class="site-footer">
  /* … PASTE the <footer> block from product-single.html VERBATIM here … */
  </footer>`;
}

export function renderScripts() {
  return `  <script type="module" src="js/chrome.js"></script>
  <script type="module" src="js/modals.js"></script>
</body>
</html>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/partials.test.js`
Expected: PASS (5 tests). Then eyeball: `node -e "import('./templates/partials.js').then(m=>console.log(m.renderBodyOpen(require('fs').readFileSync)))"` is unnecessary — the render task (Task 9) produces a full page to view.

- [ ] **Step 5: Commit**

```bash
git add templates/partials.js test/partials.test.js
git commit -m "feat: add shared chrome partials (head, chrome-top, footer, modals)"
```

---

### Task 5: `templates/single.js` — Single PDP body

**Files:**
- Create: `templates/single.js`
- Test: `test/single.test.js`
- Reference: `product-single.html` main content (lines 293–546: buy box + secondary + recs).

**Interfaces:**
- Consumes: partials from Task 4; `escapeHtml`, `formatPrice` from `lib/parse.js`.
- Produces: `renderSingle(product): string` — full document
  (`renderHead + renderBodyOpen + <main>…</main> + renderFooter + renderGalleryModal +
  renderSpecsModal + renderScripts`).

**Buy-box token map** (hardcoded in HTML → interpolation):

| Current hardcoded content | Replace with |
|---|---|
| breadcrumb `Longevity` / `Product Name` (lines 330,332) | `${escapeHtml(p.categoryLabel)}` linked to `${p.category}`-collection; `${escapeHtml(p.name)}` |
| `<h1 …>York Fitness Bench</h1>` | `${escapeHtml(p.name)}` |
| price `$222.00`/`$222.00` (339,340) | `${formatPrice(p.price?.compareAt)}` (omit span if no compareAt) + `${formatPrice(p.price?.current)}` |
| description `<p>…</p>` block (346–348) | `${p.shortDescription}` (already HTML `<p>`s; not escaped) |
| add-ons 3 rows (369–401) | `${p.addOns.slice(0,3).map(addOnHtml).join('')}`; render section only if `addOns.length` |
| key-features `<li>`s (416–418) | `${p.keyFeatures.map(f => '<li>'+escapeHtml(f)+'</li>').join('')}` |
| accordion Description body (430) | `${escapeHtml(p.detailsBody)}` |
| secondary feature title/body (463–464) | `${p.highlights[0]?.title}` / `${p.highlights[0]?.body}` (fallback to detailsBody) |
| secondary 2 product cards (469–486) | first two `relatedSlugs` → title + link `${slug}.html` |
| recs 4 cards (497–538) | `${p.relatedSlugs.slice(0,4).map(recCardHtml).join('')}` (category fallback if <4) |
| recs "Shop All" href (540) | `plp-${p.category}.html` or `plp-equipment.html` fallback |

- [ ] **Step 1: Write the failing test**

```js
// test/single.test.js
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
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<\/html>\s*$/);
  assert.match(html, /js\/chrome\.js/);
});

test('add-ons section omitted when empty', () => {
  const html = renderSingle({ ...p, addOns: [] });
  assert.doesNotMatch(html, /Select Popular Add Ons/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/single.test.js`
Expected: FAIL — `templates/single.js` missing.

- [ ] **Step 3: Write the implementation**

Build `renderSingle` by assembling the partials with the `<main>` body converted per the
token map above. Helper functions `addOnHtml(a)`, `recCardHtml(slug, products)` produce the
repeated card markup. Include the `pdp__quantity` block verbatim (Phase 1 = quantity for
all). Full code is the existing `product-single.html` main block with the table's
substitutions applied — paste the HTML into a template literal and swap the listed spans.

```js
// templates/single.js
import { renderHead, renderBodyOpen, renderFooter, renderGalleryModal, renderSpecsModal, renderScripts } from './partials.js';
import { escapeHtml, formatPrice } from '../lib/parse.js';

function priceRow(price) {
  if (!price) return `<span class="pdp__price-current">Price TBD</span>`;
  const compare = price.compareAt ? `<span class="pdp__price-original">${formatPrice(price.compareAt)}</span>` : '';
  return `${compare}<span class="pdp__price-current">${formatPrice(price.current)}</span>`;
}

function addOnHtml(a, i) {
  return `<label class="pdp__addon">
  <input type="checkbox" class="pdp__addon-checkbox" name="addon-${i + 1}">
  <img src="${a.image || ''}" alt="" class="pdp__addon-image">
  <div class="pdp__addon-text"><div class="pdp__addon-top">
    <span class="pdp__addon-name">${escapeHtml(a.name)}</span>
    <span class="pdp__addon-price">${escapeHtml(a.price || '')}</span>
  </div><span class="pdp__addon-desc">${escapeHtml(a.desc || '')}</span></div>
</label>`;
}

export function renderSingle(p) {
  const main = `  <main id="main">
  /* … PASTE product-single.html lines 295–546 with the token-map substitutions applied … */
  </main>`;
  return [renderHead(p), renderBodyOpen(p), main, renderFooter(),
    renderGalleryModal(p), renderSpecsModal(p), renderScripts()].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/single.test.js` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add templates/single.js test/single.test.js
git commit -m "feat: add Single-template PDP renderer"
```

---

### Task 6: `templates/generic.js` — Generic PDP body

**Files:**
- Create: `templates/generic.js`
- Test: `test/generic.test.js`
- Reference: `product-generic.html` main content (buy box + feature + featured carousel + recs).

**Interfaces:**
- Consumes: partials; `escapeHtml`, `formatPrice`.
- Produces: `renderGeneric(product): string`.

**Differences from Single:** no add-ons, no key-features list, no financing in the buy box;
buy box = breadcrumb + title + price + description + `pdp__quantity` + accordion. Body then
has: feature (full-bleed `${p.images.editorial}` + one card `${p.highlights[0]}`),
featured-products carousel (reuse gallery images), recs 4-card row. Token map mirrors
Task 5 for the shared buy-box elements.

- [ ] **Step 1: Write the failing test**

```js
// test/generic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGeneric } from '../templates/generic.js';

const p = {
  slug: 'battle-rope', name: 'Battle Rope', template: 'generic',
  category: 'accessories', categoryLabel: 'Accessories',
  price: { current: 89, compareAt: null, sourceUrl: '' },
  shortDescription: '<p>Heavy rope.</p>', keyFeatures: ['Grip'], specs: ['30 ft'],
  detailsBody: 'Details.', highlights: [{ title: 'Tough', body: 'Very.' }],
  variants: { type: 'quantity' }, relatedSlugs: [],
  images: { gallery: ['g1.jpg', 'g2.jpg', 'g3.jpg'], editorial: 'e.jpg' },
  copySource: 'sheet', imageSource: 'figma',
};

test('generic renders name + single price, no compareAt span', () => {
  const html = renderGeneric(p);
  assert.match(html, /Battle Rope/);
  assert.match(html, /\$89\.00/);
  assert.doesNotMatch(html, /pdp__price-original/);   // no compareAt → no strikethrough
  assert.doesNotMatch(html, /Select Popular Add Ons/); // generic has no add-ons
  assert.doesNotMatch(html, /\{\{/);
});

test('generic is a complete document with the editorial image', () => {
  const html = renderGeneric(p);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /e\.jpg/);
});
```

- [ ] **Step 2: Run** `node --test test/generic.test.js` → FAIL (module missing).
- [ ] **Step 3:** Implement `renderGeneric` from `product-generic.html` main block + token map (same pattern as Task 5, minus add-ons/key-features/financing).
- [ ] **Step 4: Run** `node --test test/generic.test.js` → PASS.
- [ ] **Step 5: Commit**

```bash
git add templates/generic.js test/generic.test.js
git commit -m "feat: add Generic-template PDP renderer"
```

---

### Task 7: `templates/package.js` — Package PDP body

**Files:**
- Create: `templates/package.js`
- Test: `test/package.test.js`
- Reference: `product-package.html` main content (buy box with "What's Included" + accordion-embedded recs + featured sections).

**Interfaces:**
- Consumes: partials; `escapeHtml`, `formatPrice`.
- Produces: `renderPackage(product): string`.

**Differences:** buy box has `pdp__included` (What's Included list from `p.included`) instead
of a quantity stepper; no add-ons; recs are embedded in an open accordion.

- [ ] **Step 1: Write the failing test**

```js
// test/package.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPackage } from '../templates/package.js';

const p = {
  slug: 'plyo-package', name: 'Plyo Package', template: 'package',
  category: 'equipment', categoryLabel: 'Equipment',
  price: { current: 499, compareAt: 599, sourceUrl: '' },
  shortDescription: '<p>Bundle.</p>', included: ['Plyo box', 'Slam ball', 'Mat'],
  specs: ['Full kit'], detailsBody: 'Details.', highlights: [], keyFeatures: [],
  variants: { type: 'quantity' }, relatedSlugs: [],
  images: { gallery: ['g1.jpg', 'g2.jpg', 'g3.jpg'], editorial: 'e.jpg' },
  copySource: 'sheet', imageSource: 'figma',
};

test('package lists included items and shows both prices', () => {
  const html = renderPackage(p);
  assert.match(html, /What.s Included/);
  assert.match(html, /Plyo box/);
  assert.match(html, /Slam ball/);
  assert.match(html, /\$499\.00/);
  assert.match(html, /\$599\.00/);
  assert.doesNotMatch(html, /pdp__quantity/); // package has no qty stepper
  assert.doesNotMatch(html, /\{\{/);
});
```

- [ ] **Step 2: Run** `node --test test/package.test.js` → FAIL.
- [ ] **Step 3:** Implement `renderPackage` from `product-package.html` main block; `pdp__included-list` items = `p.included.map(i => '<li>'+escapeHtml(i)+'</li>').join('')`.
- [ ] **Step 4: Run** `node --test test/package.test.js` → PASS.
- [ ] **Step 5: Commit**

```bash
git add templates/package.js test/package.test.js
git commit -m "feat: add Package-template PDP renderer"
```

---

### Task 8: `templates/index.js` — dispatcher

**Files:**
- Create: `templates/index.js`
- Test: folded into `test/build.test.js` (Task 9).

**Interfaces:**
- Consumes: `renderSingle`, `renderGeneric`, `renderPackage`.
- Produces: `renderProduct(product): string` — dispatch on `product.template`; throw on unknown.

- [ ] **Step 1: Implement**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add templates/index.js
git commit -m "feat: add template dispatcher"
```

---

### Task 9: `tools/build-products.mjs` — the generator

**Files:**
- Create: `tools/build-products.mjs`
- Test: `test/build.test.js`

**Interfaces:**
- Consumes: `loadProducts`, `validateProduct`, `renderProduct`.
- Produces: `buildAll(products, outDir): { written: string[], errors: string[] }` (exported
  for tests) + a CLI entry that reads `data/products.json`, writes `<outDir>/<slug>.html`,
  and exits non-zero if any product fails validation.

- [ ] **Step 1: Write the failing test**

```js
// test/build.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProducts } from '../lib/products.js';
import { buildAll } from '../tools/build-products.mjs';

test('buildAll writes one file per product', () => {
  const products = loadProducts('data/products.sample.json');
  const out = mkdtempSync(join(tmpdir(), 'york-'));
  const res = buildAll(products, out);
  assert.deepEqual(res.errors, []);
  assert.equal(res.written.length, 1);
  const file = join(out, 'sample-bench.html');
  assert.ok(existsSync(file));
  const html = readFileSync(file, 'utf8');
  assert.match(html, /Sample Bench/);
  assert.doesNotMatch(html, /\{\{/);
});

test('buildAll reports invalid products and skips writing them', () => {
  const bad = [{ slug: 'x', template: 'nope', images: { gallery: [] } }];
  const out = mkdtempSync(join(tmpdir(), 'york-'));
  const res = buildAll(bad, out);
  assert.ok(res.errors.length > 0);
  assert.equal(res.written.length, 0);
});
```

- [ ] **Step 2: Run** `node --test test/build.test.js` → FAIL (module missing).

- [ ] **Step 3: Write the implementation**

```js
// tools/build-products.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProducts, validateProduct } from '../lib/products.js';
import { renderProduct } from '../templates/index.js';

export function buildAll(products, outDir) {
  const written = [];
  const errors = [];
  for (const p of products) {
    const errs = validateProduct(p);
    if (errs.length) { errors.push(`${p.slug || '(no slug)'}: ${errs.join('; ')}`); continue; }
    const html = renderProduct(p);
    if (html.includes('{{')) { errors.push(`${p.slug}: leftover {{token}} in output`); continue; }
    const file = join(outDir, `${p.slug}.html`);
    writeFileSync(file, html, 'utf8');
    written.push(file);
  }
  return { written, errors };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const products = loadProducts('data/products.json');
  const { written, errors } = buildAll(products, '.');
  console.log(`Wrote ${written.length} pages.`);
  if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
}
```

- [ ] **Step 4: Run** `node --test test/build.test.js` → PASS (2 tests).
- [ ] **Step 5: Commit**

```bash
git add tools/build-products.mjs test/build.test.js
git commit -m "feat: add PDP generator (buildAll + CLI)"
```

---

### Task 10: `tools/verify.mjs` — build-gate checks

**Files:**
- Create: `tools/verify.mjs`
- Test: `test/verify.test.js`

**Interfaces:**
- Produces: `verify(rootDir): { errors: string[] }` (exported) + CLI that exits 1 on errors.
  Checks each `*.html` at root: (a) every `href="x.html"` / `src="assets/…"` local target
  exists on disk; (b) no `{{` tokens; (c) no `href` pointing at `product-single.html` /
  `product-generic.html` / `product-package.html`; (d) fails if any `<img>` `src` file is
  missing.

- [ ] **Step 1: Write the failing test**

```js
// test/verify.test.js
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
```

- [ ] **Step 2: Run** `node --test test/verify.test.js` → FAIL.

- [ ] **Step 3: Write the implementation**

```js
// tools/verify.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RETIRED = ['product-single.html', 'product-generic.html', 'product-package.html'];

export function verify(rootDir) {
  const errors = [];
  const files = readdirSync(rootDir).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const html = readFileSync(join(rootDir, f), 'utf8');
    if (html.includes('{{')) errors.push(`${f}: leftover {{token}}`);
    for (const r of RETIRED) {
      if (html.includes(`href="${r}"`)) errors.push(`${f}: links to retired template ${r}`);
    }
    const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) {
      if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
      const path = ref.split('#')[0].split('?')[0];
      if (!path) continue;
      if (!existsSync(join(rootDir, path))) errors.push(`${f}: dead local ref ${ref}`);
    }
  }
  return { errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors } = verify('.');
  if (errors.length) { console.error(`VERIFY FAILED (${errors.length}):\n` + errors.join('\n')); process.exit(1); }
  console.log('VERIFY OK');
}
```

- [ ] **Step 4: Run** `node --test test/verify.test.js` → PASS (3 tests).
- [ ] **Step 5: Commit**

```bash
git add tools/verify.mjs test/verify.test.js
git commit -m "feat: add build-gate verifier (links, tokens, retired templates, assets)"
```

---

### Task 11: Assemble `data/products.json` (agent-driven)

**Files:**
- Create: `data/products.json` (all 23 products)

This is data transcription, not code — the "test" is `validateProduct` (Task 3) + the
generator (Task 9). Per product, transcribe from the sheet tab that matches its template:

- [ ] **Step 1:** For each of the 23 products in the spec's roster tables, create an object
  per the canonical shape. Pull `shortDescription`, `keyFeatures` (via `splitBullets`
  mentally / by hand), `specs` (via `splitSpecs`), `detailsBody`, `highlights[0..1]`,
  `included` (package), from the matching sheet tab. Set `template` from the spec's Figma
  assignment (NOT the sheet tab), `slug` = `slugify(name)`, `category`/`categoryLabel` from
  the mega-menu grouping, `variants.type = "quantity"` for all (Phase 1).
- [ ] **Step 2:** Fix sheet typos in the JSON (`Elegible`→`Eligible`, `modiular`→`modular`)
  and keep a list to report to Gabriela. Set `copySource: "sheet"` for the 22 sourced
  products; leave Vinyl Fitbell for Task 14.
- [ ] **Step 3:** Set `relatedSlugs` from each sheet "You May Also Like" cell where present
  (map product names → slugs); leave `[]` where blank (Task 15 adds category fallback).
  Set Power Cage `externalLinks` from its sheet accessory URLs.
- [ ] **Step 4:** Leave `price` as `{ current: null, compareAt: null, sourceUrl: "" }` and
  `images` as empty arrays for now (Tasks 12–13 fill them). Because gallery is empty,
  validation will fail — that's expected until Task 12; do not run the generator yet.
- [ ] **Step 5: Commit**

```bash
git add data/products.json
git commit -m "data: transcribe 23 products' copy from the sheet (prices/images pending)"
```

---

### Task 12: Export product images from Figma (agent-driven)

**Files:**
- Create: `assets/images/products/<slug>/gallery-1..N.jpg`, `editorial.jpg` (23 folders)
- Modify: `data/products.json` (fill `images`)

Uses the Figma MCP export tools with the node-ID map in the spec/Figma report. Not a headless script.

- [ ] **Step 1:** For each framed product, export the 5 gallery slots + editorial banner
  (node IDs in the Figma report) to `assets/images/products/<slug>/`. Prefer JPEG at 1×.
- [ ] **Step 2:** Visually inspect each product's gallery. Drop any slot that is a flat red
  placeholder (e.g. Fitness Bench has 2). A product must keep ≥3 real images.
- [ ] **Step 3:** Write the resulting file list into each product's `images.gallery` (in
  order) and `images.editorial`. Report the per-product image tally + total committed MB to
  Adam before committing; if PNGs are large, flag it.
- [ ] **Step 4:** FTS Flat-to-Incline bench (no Figma frame) → leave images empty for now;
  resolved in Task 14.
- [ ] **Step 5: Commit**

```bash
git add assets/images/products data/products.json
git commit -m "assets: export 23 products' gallery + editorial images from Figma"
```

---

### Task 13: Look up prices from yorkbarbell.com (agent-driven)

**Files:**
- Modify: `data/products.json` (fill `price`)

- [ ] **Step 1:** For each product, find its yorkbarbell.com page (Power Cage URLs are in the
  sheet; search the live site for the rest). Record `price.current`, `price.compareAt` (if
  on sale), and `price.sourceUrl`.
- [ ] **Step 2:** Any product not found on the live site → leave `price: null` (renders
  `Price TBD`). Compile the list of misses for Adam.
- [ ] **Step 3: Commit**

```bash
git add data/products.json
git commit -m "data: add yorkbarbell.com prices (misses left as null → Price TBD)"
```

---

### Task 14: Draft Vinyl Fitbell copy + resolve FTS bench images (agent-driven)

**Files:**
- Modify: `data/products.json`

- [ ] **Step 1:** Confirm with Gabriela whether "Vinyl Fitbell" == the Figma "Neoprene Hex
  Dumbbells (Fitbells)" frame. If yes, use that frame's images; if unresolved, ship image-
  less/placeholder. Draft `shortDescription`, `keyFeatures`, `specs`, `detailsBody`,
  `highlights` from the comp + yorkbarbell.com. Set `copySource: "drafted-by-claude"`.
- [ ] **Step 2:** For FTS Flat-to-Incline bench: pull gallery photos from its yorkbarbell.com
  listing (set `imageSource: "yorkbarbell.com"`), or — per Adam's call — ship image-less.
- [ ] **Step 3:** The generator (partials) already stamps drafted pages: ensure
  `renderHead`/`renderBodyOpen` emit `<!-- COPY DRAFTED BY CLAUDE — pending client approval -->`
  when `product.copySource === 'drafted-by-claude'` (add this conditional to `renderHead` in
  Task 4 if not already present; add a partial test for it).
- [ ] **Step 4: Commit**

```bash
git add data/products.json templates/partials.js test/partials.test.js
git commit -m "data: draft Vinyl Fitbell copy (stamped) + resolve FTS bench images"
```

---

### Task 15: Generate all 23 pages + verify + manual gate

**Files:**
- Create: `<slug>.html` ×23 (generated)

- [ ] **Step 1:** Add category-fallback for `relatedSlugs`: where a product has <4 related,
  fill from same-`category` products. Add to `templates/index.js`:

```js
// templates/index.js — add and export
export function withRelatedFallback(product, allProducts) {
  const related = [...(product.relatedSlugs || [])];
  if (related.length >= 4) return product;
  const pool = allProducts
    .filter((q) => q.slug !== product.slug && q.category === product.category && !related.includes(q.slug))
    .map((q) => q.slug);
  while (related.length < 4 && pool.length) related.push(pool.shift());
  return { ...product, relatedSlugs: related };
}
```

  And in `build-products.mjs`, map products through `withRelatedFallback(p, products)` before
  rendering. Add a test:

```js
// test/index.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRelatedFallback } from '../templates/index.js';

test('fills related from same category up to 4', () => {
  const all = [
    { slug: 'a', category: 'x' }, { slug: 'b', category: 'x' },
    { slug: 'c', category: 'x' }, { slug: 'd', category: 'y' },
  ];
  const out = withRelatedFallback({ slug: 'a', category: 'x', relatedSlugs: [] }, all);
  assert.deepEqual(out.relatedSlugs, ['b', 'c']); // only 2 same-category peers exist
});
```

- [ ] **Step 2:** Run the generator: `npm run build`. Expected: `Wrote 23 pages.` and exit 0.
- [ ] **Step 3:** Run `npm run verify`. Expected: `VERIFY OK`. Fix any dead refs.
- [ ] **Step 4:** Serve (`npx serve .`) and render at 1440 in the browser: one page per
  template + the three oddballs (FTS bench, Vinyl Fitbell, Floor Guards on generic). Confirm
  images load, prices show (or `Price TBD`), no lorem/placeholder remains. Use the `verify`
  skill's discipline — observe the real page.
- [ ] **Step 5: Commit**

```bash
git add *.html templates/index.js test/index.test.js
git commit -m "feat: generate all 23 product PDP pages"
```

---

### Task 16: Rewire product links (agent-reviewed transform)

**Files:**
- Create: `tools/rewire-links.mjs`
- Test: `test/rewire.test.js`
- Modify: every page's mega-menu + PLP/collection cards (via the transform)

**Interfaces:**
- Produces: `resolveProductLink(anchorText, products): { slug, confident } | null` — normalize
  (lowercase, strip `york`, punctuation, parenthetical qualifiers) and match anchor text to a
  product `name`; `confident` true only on exact-normalized match. Plus a `rewrite(html,
  products)` that, for each `<a href="product-*.html">TEXT</a>`, replaces the href with
  `${slug}.html` when `resolveProductLink` is confident, else leaves it and records a warning.

- [ ] **Step 1: Write the failing test**

```js
// test/rewire.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProductLink, rewrite } from '../tools/rewire-links.mjs';

const products = [
  { slug: 'york-fitness-bench', name: 'YORK Fitness Bench' },
  { slug: 'vinyl-fitbell', name: 'Vinyl Fitbell' },
];

test('normalized matching resolves menu text to slug', () => {
  assert.equal(resolveProductLink('Fitness Bench', products).slug, 'york-fitness-bench');
  assert.equal(resolveProductLink('Vinyl Fitbell (Multi-Color)', products).slug, 'vinyl-fitbell');
  assert.equal(resolveProductLink('Nonexistent Widget', products), null);
});

test('rewrite retargets confident links and leaves unknowns', () => {
  const { html, warnings } = rewrite(
    '<a href="product-generic.html">Fitness Bench</a><a href="product-generic.html">Mystery</a>',
    products,
  );
  assert.match(html, /href="york-fitness-bench\.html">Fitness Bench/);
  assert.match(html, /href="product-generic\.html">Mystery/);
  assert.equal(warnings.length, 1);
});
```

- [ ] **Step 2: Run** `node --test test/rewire.test.js` → FAIL.
- [ ] **Step 3:** Implement `resolveProductLink` + `rewrite`; CLI applies `rewrite` to every
  `*.html` at root, printing the full warning list. Normalization drops a leading `york`,
  parenthetical suffixes `(…)`, and non-alphanumerics before comparing.
- [ ] **Step 4: Run** `node --test test/rewire.test.js` → PASS. Then `npm run rewire`, review
  the printed diff + warnings with Adam, resolve unmatched links by hand. Re-run
  `npm run verify` → `VERIFY OK`.
- [ ] **Step 5: Commit**

```bash
git add tools/rewire-links.mjs test/rewire.test.js *.html
git commit -m "feat: rewire product links to real PDP slugs (reviewed)"
```

---

### Task 17: Retire templates + README

**Files:**
- Move: `product-single.html` → `templates/single.src.html` (kept as human reference of the
  pre-tokenized source); same for generic/package. Delete the root copies.
- Modify: `README.md` (page table, generator docs, "generated — do not edit" note)

- [ ] **Step 1:** `git mv product-single.html templates/single.src.html` (and generic,
  package). Confirm no page links to the retired root filenames (`npm run verify` covers
  this).
- [ ] **Step 2:** Update `README.md`: replace the 3 PDP-template rows with "23 per-product
  pages, generated"; add a "Product data & generator" section (how to edit `products.json`,
  run `npm run build`, `npm run verify`; note generated `<slug>.html` files must not be
  hand-edited); note the site itself still has no build step.
- [ ] **Step 3:** Add a banner comment to the generator output (in `renderHead`, Task 4):
  `<!-- GENERATED by tools/build-products.mjs from data/products.json — do not edit by hand -->`.
  Add a partials test asserting the banner is present; re-run `npm run build`.
- [ ] **Step 4: Run** `npm test && npm run build && npm run verify`. Expected: all pass,
  `Wrote 23 pages.`, `VERIFY OK`.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: retire PDP templates to templates/, document generator in README"
```

---

## Phase 1 done when

- `npm test` green; `npm run build` writes 23 pages; `npm run verify` = `VERIFY OK`.
- 23 `<slug>.html` at root, each self-contained, real copy + images + traceable price (or
  visible `Price TBD`), quantity buy box.
- Every product link that confidently resolves points at its real page; none point at a
  retired template; unmatched links reported, not guessed.
- README updated. Branch `product-pdps` ready for Adam's walkthrough.

## Explicitly deferred (not gaps — decided out of scope)

- **PLP/collection card prices & titles.** Task 16 retargets `href`s only. Fixing the junk
  card prices (`$1,000.00` ×49, the `$1,2200.00` typo) and placeholder titles from
  `products.json` is deferred to the future PLP pass (Adam's call). The card links will be
  correct after Task 16; the card *content* stays as-is for now.
- **Retired templates kept as reference.** Task 17 moves them to `templates/*.src.html`
  rather than deleting, preserving a human-readable pre-tokenized reference. If Adam prefers
  a clean delete, drop that in Task 17.

## Deferred to Phase 2 (separate plan, written after Phase 1)

The five custom variant selectors (weight-selector, tier-selector, package-selector,
set-or-individual, accessories) + `js/pdp.js` interactivity + their 1440/390 responsive
checks, swapped into the ~6 affected products. Phase 2 is deliberately NOT planned yet: its
tasks depend on the exact partial signatures and the real per-option data (weights/tiers/
prices from Figma + yorkbarbell.com) that only exist once Phase 1 is built — planning it now
would require placeholders, which this plan format forbids.
