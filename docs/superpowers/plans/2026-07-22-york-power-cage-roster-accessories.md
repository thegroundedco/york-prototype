# Power Cage Roster-Only Popular Accessories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Power Cage PDP's four outbound yorkbarbell.com "Popular Accessories" with four roster products referenced by slug, resolved to name/price/internal-link at build time.

**Architecture:** `data/products.json` stores slug-only accessory options; a new `resolveAccessories(product, allProducts)` in `templates/index.js` (mirroring `resolveRelated`, but throwing on unknown slugs) attaches `accessoryProducts: [{slug, name, price}]`; `accessoriesHtml` in `templates/shared.js` renders from that resolved list with internal same-tab links. `js/chrome.js` and CSS are untouched.

**Tech Stack:** Zero-dep Node (ESM), `node --test`, committed static HTML (no site build step). Repo: `C:\Users\Adam Tarr\The Grounded Company Dropbox\CLIENTS\York Barbell\04_Website\00_Experiementation\01_York Claude\york-prototype\york-prototype` (all paths below relative to this). Work on branch `power-cage-roster-accessories` (already created, spec committed).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-york-power-cage-roster-accessories-design.md` — read it first.
- The four accessories (exact order): `fts-flat-to-incline-utility-bench`, `mens-north-american-chrome-olympic-training-weight-bar`, `olympic-a-frame-weight-plate-tree`, `york-quick-access-collar`.
- `js/chrome.js`, `css/pages.css`, and every product other than `fts-power-cage` are untouched.
- CRLF cache-bust gotcha: `npm run build` rewrites all 22 PDPs but on this Windows box the only diff on non-target PDPs is the CSS `?v=<sha1>` hash. After building, revert every rebuilt PDP except `fts-power-cage.html` (`git checkout -- <others>`).
- Suite must be green at every commit (`npm test`).
- Commit messages end with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01QXwcr8bgVpCDSfnHCGMjvL`

---

### Task 1: `resolveAccessories` resolver

Pure addition — nothing existing changes, suite stays green.

**Files:**
- Modify: `templates/index.js` (append after `resolveRelated`, ~line 60)
- Test: `tools/variants.test.mjs` (append at end of file)

**Interfaces:**
- Consumes: nothing new.
- Produces: `resolveAccessories(product, allProducts)` exported from `templates/index.js`. For a product whose `variants.type === 'accessories'`, returns `{ ...product, accessoryProducts: [{ slug, name, price }] }` where `price` is the resolved product's `price.current` (a number). Throws `Error` on an unknown slug or a resolved product without `price.current > 0`. Returns any non-accessories product unchanged (same object). Tasks 2–3 rely on the `accessoryProducts` property name and the number-typed `price`.

- [ ] **Step 1: Write the failing tests**

Append to the end of `tools/variants.test.mjs`:

```js
// ── resolveAccessories (roster-only accessories) ────────────────────

test('resolveAccessories resolves slugs to {slug, name, price} from the roster', () => {
  const roster = [
    { slug: 'cage', name: 'Cage', price: { current: 900 }, variants: { type: 'accessories', options: [{ slug: 'bench' }, { slug: 'bar' }] } },
    { slug: 'bench', name: 'Utility Bench', price: { current: 351.04 } },
    { slug: 'bar', name: 'Training Bar', price: { current: 329.67 } },
  ];
  const r = resolveAccessories(roster[0], roster);
  assert.deepEqual(r.accessoryProducts, [
    { slug: 'bench', name: 'Utility Bench', price: 351.04 },
    { slug: 'bar', name: 'Training Bar', price: 329.67 },
  ]);
});

test('resolveAccessories throws on an unknown slug', () => {
  const roster = [
    { slug: 'cage', name: 'Cage', price: { current: 900 }, variants: { type: 'accessories', options: [{ slug: 'ghost' }] } },
  ];
  assert.throws(() => resolveAccessories(roster[0], roster), /ghost/);
});

test('resolveAccessories throws when a resolved accessory has no price', () => {
  const roster = [
    { slug: 'cage', name: 'Cage', price: { current: 900 }, variants: { type: 'accessories', options: [{ slug: 'freebie' }] } },
    { slug: 'freebie', name: 'Freebie' },
  ];
  assert.throws(() => resolveAccessories(roster[0], roster), /freebie/);
});

test('resolveAccessories passes non-accessories products through unchanged', () => {
  const p = bySlug.get('slam-ball');
  assert.equal(resolveAccessories(p, products), p);
});
```

And extend the imports at the top of `tools/variants.test.mjs` — the file currently has no import from `templates/index.js`, so add one below the existing `templates/shared.js` import (line 4):

```js
import { resolveAccessories } from '../templates/index.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tools/variants.test.mjs`
Expected: FAIL — `SyntaxError: The requested module '../templates/index.js' does not provide an export named 'resolveAccessories'`

- [ ] **Step 3: Implement `resolveAccessories`**

Append to `templates/index.js` after `resolveRelated`:

