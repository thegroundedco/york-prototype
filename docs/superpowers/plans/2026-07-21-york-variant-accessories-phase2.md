# York Phase 2 — Accessories Selector (Power Cage) — FINAL slice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `fts-power-cage` a "Popular Accessories" checkbox list — each accessory links to its yorkbarbell.com page and, when checked, adds to a live Total (base cage + selected add-ons).

**Architecture:** `variantBlock(p)` gains an `accessories` case → `accessoriesHtml(p)`; interactivity in `js/chrome.js`; CSS in `css/pages.css`. `fts-power-cage` is a `single` template — this slice **wires `variantBlock` into `single.js`** (the last of the 3 templates; the other 4 single products fall through to the quantity stepper unchanged). This is the 6th and final variant type.

**Tech Stack:** Node ESM generator, `node --test`, vanilla JS/CSS, zero deps.

## Global Constraints

- **Zero deps; no site build step.**
- **Prices REAL** (yorkbarbell.com, 2026-07-21): base cage $927.64; Hi/Low Pulley $748.88, Weight Stack Conversion Kit $665.49, Plate Storage Attachment $103.90, 2″ Olympic Adapter Sleeve $25.00. Do not alter.
- **External links** to yorkbarbell.com accessory pages open in a new tab (`target="_blank" rel="noopener noreferrer"`) — the client's own site, per spec.
- **Base price** comes from `p.price.current` (not duplicated in `variants`).
- **CRLF cache-bust gotcha:** after `npm run build`, revert every rebuilt PDP except `fts-power-cage.html`.
- **Text case:** ALL CAPS display/heading, sentence body, title labels.
- **Branch:** `variant-accessories` off `main` (`main` @ `ab7a2a8`, pushed).

## File structure

| File | Responsibility |
|---|---|
| `data/products.json` | **modify** — `variants` for `fts-power-cage`. |
| `lib/products.js` | **modify** — validate the accessories shape. |
| `templates/shared.js` | **modify** — `accessoriesHtml(p)` + dispatcher case. |
| `templates/single.js` | **modify** — render `variantBlock(p)` instead of `quantityHtml()`. |
| `css/pages.css` | **modify** — `.pdp__acc` checkbox-list styles. |
| `js/chrome.js` | **modify** — checkbox → live total (base + checked). |
| `tools/variants.test.mjs` | **modify** — tests. |

---

## Task 1: Variant data + validation

**Files:** Modify `data/products.json`, `lib/products.js`; test `tools/variants.test.mjs`.

**Interfaces:** Produces `variants = { type: 'accessories', options: [{ label, price, url }] }`.

- [ ] **Step 1: Set `variants` on `fts-power-cage`.** Slug-anchored replace of its `"variants": { "type": "quantity" }` (4-space indent, CRLF). Use a scratch node script (like `tools/set-weight-variants.mjs`) or careful Edit. Target content:

```json
"variants": {
      "type": "accessories",
      "options": [
        { "label": "Hi/Low Pulley Option", "price": 748.88, "url": "https://yorkbarbell.com/product/ft-hi-low-pulley-option-power-cage-weight-carriage/" },
        { "label": "Weight Stack Conversion Kit", "price": 665.49, "url": "https://yorkbarbell.com/product/ft-200-lb-weight-stack-conversion-kit-power-cage-lat-machine/" },
        { "label": "Plate Storage Attachment", "price": 103.90, "url": "https://yorkbarbell.com/product/ft-plate-storage-attachment-power-cage/" },
        { "label": "2\" Olympic Adapter Sleeve", "price": 25.00, "url": "https://yorkbarbell.com/product/ft-2-inch-olympic-adapter-sleeve/" }
      ]
    }
```
Verify: `node -e "require('./data/products.json')"` must not throw.

- [ ] **Step 2: Write failing validation test** (append):

```js
test('the accessories product has valid option data', () => {
  const p = bySlug.get('fts-power-cage');
  assert.equal(p.variants.type, 'accessories');
  assert.equal(p.variants.options.length, 4);
  for (const o of p.variants.options) { assert.ok(o.label); assert.ok(o.price > 0); assert.match(o.url, /^https:\/\/yorkbarbell\.com\//); }
  assert.deepEqual(validateProduct(p), []);
});

test('validateProduct rejects an accessories option missing url', () => {
  const bad = { ...bySlug.get('fts-power-cage'), variants: { type: 'accessories', options: [{ label: 'X', price: 10 }] } };
  assert.ok(validateProduct(bad).some((e) => /accessories|url/i.test(e)));
});
```

