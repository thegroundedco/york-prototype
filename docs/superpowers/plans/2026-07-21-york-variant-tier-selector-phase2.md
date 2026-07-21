# York Phase 2 — Tier Selector (Dumbbell Stand)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quantity stepper on `york-dumbbell-stand` (generic) with a "Select A Type" radio-card list — 2-Tier / 3-Tier / Mini 2-Tier, each with a short description + price — plus a qty stepper and a live total.

**Architecture:** Extends the established variant model — `variantBlock(p)` gains a `tier-selector` case rendering `tierSelectorHtml(p)`; interactivity in `js/chrome.js`; CSS in `css/pages.css`. Generic template already renders `variantBlock(p)`, so no template wiring.

**Tech Stack:** Node ESM generator, `node --test`, vanilla JS/CSS, zero deps. Third slice of the 6-type variant model.

## Global Constraints

- **Zero deps; no site build step.**
- **Prices are REAL** (yorkbarbell.com, 2026-07-21 — each tier is a separate live product): 2-Tier $253.50, 3-Tier $338.00, Mini 2-Tier $262.60. Current/sale prices; **no per-tier strikethrough**. Do not alter.
- **Radio cards, no thumbnails** (Adam's call): name + short description + price + radio. Default = first (2-Tier).
- **Descriptions** are placeholder copy I wrote (flagged for Adam to refine) — not from the sheet.
- **Text case:** ALL CAPS display/heading, sentence body, title labels.
- **CRLF cache-bust gotcha:** after `npm run build`, revert every rebuilt PDP except `york-dumbbell-stand.html`.
- **`[hidden]`/display gotcha** doesn't apply here (no hidden panels), but keep new selectors scoped `.pdp-page`.
- **Branch:** `variant-tier-selector` off `main` (`main` @ `d6917ca`, pushed).

## File structure

| File | Responsibility |
|---|---|
| `data/products.json` | **modify** — `variants` for `york-dumbbell-stand`. |
| `lib/products.js` | **modify** — validate the tier-selector shape. |
| `templates/shared.js` | **modify** — `tierSelectorHtml(p)` + dispatcher case. |
| `css/pages.css` | **modify** — `.pdp__tier` radio-card styles. |
| `js/chrome.js` | **modify** — radio + qty → live total. |
| `tools/variants.test.mjs` | **modify** — renderer/dispatcher/validation tests. |

---

## Task 1: Variant data + validation

**Files:** Modify `data/products.json`, `lib/products.js`; test `tools/variants.test.mjs`.

**Interfaces:** Produces `variants = { type: 'tier-selector', options: [{ label, desc, price }] }`.

- [ ] **Step 1: Set `variants` on `york-dumbbell-stand`** in `data/products.json` — replace its `"variants": { "type": "quantity" }` with (4-space base indent, match the file's CRLF):

```json
"variants": {
      "type": "tier-selector",
      "options": [
        { "label": "2-Tier Stand", "desc": "Two-tier storage for a compact dumbbell set.", "price": 253.50 },
        { "label": "3-Tier Stand", "desc": "Three tiers of storage for a full dumbbell range.", "price": 338.00 },
        { "label": "Mini 2-Tier Stand", "desc": "Space-saving two-tier design for smaller collections.", "price": 262.60 }
      ]
    }
```

Use a slug-anchored edit (the Edit tool needs unique context — anchor on the `york-dumbbell-stand` slug region, or reuse the `tools/set-weight-variants.mjs`-style scratch approach). Verify: `node -e "require('./data/products.json')"` must not throw.

- [ ] **Step 2: Write failing validation test** (append to `tools/variants.test.mjs`):

```js
test('the tier-selector product has valid option data', () => {
  const p = bySlug.get('york-dumbbell-stand');
  assert.equal(p.variants.type, 'tier-selector');
  assert.equal(p.variants.options.length, 3);
  for (const o of p.variants.options) { assert.ok(o.label); assert.ok(o.price > 0); }
  assert.deepEqual(validateProduct(p), []);
});

test('validateProduct rejects a tier-selector with a bad option', () => {
  const bad = { ...bySlug.get('york-dumbbell-stand'), variants: { type: 'tier-selector', options: [{ label: 'X' }] } };
  assert.ok(validateProduct(bad).some((e) => /tier-selector|price/i.test(e)));
});
```

- [ ] **Step 3: Run, verify fail** — `node --test tools/variants.test.mjs`.

- [ ] **Step 4: Extend `validateProduct` in `lib/products.js`** (before `return e;`):

```js
  if (p.variants && p.variants.type === 'tier-selector') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) e.push('tier-selector: options must be a non-empty array');
    else opts.forEach((o, i) => {
      if (!o?.label) e.push(`tier-selector option ${i}: label required`);
      if (typeof o?.price !== 'number' || !(o.price > 0)) e.push(`tier-selector option ${i}: price must be a positive number`);
    });
  }
```

- [ ] **Step 5: Run, verify pass** — `node --test tools/variants.test.mjs` PASS; `npm test` green.

- [ ] **Step 6: Commit**

```bash
git add data/products.json lib/products.js tools/variants.test.mjs
git commit -m "feat: tier-selector variant data + validation (dumbbell stand)"
```

---

## Task 2: Renderer + dispatcher

**Files:** Modify `templates/shared.js`; test `tools/variants.test.mjs`.

**Interfaces:** Produces `tierSelectorHtml(p) -> string`; `variantBlock` gains `case 'tier-selector'`.

- [ ] **Step 1: Write failing tests** (append):

```js
import { tierSelectorHtml } from '../templates/shared.js';

test('tierSelectorHtml renders a radio per tier, first checked, with prices + total', () => {
  const h = tierSelectorHtml(bySlug.get('york-dumbbell-stand'));
  assert.equal((h.match(/data-tier-radio/g) || []).length, 3);
  assert.match(h, /value="253.50"[^>]*data-tier-radio checked/);
  assert.match(h, /pdp__tier-name">2-Tier Stand</);
  assert.match(h, /pdp__tier-price">\$338\.00/);           // 3-tier price present
  assert.match(h, /data-tier-total[^>]*>\$253\.50/);       // total = first option
});

test('variantBlock routes tier-selector to the radio list', () => {
  assert.match(variantBlock(bySlug.get('york-dumbbell-stand')), /data-tier\b/);
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement in `templates/shared.js`** (beside `setOrIndividualHtml`):

```js
// Compact qty stepper for the tier selector.
function tierQty() {
  return `              <div class="pdp__tier-qty">
                <button type="button" class="pdp__tier-qty-btn" data-tier-qty-decrement aria-label="Decrease quantity">–</button>
                <input class="pdp__tier-qty-value" type="text" inputmode="numeric" value="1" data-tier-qty-value aria-label="Quantity">
                <button type="button" class="pdp__tier-qty-btn" data-tier-qty-increment aria-label="Increase quantity">+</button>
              </div>`;
}

// "Select A Type" tier chooser (Dumbbell Stand). Radio-card list; js/chrome.js
// keeps the total live from the checked tier's price * qty.
export function tierSelectorHtml(p) {
  const opts = p.variants.options.map((o, i) => {
    const price = o.price.toFixed(2);
    return `              <label class="pdp__tier-option">
                <input type="radio" name="pdp-tier" class="pdp__tier-radio" value="${price}" data-tier-radio${i === 0 ? ' checked' : ''}>
                <span class="pdp__tier-info">
                  <span class="pdp__tier-name">${escapeHtml(o.label)}</span>${o.desc ? `
                  <span class="pdp__tier-desc">${escapeHtml(o.desc)}</span>` : ''}
                </span>
                <span class="pdp__tier-price">${formatPrice(o.price)}</span>
              </label>`;
  }).join('\n');
  const start = p.variants.options[0].price;
  return `          <div class="pdp__tier" data-tier>
            <p class="pdp__tier-label">Select A Type</p>
            <fieldset class="pdp__tier-options">
${opts}
            </fieldset>
${tierQty()}
            <div class="pdp__tier-total">
              <span class="pdp__tier-total-label">Total</span>
              <span class="pdp__tier-total-value" data-tier-total>${formatPrice(start)}</span>
            </div>
          </div>`;
}
```

Add to `variantBlock`'s switch: `case 'tier-selector': return tierSelectorHtml(p);`

- [ ] **Step 4: Run, verify pass** — `npm test` green.

- [ ] **Step 5: Build + keep only the target**

```bash
npm run build
for f in $(git diff --name-only -- '*.html'); do [ "$f" = york-dumbbell-stand.html ] || git checkout -- "$f"; done
git diff --name-only -- '*.html'                 # expect only york-dumbbell-stand.html
grep -c 'data-tier-radio' york-dumbbell-stand.html   # expect 3
```

- [ ] **Step 6: Commit**

```bash
git add templates/shared.js tools/variants.test.mjs york-dumbbell-stand.html
git commit -m "feat: tier-selector renderer + dispatcher; build dumbbell stand PDP"
```

---

## Task 3: Styling + interactivity

**Files:** Modify `css/pages.css`, `js/chrome.js`. Browser-verified.

- [ ] **Step 1: Add CSS to `css/pages.css`** (after the `.pdp__soi` block; design-system vars, square corners):

```css
/* Tier selector — "Select A Type" radio cards (Dumbbell Stand) */
.pdp-page .pdp__tier { display: flex; flex-direction: column; gap: var(--space-12); }
.pdp-page .pdp__tier-label { font-family: var(--font-family-body); font-size: var(--font-size-16); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-neutral-1000); margin: 0; }
.pdp-page .pdp__tier-options { display: flex; flex-direction: column; gap: var(--space-8); border: 0; padding: 0; margin: 0; }
.pdp-page .pdp__tier-option {
  display: flex; align-items: center; gap: var(--space-12);
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--color-neutral-1000); cursor: pointer;
}
.pdp-page .pdp__tier-option:has(.pdp__tier-radio:checked) { box-shadow: inset 0 0 0 1px var(--color-neutral-1000); background: var(--cream-base, #fbf7eb); }
.pdp-page .pdp__tier-radio { flex: 0 0 auto; width: 18px; height: 18px; accent-color: var(--accent-default); }
.pdp-page .pdp__tier-info { display: flex; flex-direction: column; gap: 2px; flex: 1 1 auto; }
.pdp-page .pdp__tier-name { font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--color-neutral-1000); }
.pdp-page .pdp__tier-desc { font-family: var(--font-family-body); font-size: var(--font-size-14, 14px); color: var(--text-muted, #666); }
.pdp-page .pdp__tier-price { flex: 0 0 auto; font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--accent-default); white-space: nowrap; }
.pdp-page .pdp__tier-qty { display: inline-flex; align-items: stretch; border: 1px solid var(--color-neutral-1000); width: 164px; }
.pdp-page .pdp__tier-qty-btn { width: 44px; background: transparent; border: 0; cursor: pointer; font-size: var(--font-size-20); line-height: 1; color: var(--color-neutral-1000); transition: background 0.15s ease; }
.pdp-page .pdp__tier-qty-btn:hover { background: var(--accent-default); color: var(--text-on-accent); }
.pdp-page .pdp__tier-qty-value { flex: 1 1 auto; width: 100%; border: 0; border-left: 1px solid var(--color-neutral-1000); border-right: 1px solid var(--color-neutral-1000); text-align: center; background: transparent; font-family: var(--font-family-body); font-size: var(--font-size-16); }
.pdp-page .pdp__tier-total { display: flex; justify-content: space-between; align-items: baseline; padding-top: var(--space-12); border-top: 1px solid var(--color-neutral-1000); font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--color-neutral-1000); }
.pdp-page .pdp__tier-total-label { text-transform: uppercase; letter-spacing: 0.04em; }
.pdp-page .pdp__tier-total-value { font-size: var(--font-size-20); }
```

> `:has()` is broadly supported; if it must degrade, the radio itself still shows the selection. Keep it — it only enhances.

- [ ] **Step 2: Add interactivity to `js/chrome.js`** (after the set-or-individual block):

```js
// ── PDP tier selector ──
// Checked radio's price * qty drives the live total. No-op without [data-tier].
document.querySelectorAll('[data-tier]').forEach((tier) => {
  const radios = [...tier.querySelectorAll('[data-tier-radio]')];
  const qv = tier.querySelector('[data-tier-qty-value]');
  const totalEl = tier.querySelector('[data-tier-total]');
  const recompute = () => {
    const checked = radios.find((r) => r.checked) || radios[0];
    const price = parseFloat(checked.value) || 0;
    const qty = Math.max(1, parseInt(qv.value, 10) || 1);
    if (totalEl) totalEl.textContent = `$${(price * qty).toFixed(2)}`;
  };
  radios.forEach((r) => r.addEventListener('change', recompute));
  tier.querySelector('[data-tier-qty-decrement]')?.addEventListener('click', () => { qv.value = Math.max(1, (parseInt(qv.value, 10) || 1) - 1); recompute(); });
  tier.querySelector('[data-tier-qty-increment]')?.addEventListener('click', () => { qv.value = (parseInt(qv.value, 10) || 1) + 1; recompute(); });
  qv.addEventListener('input', () => { qv.value = qv.value.replace(/[^0-9]/g, ''); recompute(); });
  recompute();
});
```

- [ ] **Step 3: Serve + browser-verify** — `npx serve . -l 4599`, open `york-dumbbell-stand.html` at 1440:
  - "Select A Type" shows 3 tier cards; 2-Tier selected by default; Total $253.50.
  - Select 3-Tier → Total $338.00; select Mini 2-Tier → $262.60; qty 2 on 3-Tier → $676.00.
  - Selected card is visually highlighted; 390px stacks cleanly.

- [ ] **Step 4: Commit**

```bash
git add css/pages.css js/chrome.js
git commit -m "feat: tier-selector radio-card styles + live-total interactivity"
```

**REVIEW CHECKPOINT** — show Adam the PDP (desktop + mobile).

---

## Task 4: Verify + finish

- [ ] **Step 1:** `npm test && npm run verify` → green + `VERIFY OK`.
- [ ] **Step 2:** Invoke `superpowers:finishing-a-development-branch` to merge `variant-tier-selector` → `main` (or PR).

---

## Self-review (against the confirmed design)

**Coverage:** data (real prices) → Task 1; renderer + dispatcher → Task 2; "Select A Type" radio cards + qty + live total → Tasks 2–3; generic already wired (no template change) → n/a; responsive → Task 3 Step 3. ✅

**Placeholders:** code + prices literal; tier *descriptions* are intentional placeholder copy (flagged); no plan TBDs. ✅

**Type consistency:** `tierSelectorHtml(p)` name + `data-tier*` attributes identical across shared.js (Task 2) and chrome.js (Task 3); `variants.options[].{label,desc,price}` identical across data, validator, renderer, tests. ✅