```js
// Resolves a curated accessories list ({slug}-only options — see the 2026-07-22
// power-cage spec) to real roster data {slug, name, price:number} for accessoriesHtml.
// Unlike resolveRelated, a bad slug THROWS: a curated add-on list with a missing
// product is a build failure, not a silent omission.
export function resolveAccessories(product, allProducts) {
  if (product?.variants?.type !== 'accessories') return product;
  const bySlug = new Map(allProducts.map((q) => [q.slug, q]));
  const accessoryProducts = product.variants.options.map((o) => {
    const q = bySlug.get(o.slug);
    if (!q) throw new Error(`accessories: unknown slug "${o.slug}" on ${product.slug}`);
    if (!(q.price?.current > 0)) throw new Error(`accessories: "${o.slug}" has no price.current`);
    return { slug: q.slug, name: q.name, price: q.price.current };
  });
  return { ...product, accessoryProducts };
}
```

- [ ] **Step 4: Run the full suite to verify green**

Run: `npm test`
Expected: all tests PASS (the 4 new ones included; nothing existing broken).

- [ ] **Step 5: Commit**

```bash
git add templates/index.js tools/variants.test.mjs
git commit -m "feat: resolveAccessories — slug->roster resolver for the accessories variant"
```
(with the Global Constraints trailer lines.)

---

### Task 2: Atomic swap — data, validation, renderer, pipeline

These four changes are coupled (the old renderer/validation reads `label/price/url` that the new data no longer has), so they land in one commit; the updated tests define the new contract.