- [ ] **Step 3: Run, verify fail.**

- [ ] **Step 4: Extend `validateProduct` in `lib/products.js`** (before `return e;`):

```js
  if (p.variants && p.variants.type === 'accessories') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) e.push('accessories: options must be a non-empty array');
    else opts.forEach((o, i) => {
      if (!o?.label) e.push(`accessories option ${i}: label required`);
      if (typeof o?.price !== 'number' || !(o.price > 0)) e.push(`accessories option ${i}: price must be a positive number`);
      if (typeof o?.url !== 'string' || !/^https?:\/\//.test(o.url)) e.push(`accessories option ${i}: url must be an absolute link`);
    });
  }
```

- [ ] **Step 5: Run, verify pass** — `npm test` green.

- [ ] **Step 6: Commit**

```bash
git add data/products.json lib/products.js tools/variants.test.mjs
git commit -m "feat: accessories variant data + validation (power cage)"
```

---

## Task 2: Renderer + dispatcher + single template

**Files:** Modify `templates/shared.js`, `templates/single.js`; test `tools/variants.test.mjs`.

**Interfaces:** Produces `accessoriesHtml(p) -> string`; `variantBlock` gains `case 'accessories'`.

- [ ] **Step 1: Write failing tests** (append):

```js
import { accessoriesHtml } from '../templates/shared.js';

test('accessoriesHtml renders a checkbox per accessory, external links, base total', () => {
  const h = accessoriesHtml(bySlug.get('fts-power-cage'));
  assert.equal((h.match(/data-acc-check/g) || []).length, 4);
  assert.match(h, /data-acc-base="927.64"/);
  assert.match(h, /href="https:\/\/yorkbarbell\.com\/product\/ft-hi-low-pulley[^"]*"[^>]*target="_blank"/);
  assert.match(h, /pdp__acc-price">\$748\.88/);
  assert.match(h, /data-acc-total[^>]*>\$927\.64/);
});

test('variantBlock routes accessories to the checkbox list', () => {
  assert.match(variantBlock(bySlug.get('fts-power-cage')), /data-acc\b/);
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `accessoriesHtml` in `templates/shared.js`** (beside `packageSelectorHtml`):

```js
// "Popular Accessories" add-on list (Power Cage). Each accessory links out to
// its yorkbarbell.com page; checking it adds to the live total (base + selected).
export function accessoriesHtml(p) {
  const base = p.price?.current || 0;
  const opts = p.variants.options.map((o) => {
    return `              <label class="pdp__acc-option">
                <input type="checkbox" class="pdp__acc-check" value="${o.price.toFixed(2)}" data-acc-check>
                <span class="pdp__acc-name"><a href="${o.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(o.label)}</a></span>
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

Add to `variantBlock`'s switch: `case 'accessories': return accessoriesHtml(p);`

- [ ] **Step 4: Wire `templates/single.js`.** Replace `quantityHtml` with `variantBlock` in the `./shared.js` import (line 6), then replace `${quantityHtml()}` (line ~111) with `${variantBlock(p)}`. The other 4 single products have `variants.type === 'quantity'` → `variantBlock` returns the identical quantity stepper, so their output is unchanged.

- [ ] **Step 5: Run, verify pass** — `npm test` green.

- [ ] **Step 6: Build + keep only the target + confirm others unchanged**

```bash
npm run build
for f in $(git diff --name-only -- '*.html'); do [ "$f" = fts-power-cage.html ] || git checkout -- "$f"; done
git diff --name-only -- '*.html'                 # expect only fts-power-cage.html
grep -c 'data-acc-check' fts-power-cage.html          # expect 4
grep -c 'pdp__quantity' york-fitness-bench.html       # expect >=1 (another single product still has the stepper)
grep -c 'data-acc' york-fitness-bench.html            # expect 0
```

- [ ] **Step 7: Commit**

```bash
git add templates/shared.js templates/single.js tools/variants.test.mjs fts-power-cage.html
git commit -m "feat: accessories renderer + dispatcher; wire single template; build power cage PDP"
```

---

## Task 3: Styling + interactivity

**Files:** Modify `css/pages.css`, `js/chrome.js`. Browser-verified.

- [ ] **Step 1: Add CSS to `css/pages.css`** (after the `.pdp__pkg` block):

```css
/* Accessories add-ons — "Popular Accessories" (Power Cage) */
.pdp-page .pdp__acc { display: flex; flex-direction: column; gap: var(--space-12); }
.pdp-page .pdp__acc-label { font-family: var(--font-family-body); font-size: var(--font-size-16); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-neutral-1000); margin: 0; }
.pdp-page .pdp__acc-options { display: flex; flex-direction: column; gap: var(--space-8); border: 0; padding: 0; margin: 0; }
.pdp-page .pdp__acc-option { display: flex; align-items: center; gap: var(--space-12); padding: var(--space-12) var(--space-16); border: 1px solid var(--color-neutral-1000); cursor: pointer; }
.pdp-page .pdp__acc-option:has(.pdp__acc-check:checked) { box-shadow: inset 0 0 0 1px var(--color-neutral-1000); background: var(--cream-base, #fbf7eb); }
.pdp-page .pdp__acc-check { flex: 0 0 auto; width: 18px; height: 18px; accent-color: var(--accent-default); }
.pdp-page .pdp__acc-name { flex: 1 1 auto; font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--color-neutral-1000); }
.pdp-page .pdp__acc-name a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.pdp-page .pdp__acc-name a:hover { color: var(--accent-default); }
.pdp-page .pdp__acc-price { flex: 0 0 auto; font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--accent-default); white-space: nowrap; }
.pdp-page .pdp__acc-total { display: flex; justify-content: space-between; align-items: baseline; padding-top: var(--space-12); border-top: 1px solid var(--color-neutral-1000); font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--color-neutral-1000); }
.pdp-page .pdp__acc-total-label { text-transform: uppercase; letter-spacing: 0.04em; }
.pdp-page .pdp__acc-total-value { font-size: var(--font-size-20); }
```

- [ ] **Step 2: Add interactivity to `js/chrome.js`** (after the package block):

```js
// ── PDP accessories add-ons ──
// Total = base cage price + sum of checked add-ons. No-op without [data-acc].
document.querySelectorAll('[data-acc]').forEach((acc) => {
  const base = parseFloat(acc.dataset.accBase) || 0;
  const checks = [...acc.querySelectorAll('[data-acc-check]')];
  const totalEl = acc.querySelector('[data-acc-total]');
  const update = () => {
    let total = base;
    for (const c of checks) if (c.checked) total += parseFloat(c.value) || 0;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  };
  checks.forEach((c) => c.addEventListener('change', update));
  update();
});
```

- [ ] **Step 3: Serve + browser-verify** — `npx serve . -l 4599`, open `fts-power-cage.html` at 1440:
  - "Popular Accessories" shows 4 checkbox rows (name links + price); Total starts at $927.64 (base, none checked).
  - Check Hi/Low Pulley ($748.88) → Total $1,676.52; also check Plate Storage ($103.90) → $1,780.42; uncheck → recalculates.
  - An accessory name link opens its yorkbarbell.com page in a new tab.
  - Another single product (`york-fitness-bench.html`) still shows the plain quantity stepper.
  - 390px stacks cleanly.

- [ ] **Step 4: Commit**

```bash
git add css/pages.css js/chrome.js
git commit -m "feat: accessories checkbox styles + live add-on total"
```

**REVIEW CHECKPOINT** — show Adam the PDP (base + a couple add-ons checked; desktop + mobile).

---

## Task 4: Verify + finish (completes Phase 2 variant selectors)

- [ ] **Step 1:** `npm test && npm run verify` → green + `VERIFY OK`.
- [ ] **Step 2:** Invoke `superpowers:finishing-a-development-branch` to merge `variant-accessories` → `main` (or PR). With this merged, **all 6 variant types across all 7 custom-variant products are done** — Phase 2 variant selectors complete.

---

## Self-review (against the confirmed design)

**Coverage:** real accessory data + links → Task 1; renderer + dispatcher → Task 2; single.js wired → Task 2 Step 4/6; checkbox add-ons + base+checked live total → Tasks 2–3; external links new-tab → Task 2/3; other single products unchanged → Task 2 Step 6; responsive → Task 3 Step 3. ✅

**Placeholders:** code + prices + URLs literal; no TBDs. ✅

**Type consistency:** `accessoriesHtml(p)` + `data-acc*` attributes identical across shared.js (Task 2) and chrome.js (Task 3); `data-acc-base` read by the JS matches the renderer's attribute; `variants.options[].{label,price,url}` identical across data, validator, renderer, tests. ✅
