# York Phase 2 — Weight-Selector Variant (Bumper Plates + Slam Ball)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quantity stepper on the two "sold individually" products (Rubber Training Bumper Plates, Slam Ball) with a Figma-matched weight-selector matrix — one row per weight with its own price + qty stepper and a live subtotal.

**Architecture:** A `variantBlock(p)` dispatcher in `templates/shared.js` picks the buy-box control by `product.variants.type` (`quantity` default → existing stepper; `weight-selector` → new matrix). Options + prices live in `products.json`. Interactivity is added to `js/chrome.js` (where the existing PDP qty stepper already lives and which every PDP loads — `js/pdp.js` is empty and not loaded). CSS in `css/pages.css`. Progressive enhancement: real form controls; JS only recomputes the subtotal.

**Tech Stack:** Node ESM generator (`npm run build`), `node --test`, vanilla JS/CSS, zero deps. First slice of the 6-type variant model in the approved PDP spec (`2026-07-15-york-product-pdps-design.md`, "Variant selectors").

## Global Constraints

- **Zero dependencies.** `node --test` only.
- **No site build step.** `npm run build` regenerates the committed `<slug>.html`; the site is static.
- **Prices are real, from yorkbarbell.com** (scraped from the live WooCommerce variation JSON 2026-07-20 — see Appendix). Do NOT invent or alter them.
- **Weight rows show a single current price, no sale strikethrough** (the live site has no per-weight sale; Adam's call). The PLP-card `compareAt` sale badge for these two is a separate, out-of-scope inconsistency — leave it.
- **All qty default 0**, subtotal starts `$0.00` (sold-individually, pick-your-own). Add To Cart stays decorative (`#cart`).
- **Text case:** ALL CAPS display/heading, sentence body, title labels.
- **Duplicate hero/title block gotcha** (`css/pages.css` ~5520) is about hero/title font-size only — irrelevant here, but keep new selectors out of that shared block.
- **Branch:** create `variant-weight-selector` off `main` (`main` is at `54d6ba4`, pushed).

## File structure

| File | Responsibility |
|---|---|
| `data/products.json` | **modify** — set `variants` for the 2 products to the weight-selector shape + options. |
| `lib/products.js` | **modify** — extend `validateProduct` to check the weight-selector variant shape. |
| `templates/shared.js` | **modify** — add `weightSelectorHtml(p)` + `variantBlock(p)` dispatcher. |
| `templates/generic.js` | **modify** — render `${variantBlock(p)}` instead of `${quantityHtml()}`. |
| `css/pages.css` | **modify** — add `.pdp__weight-selector` styles. |
| `js/chrome.js` | **modify** — add the weight-matrix stepper + live subtotal, beside the existing PDP qty selector (~line 811). |
| `tools/variants.test.mjs` | **new** — unit tests for the renderer + dispatcher + validation. |

---

## Task 1: Variant data + validation

**Files:**
- Modify: `data/products.json` (the 2 products' `variants`)
- Modify: `lib/products.js` (`validateProduct`)
- Test: `tools/variants.test.mjs`

**Interfaces:**
- Produces: each product's `variants = { type: 'weight-selector', soldIndividually: true, options: [{ weight: string, price: number }] }`.

- [ ] **Step 1: Set `variants` on `rubber-training-bumper-plates`** in `data/products.json`:

```json
"variants": {
  "type": "weight-selector",
  "soldIndividually": true,
  "options": [
    { "weight": "10 lb", "price": 20.80 },
    { "weight": "15 lb", "price": 30.00 },
    { "weight": "25 lb", "price": 52.00 },
    { "weight": "35 lb", "price": 72.80 },
    { "weight": "45 lb", "price": 93.60 }
  ]
}
```

- [ ] **Step 2: Set `variants` on `slam-ball`** in `data/products.json`:

```json
"variants": {
  "type": "weight-selector",
  "soldIndividually": true,
  "options": [
    { "weight": "5 lb", "price": 9.75 },
    { "weight": "10 lb", "price": 13.00 },
    { "weight": "15 lb", "price": 19.50 },
    { "weight": "20 lb", "price": 26.00 },
    { "weight": "25 lb", "price": 32.50 },
    { "weight": "30 lb", "price": 39.00 },
    { "weight": "35 lb", "price": 45.50 },
    { "weight": "40 lb", "price": 52.00 },
    { "weight": "45 lb", "price": 58.50 },
    { "weight": "50 lb", "price": 65.00 }
  ]
}
```

- [ ] **Step 3: Write the failing validation test** in `tools/variants.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProducts, validateProduct } from '../lib/products.js';

const products = loadProducts('data/products.json');
const bySlug = new Map(products.map((p) => [p.slug, p]));

test('the 2 weight-selector products have valid option data', () => {
  for (const slug of ['rubber-training-bumper-plates', 'slam-ball']) {
    const p = bySlug.get(slug);
    assert.equal(p.variants.type, 'weight-selector');
    assert.ok(Array.isArray(p.variants.options) && p.variants.options.length >= 1);
    for (const o of p.variants.options) {
      assert.match(o.weight, /\d+\s*lb/i);
      assert.equal(typeof o.price, 'number');
      assert.ok(o.price > 0);
    }
    assert.deepEqual(validateProduct(p), []); // no validation errors
  }
});

test('validateProduct rejects a malformed weight-selector', () => {
  const bad = { ...bySlug.get('slam-ball'), variants: { type: 'weight-selector', options: [{ weight: '5 lb' }] } };
  assert.ok(validateProduct(bad).some((e) => /weight-selector|price/i.test(e)));
});
```

- [ ] **Step 4: Run, verify fail** — `node --test tools/variants.test.mjs` → FAIL (validateProduct doesn't check variants yet, so the malformed case passes and the assertion fails).

- [ ] **Step 5: Extend `validateProduct` in `lib/products.js`.** Add, before the final `return e;`:

```js
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
```

- [ ] **Step 6: Run, verify pass** — `node --test tools/variants.test.mjs` → PASS. Also `npm test` → whole suite green.

- [ ] **Step 7: Commit**

```bash
git add data/products.json lib/products.js tools/variants.test.mjs
git commit -m "feat: weight-selector variant data + validation (bumper plates, slam ball)"
```

---

## Task 2: Renderer + dispatcher, wired into the generic template

**Files:**
- Modify: `templates/shared.js` (`weightSelectorHtml`, `variantBlock`)
- Modify: `templates/generic.js` (use `variantBlock`)
- Test: `tools/variants.test.mjs`

**Interfaces:**
- Consumes: `product.variants` from Task 1; `escapeHtml`/`formatPrice` already imported in `shared.js`.
- Produces: `weightSelectorHtml(p) -> string` (the `.pdp__weight-selector` matrix); `variantBlock(p) -> string` (dispatches on `p.variants?.type`, default = existing `quantityHtml()`).

- [ ] **Step 1: Write failing tests** (append to `tools/variants.test.mjs`):

```js
import { weightSelectorHtml, variantBlock } from '../templates/shared.js';

test('variantBlock falls back to the quantity stepper for type=quantity', () => {
  assert.match(variantBlock({ variants: { type: 'quantity' } }), /pdp__quantity/);
  assert.match(variantBlock({}), /pdp__quantity/); // missing variants -> quantity
});

test('weightSelectorHtml renders one row per weight with price data + a subtotal', () => {
  const p = bySlug.get('rubber-training-bumper-plates');
  const h = weightSelectorHtml(p);
  assert.match(h, /data-weight-selector/);
  assert.equal((h.match(/data-weight-row/g) || []).length, 5);
  assert.match(h, /data-weight-price="20.80"[^>]*>\$20\.80 each/);
  assert.match(h, /data-weight-qty[^>]*value="0"/);
  assert.match(h, /data-weight-subtotal[^>]*>\$0\.00/);
});

test('variantBlock routes weight-selector products to the matrix', () => {
  assert.match(variantBlock(bySlug.get('slam-ball')), /data-weight-selector/);
});
```

- [ ] **Step 2: Run, verify fail** — `node --test tools/variants.test.mjs` → FAIL (exports missing).

- [ ] **Step 3: Implement in `templates/shared.js`** (place beside `quantityHtml`). `formatPrice` and `escapeHtml` are already imported at the top of the file:

```js
// Sold-individually weight matrix (Bumper Plates, Slam Ball). One row per weight:
// label + per-unit price + qty stepper (default 0), then a live subtotal. Rendered
// in the buy box in place of the quantity stepper. Interactivity: js/chrome.js.
export function weightSelectorHtml(p) {
  const rows = p.variants.options.map((o) => {
    const price = o.price.toFixed(2);
    return `            <div class="pdp__weight-row" data-weight-row>
              <span class="pdp__weight-name">${escapeHtml(o.weight)}</span>
              <span class="pdp__weight-price" data-weight-price="${price}">${formatPrice(o.price)} each</span>
              <div class="pdp__weight-stepper">
                <button type="button" class="pdp__weight-btn" data-weight-decrement aria-label="Decrease ${escapeHtml(o.weight)} quantity">–</button>
                <input class="pdp__weight-qty" type="text" inputmode="numeric" value="0" data-weight-qty aria-label="${escapeHtml(o.weight)} quantity">
                <button type="button" class="pdp__weight-btn" data-weight-increment aria-label="Increase ${escapeHtml(o.weight)} quantity">+</button>
              </div>
            </div>`;
  }).join('\n');
  return `          <div class="pdp__weight-selector" data-weight-selector>
            <p class="pdp__weight-selector-label">Sold Individually</p>
            <div class="pdp__weight-grid">
${rows}
            </div>
            <div class="pdp__weight-subtotal">
              <span class="pdp__weight-subtotal-label">Subtotal</span>
              <span class="pdp__weight-subtotal-value" data-weight-subtotal>$0.00</span>
            </div>
          </div>`;
}

// Buy-box control dispatcher: quantity stepper by default, or a custom variant
// block per product.variants.type. New variant types (tier/set/accessories) plug
// in here as later Phase-2 slices.
export function variantBlock(p) {
  switch (p?.variants?.type) {
    case 'weight-selector': return weightSelectorHtml(p);
    default: return quantityHtml();
  }
}
```

- [ ] **Step 4: Wire `templates/generic.js`.** Add `variantBlock` to the import from `./shared.js`, then replace `${quantityHtml()}` (line ~96) with `${variantBlock(p)}`. Leave the `quantityHtml` import in place (still referenced by the dispatcher via shared.js; if lint flags it unused in generic.js, drop it from generic.js's import only).

- [ ] **Step 5: Run, verify pass** — `npm test` → all green.

- [ ] **Step 6: Build + confirm the 2 pages changed, 21 others unchanged**

```bash
npm run build
git status --short   # expect only rubber-training-bumper-plates.html + slam-ball.html changed among PDPs
grep -c 'data-weight-row' rubber-training-bumper-plates.html   # expect 5
grep -c 'data-weight-row' slam-ball.html                       # expect 10
grep -c 'pdp__quantity' york-fitness-bench.html                # expect >=1 (unchanged control on a quantity product)
```

- [ ] **Step 7: Commit**

```bash
git add templates/shared.js templates/generic.js tools/variants.test.mjs rubber-training-bumper-plates.html slam-ball.html
git commit -m "feat: weight-selector renderer + variant dispatcher; build the 2 PDPs"
```

---

## Task 3: Styling + interactivity (the visual/behavioral layer)

**Files:**
- Modify: `css/pages.css`
- Modify: `js/chrome.js`

No unit test (DOM/visual, like the existing qty stepper which also has none) — verified in the browser at Step 4.

- [ ] **Step 1: Add CSS to `css/pages.css`** (near the `.pdp__quantity` rules; use existing tokens/vars for color + spacing, matching comp `3018:22501`):

```css
/* PDP weight selector (sold-individually matrix) */
.pdp__weight-selector { margin: 24px 0; border: 1px solid var(--neutral-200, #d9d9d9); border-radius: 4px; padding: 16px; }
.pdp__weight-selector-label { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 14px; margin: 0 0 12px; }
.pdp__weight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
.pdp__weight-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pdp__weight-name { font-weight: 700; min-width: 3.5em; }
.pdp__weight-price { color: var(--text-accent, #da291c); font-size: 14px; white-space: nowrap; }
.pdp__weight-stepper { display: inline-flex; align-items: center; border: 1px solid var(--neutral-200, #d9d9d9); }
.pdp__weight-btn { width: 32px; height: 32px; background: none; border: none; cursor: pointer; font-size: 18px; line-height: 1; }
.pdp__weight-qty { width: 40px; height: 32px; text-align: center; border: none; border-left: 1px solid var(--neutral-200, #d9d9d9); border-right: 1px solid var(--neutral-200, #d9d9d9); }
.pdp__weight-subtotal { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--neutral-200, #d9d9d9); font-weight: 700; }
.pdp__weight-subtotal-value { font-size: 20px; }
@media (max-width: 767px) { .pdp__weight-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 2: Add interactivity to `js/chrome.js`** (right after the existing PDP quantity selector block, ~line 830):

```js
// ── PDP weight selector (sold-individually matrix) ──
// Per-row steppers update the row qty; the subtotal re-sums qty*price live.
// No-op on pages without a [data-weight-selector].
document.querySelectorAll('[data-weight-selector]').forEach((sel) => {
  const rows = [...sel.querySelectorAll('[data-weight-row]')];
  const subtotalEl = sel.querySelector('[data-weight-subtotal]');
  const recompute = () => {
    let total = 0;
    for (const row of rows) {
      const qty = Math.max(0, parseInt(row.querySelector('[data-weight-qty]').value, 10) || 0);
      const price = parseFloat(row.querySelector('[data-weight-price]').dataset.weightPrice) || 0;
      total += qty * price;
    }
    subtotalEl.textContent = `$${total.toFixed(2)}`;
  };
  for (const row of rows) {
    const qty = row.querySelector('[data-weight-qty]');
    row.querySelector('[data-weight-decrement]').addEventListener('click', () => {
      qty.value = Math.max(0, (parseInt(qty.value, 10) || 0) - 1); recompute();
    });
    row.querySelector('[data-weight-increment]').addEventListener('click', () => {
      qty.value = (parseInt(qty.value, 10) || 0) + 1; recompute();
    });
    qty.addEventListener('input', () => { qty.value = qty.value.replace(/[^0-9]/g, ''); recompute(); });
  }
  recompute();
});
```

- [ ] **Step 3: Serve + browser-verify** — `npx serve . -l 4599`, open `http://localhost:4599/rubber-training-bumper-plates.html` at 1440px:
  - the buy box shows the "Sold Individually" matrix (5 rows) instead of a single quantity stepper;
  - incrementing 45 lb ($93.60) once makes Subtotal read `$93.60`; add 10 lb ($20.80) → `$114.40`; decrement back → updates live;
  - check `slam-ball.html` (10 rows) and one quantity product (e.g. `york-fitness-bench.html`) is unchanged;
  - resize to 390px → grid collapses to one column.

- [ ] **Step 4: Commit**

```bash
git add css/pages.css js/chrome.js
git commit -m "feat: weight-selector styles + live-subtotal interactivity"
```

**REVIEW CHECKPOINT** — show Adam both PDPs (desktop + mobile) and the live subtotal before finishing.

---

## Task 4: Verify + finish

- [ ] **Step 1: Full verification**

Run: `npm test && npm run verify`
Expected: tests green; `VERIFY OK` (the 2 rebuilt PDPs still pass link/token checks).

- [ ] **Step 2: Finish the branch** — invoke `superpowers:finishing-a-development-branch` to merge `variant-weight-selector` → `main` (or PR), per Adam's choice.

---

## Self-review (against the confirmed design)

**Coverage:** data model → Task 1; renderer + dispatcher → Task 2; Figma-matched UI (matrix, per-row price+stepper, subtotal) → Tasks 2–3; progressive-enhancement JS → Task 3; responsive (1440 + mobile) → Task 3 Step 3; real scraped prices → Task 1 + Appendix; quantity products untouched → Task 2 Step 6. ✅

**Placeholders:** all code + data literal; CSS uses existing token vars with hex fallbacks; no TBDs. ✅

**Type consistency:** `variantBlock(p)` / `weightSelectorHtml(p)` names stable across shared.js, generic.js, and tests; data attributes (`data-weight-selector`, `data-weight-row`, `data-weight-price`, `data-weight-qty`, `data-weight-subtotal`) identical in renderer (Task 2) and JS (Task 3). ✅

---

## Appendix — scraped source data (yorkbarbell.com, 2026-07-20)

From the live WooCommerce `data-product_variations` JSON (`display_price`):
- **Bumper Plates** `https://yorkbarbell.com/product/rubber-training-bumper-plate/` — 10/$20.80, 15/$30.00, 25/$52.00, 35/$72.80, 45/$93.60 (sold individually).
- **Slam Ball** `https://yorkbarbell.com/product/slam-ball/` — 5/$9.75, 10/$13.00, 15/$19.50, 20/$26.00, 25/$32.50, 30/$39.00, 35/$45.50, 40/$52.00, 45/$58.50, 50/$65.00 (sold individually).

No per-weight sale on the live site (current price == regular). Reviewed + approved by Adam 2026-07-20.