**Files:**
- Modify: `data/products.json` (the `fts-power-cage` product's `variants` block)
- Modify: `lib/products.js:73-81` (accessories validation case)
- Modify: `templates/shared.js:322-344` (`accessoriesHtml`)
- Modify: `tools/build-products.mjs:15` (pipeline wiring)
- Test: `tools/variants.test.mjs` (the three existing accessories tests, ~lines 149-173)

**Interfaces:**
- Consumes: `resolveAccessories` from Task 1 (`accessoryProducts: [{slug, name, price:number}]`).
- Produces: `accessoriesHtml(p)` now requires `p.accessoryProducts` (a resolved product); `validateProduct` accessories case now requires each option to have a non-empty string `slug` (label/price/url no longer valid-or-required); `data/products.json` fts-power-cage options are slug-only.

- [ ] **Step 1: Rewrite the three existing accessories tests as the new failing contract**

In `tools/variants.test.mjs`, replace the bodies of the three tests under `// ── accessories ──…` (keep `variantBlock routes accessories…` as-is; it will keep passing once the renderer change lands via the resolved-product call):

```js
test('the accessories product has valid slug-only option data', () => {
  const p = bySlug.get('fts-power-cage');
  assert.equal(p.variants.type, 'accessories');
  assert.equal(p.variants.options.length, 4);
  assert.deepEqual(p.variants.options.map((o) => o.slug), [
    'fts-flat-to-incline-utility-bench',
    'mens-north-american-chrome-olympic-training-weight-bar',
    'olympic-a-frame-weight-plate-tree',
    'york-quick-access-collar',
  ]);
  for (const o of p.variants.options) assert.deepEqual(Object.keys(o), ['slug']);
  assert.deepEqual(validateProduct(p), []);
});

test('validateProduct rejects an accessories option missing slug', () => {
  const bad = { ...bySlug.get('fts-power-cage'), variants: { type: 'accessories', options: [{ label: 'X', price: 10 }] } };
  assert.ok(validateProduct(bad).some((e) => /accessories.*slug/i.test(e)));
});

test('accessoriesHtml renders a checkbox per accessory with internal same-tab roster links', () => {
  const h = accessoriesHtml(resolveAccessories(bySlug.get('fts-power-cage'), products));
  assert.equal((h.match(/data-acc-check/g) || []).length, 4);
  assert.match(h, /data-acc-base="927.64"/);
  assert.match(h, /href="fts-flat-to-incline-utility-bench\.html"/);
  assert.match(h, /href="york-quick-access-collar\.html"/);
  assert.doesNotMatch(h, /target="_blank"/);
  assert.doesNotMatch(h, /yorkbarbell\.com/);
  assert.match(h, /pdp__acc-price">\$351\.04/);
  assert.match(h, /pdp__acc-price">\$7\.80/);
  assert.match(h, /data-acc-total[^>]*>\$927\.64/);
});
```

Also update the `variantBlock routes accessories…` test's call to use the resolved product (the raw product no longer renders):

```js
test('variantBlock routes accessories to the checkbox list', () => {
  assert.match(variantBlock(resolveAccessories(bySlug.get('fts-power-cage'), products)), /data-acc\b/);
});
```

- [ ] **Step 2: Run tests to verify the new contract fails**

Run: `node --test tools/variants.test.mjs`
Expected: FAIL — slug-only data test fails (options still have label/price/url), renderer test fails (still external links).

- [ ] **Step 3: Swap the data**

In `data/products.json`, replace the `fts-power-cage` product's entire `variants` value with:

```json
{
  "type": "accessories",
  "options": [
    { "slug": "fts-flat-to-incline-utility-bench" },
    { "slug": "mens-north-american-chrome-olympic-training-weight-bar" },
    { "slug": "olympic-a-frame-weight-plate-tree" },
    { "slug": "york-quick-access-collar" }
  ]
}
```

- [ ] **Step 4: Swap the validation**

In `lib/products.js`, replace the accessories case (currently lines 73-81, the label/price/url checks) with:

```js
  if (p.variants && p.variants.type === 'accessories') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) e.push('accessories: options must be a non-empty array');
    else opts.forEach((o, i) => {
      if (typeof o?.slug !== 'string' || !o.slug) e.push(`accessories option ${i}: slug required`);
    });
  }
```

- [ ] **Step 5: Swap the renderer**

In `templates/shared.js`, replace `accessoriesHtml` (and its leading comment, currently lines 322-344) with:

```js
// "Popular Accessories" add-on list (Power Cage). Options are roster products
// resolved by templates/index.js resolveAccessories ({slug, name, price:number});
// each links to its own PDP (internal, same tab) and checking it adds its price
// to the live total (base + selected) via js/chrome.js [data-acc].
export function accessoriesHtml(p) {
  const base = p.price?.current || 0;
  const opts = p.accessoryProducts.map((o) => {
    return `              <label class="pdp__acc-option">
                <input type="checkbox" class="pdp__acc-check" value="${o.price.toFixed(2)}" data-acc-check>
                <span class="pdp__acc-name"><a href="${o.slug}.html">${escapeHtml(o.name)}</a></span>
                <span class="pdp__acc-price">${formatPrice(o.price)}</span>
              </label>`;
  }).join('\n');
  return `          <div class="pdp__acc" data-acc data-acc-base="${base.toFixed(2)}">
            <p class="pdp__acc-label">Popular Accessories</p>
            <fieldset class="pdp__acc-options">
${opts}
            </fieldset>
            <div class="pdp__acc-total">
              <span class="pdp__acc-total-label">Total</span>
              <span class="pdp__acc-total-value" data-acc-total>${formatPrice(base)}</span>
            </div>
          </div>`;
}
```

(Everything outside the option-row `<a>`/data-source lines is byte-identical to the old version — the CSS hooks and `data-` attributes must not change.)

- [ ] **Step 6: Wire the pipeline**

In `tools/build-products.mjs`: add `resolveAccessories` to the line-5 import —

```js
import { renderProduct, withRelatedFallback, resolveRelated, resolveAccessories } from '../templates/index.js';
```

— and change line 15 to:

```js
      const html = renderProduct(resolveAccessories(resolveRelated(withRelatedFallback(p, products), products), products));
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add data/products.json lib/products.js templates/shared.js tools/build-products.mjs tools/variants.test.mjs
git commit -m "feat: Power Cage Popular Accessories now roster products (slug-resolved, internal links)"
```
(with the Global Constraints trailer lines.)

---

### Task 3: Rebuild the page, verify, smoke-check

**Files:**
- Regenerate: `fts-power-cage.html` (only this one keeps its rebuild; all other rebuilt PDPs get reverted)

**Interfaces:**
- Consumes: Tasks 1-2 complete on the branch.
- Produces: the committed static `fts-power-cage.html` clients actually see.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: `22 written, 0 errors` (message format may vary; zero errors is the requirement).

- [ ] **Step 2: Revert the cache-bust churn on non-target PDPs**

`git status` will show ~22 modified PDP html files. Keep ONLY `fts-power-cage.html`; revert the rest:

```bash
git status --porcelain -- '*.html' | awk '{print $2}' | grep -v '^fts-power-cage.html$' | xargs -r git checkout --
```

Then `git status` — the only modified file should be `fts-power-cage.html` (plus nothing else).

- [ ] **Step 3: Verify + inspect the diff**

Run: `npm run verify` — expected OK (its known non-failing warnings about placeholder templates are fine).
Run: `git diff fts-power-cage.html` — expected changes ONLY inside the `pdp__acc` block: 4 internal `<a href="<slug>.html">` roster links (no `target="_blank"`, no yorkbarbell.com), prices $351.04 / $329.67 / $91.00 / $7.80, base/total still $927.64, plus possibly the CSS `?v=` hash line.

- [ ] **Step 4: Live smoke-check**

The dev server is already running at http://localhost:3000 (if not: `npx serve . -l 3000` in the repo root, background).

```bash
curl -s http://localhost:3000/fts-power-cage | grep -A2 'pdp__acc-name'
```
Expected: the four roster product names, each wrapped in `<a href="<slug>.html">`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/olympic-a-frame-weight-plate-tree
```
Expected: `200` (accessory links resolve).

- [ ] **Step 5: Commit**

```bash
git add fts-power-cage.html
git commit -m "build: fts-power-cage — roster accessories page regen"
```
(with the Global Constraints trailer lines.)
