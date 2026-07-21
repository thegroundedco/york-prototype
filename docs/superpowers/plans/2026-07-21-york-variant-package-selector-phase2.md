# York Phase 2 — Package Selector (Plyo Package)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `plyo-package` a "Select A Package" chooser — Plyo Package ($244.06) vs Plyo Plus Package ($311.07) — where selecting a package swaps the "What's Included" list and updates a live total.

**Architecture:** `variantBlock(p)` gains a `package-selector` case → `packageSelectorHtml(p)`. Both packages' included lists render up front; JS shows the selected one (show/hide, like the set-or-individual panels) and updates the total. `plyo-package` is a package template, so `package.js` renders the block via the existing non-quantity gate AND skips its static "What's Included" (the block provides a dynamic one).

**Tech Stack:** Node ESM generator, `node --test`, vanilla JS/CSS, zero deps. Fourth slice of the 6-type variant model.

## Global Constraints

- **Zero deps; no site build step.**
- **Prices REAL** (yorkbarbell.com `attribute_set` variations, 2026-07-21): Plyo Package $244.06, Plyo Plus Package $311.07. Do not alter.
- **Contents** are a faithful transcription of the product's existing `included` copy (Plus = base 5 items + 15 lb Slam Ball + Complete Resistance Band Set; the 4-band + 8-band overlap is per the sheet's exact wording, Adam OK'd).
- **`[hidden]` gotcha:** add `.pdp__pkg-included[hidden] { display: none; }` (a `display` rule beats the UA `[hidden]`).
- **CRLF cache-bust gotcha:** after `npm run build`, revert every rebuilt PDP except `plyo-package.html`.
- **No qty** on the package selector (a package is a single purchase); total = selected package price.
- **Text case:** ALL CAPS display/heading, sentence body, title labels.
- **Branch:** `variant-package-selector` off `main` (`main` @ `bfe58bd`, pushed).

## File structure

| File | Responsibility |
|---|---|
| `data/products.json` | **modify** — `variants` for `plyo-package` (split its `included`). |
| `lib/products.js` | **modify** — validate the package-selector shape. |
| `templates/shared.js` | **modify** — `packageSelectorHtml(p)` + dispatcher case. |
| `templates/package.js` | **modify** — skip the static "What's Included" for package-selector. |
| `css/pages.css` | **modify** — `.pdp__pkg` chooser + included styles. |
| `js/chrome.js` | **modify** — radio → swap included + total. |
| `tools/variants.test.mjs` | **modify** — tests. |

---

## Task 1: Variant data + validation

**Files:** Modify `data/products.json`, `lib/products.js`; test `tools/variants.test.mjs`.

**Interfaces:** Produces `variants = { type: 'package-selector', options: [{ label, price, included: string[] }] }`.

- [ ] **Step 1: Set `variants` on `plyo-package`.** Run this once (splits the existing `included`, preserves CRLF, slug-anchored):

```js
// node - <<'NODE' (run from repo root)
const fs = require('fs');
const path = 'data/products.json';
let s = fs.readFileSync(path, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const d = JSON.parse(s);
const p = d.find((x) => x.slug === 'plyo-package');
const headers = ['Plyo Performance System', 'Plyo Performance System Plus', 'Everything in the Plyo Performance System, plus:'];
const items = p.included.filter((x) => !headers.includes(x));   // 7 items, in order
const base = items.slice(0, 5);
const plus = items.slice(0);                                     // base 5 + slam ball + complete set = 7
const variants = { type: 'package-selector', options: [
  { label: 'Plyo Package', price: 244.06, included: base },
  { label: 'Plyo Plus Package', price: 311.07, included: plus },
] };
// Build the block text at 4-space indent with the file's newline (JSON.stringify then re-indent).
const json = JSON.stringify({ variants }, null, 2).split('\n').slice(1, -1)
  .map((l) => '    ' + l).join(nl).replace(/^ {4}"variants"/, '    "variants"');
const i = s.indexOf('"slug": "plyo-package"');
const m = s.slice(i).match(/"variants": \{\r?\n\s*"type": "quantity"\r?\n\s*\}/);
const abs = i + m.index;
s = s.slice(0, abs) + json.trimStart() + s.slice(abs + m[0].length);
fs.writeFileSync(path, s, 'utf8');
console.log('done:', variants.options.map((o) => `${o.label} $${o.price} (${o.included.length})`).join('; '));
// NODE
```
Verify: `node -e "const v=require('./data/products.json').find(x=>x.slug==='plyo-package').variants; console.log(v.type, v.options.map(o=>o.label+'/'+o.included.length))"` → `package-selector [ 'Plyo Package/5', 'Plyo Plus Package/7' ]`. (If the re-indent is off, hand-fix; the goal is a valid 4-space `variants` object. Confirm `require('./data/products.json')` doesn't throw.)

- [ ] **Step 2: Write failing validation test** (append to `tools/variants.test.mjs`):

```js
test('the package-selector product has valid data', () => {
  const p = bySlug.get('plyo-package');
  assert.equal(p.variants.type, 'package-selector');
  assert.equal(p.variants.options.length, 2);
  for (const o of p.variants.options) { assert.ok(o.label); assert.ok(o.price > 0); assert.ok(o.included.length >= 1); }
  assert.deepEqual(validateProduct(p), []);
});

test('validateProduct rejects a package-selector option missing included', () => {
  const bad = { ...bySlug.get('plyo-package'), variants: { type: 'package-selector', options: [{ label: 'X', price: 10 }] } };
  assert.ok(validateProduct(bad).some((e) => /package-selector|included/i.test(e)));
});
```

- [ ] **Step 3: Run, verify fail.**

- [ ] **Step 4: Extend `validateProduct` in `lib/products.js`** (before `return e;`):

```js
  if (p.variants && p.variants.type === 'package-selector') {
    const opts = p.variants.options;
    if (!Array.isArray(opts) || opts.length === 0) e.push('package-selector: options must be a non-empty array');
    else opts.forEach((o, i) => {
      if (!o?.label) e.push(`package-selector option ${i}: label required`);
      if (typeof o?.price !== 'number' || !(o.price > 0)) e.push(`package-selector option ${i}: price must be a positive number`);
      if (!Array.isArray(o?.included) || o.included.length === 0) e.push(`package-selector option ${i}: included must be a non-empty array`);
    });
  }
```

- [ ] **Step 5: Run, verify pass** — `npm test` green.

- [ ] **Step 6: Commit**

```bash
git add data/products.json lib/products.js tools/variants.test.mjs
git commit -m "feat: package-selector variant data + validation (plyo package)"
```

---

## Task 2: Renderer + dispatcher + package template

**Files:** Modify `templates/shared.js`, `templates/package.js`; test `tools/variants.test.mjs`.

**Interfaces:** Produces `packageSelectorHtml(p) -> string`; `variantBlock` gains `case 'package-selector'`.

- [ ] **Step 1: Write failing tests** (append):

```js
import { packageSelectorHtml } from '../templates/shared.js';

test('packageSelectorHtml renders 2 radios + 2 included blocks, first shown', () => {
  const h = packageSelectorHtml(bySlug.get('plyo-package'));
  assert.equal((h.match(/data-pkg-radio/g) || []).length, 2);
  assert.match(h, /value="244.06"[^>]*data-pkg-radio[^>]*checked/);
  assert.match(h, /data-pkg-included="1"[^>]*hidden/);        // second package hidden
  assert.match(h, /data-pkg-total[^>]*>\$244\.06/);
  assert.match(h, /Plyo Plus Package/);
});

test('variantBlock routes package-selector to the chooser', () => {
  assert.match(variantBlock(bySlug.get('plyo-package')), /data-pkg\b/);
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `packageSelectorHtml` in `templates/shared.js`** (beside `tierSelectorHtml`):

```js
// "Select A Package" chooser (Plyo). Both packages' included lists render; JS
// shows the selected one + updates the total. No qty (a package is one purchase).
export function packageSelectorHtml(p) {
  const opts = p.variants.options.map((o, i) => {
    const price = o.price.toFixed(2);
    return `              <label class="pdp__pkg-option">
                <input type="radio" name="pdp-pkg" class="pdp__pkg-radio" value="${price}" data-pkg-radio data-pkg-key="${i}"${i === 0 ? ' checked' : ''}>
                <span class="pdp__pkg-name">${escapeHtml(o.label)}</span>
                <span class="pdp__pkg-price">${formatPrice(o.price)}</span>
              </label>`;
  }).join('\n');
  const included = p.variants.options.map((o, i) => {
    const items = o.included.map((it) => `                <li>${escapeHtml(it)}</li>`).join('\n');
    return `            <div class="pdp__pkg-included" data-pkg-included="${i}"${i === 0 ? '' : ' hidden'}>
              <p class="pdp__pkg-included-title">What's Included</p>
              <ul class="pdp__pkg-included-list" role="list">
${items}
              </ul>
            </div>`;
  }).join('\n');
  const start = p.variants.options[0].price;
  return `          <div class="pdp__pkg" data-pkg>
            <p class="pdp__pkg-label">Select A Package</p>
            <fieldset class="pdp__pkg-options">
${opts}
            </fieldset>
${included}
            <div class="pdp__pkg-total">
              <span class="pdp__pkg-total-label">Total</span>
              <span class="pdp__pkg-total-value" data-pkg-total>${formatPrice(start)}</span>
            </div>
          </div>`;
}
```

Add to `variantBlock`'s switch: `case 'package-selector': return packageSelectorHtml(p);`

- [ ] **Step 4: Update `templates/package.js`.** The block already renders via `hasVariantBlock` (from the set-or-individual slice). Add a flag to SKIP the static "What's Included" for package-selector (its block has a dynamic one). Near the other consts:
  ```js
  const showStaticIncluded = !(p.variants && p.variants.type === 'package-selector');
  ```
  Then wrap the static included div render: change
  ```
            <div class="pdp__included">
              <p class="pdp__included-title">What's Included</p>
              <ul class="pdp__included-list" role="list">
  ${includedItems}
              </ul>
            </div>
  ```
  to be emitted only when `showStaticIncluded` — e.g. hoist it into a `const staticIncluded = showStaticIncluded ? \`<div class="pdp__included">…</div>\` : '';` and interpolate `${staticIncluded}` in its place. Leave everything else (CTA already handles the label via `ctaLabel`).

- [ ] **Step 5: Run, verify pass** — `npm test` green.

- [ ] **Step 6: Build + keep only the target**

```bash
npm run build
for f in $(git diff --name-only -- '*.html'); do [ "$f" = plyo-package.html ] || git checkout -- "$f"; done
git diff --name-only -- '*.html'                 # expect only plyo-package.html
grep -c 'data-pkg-radio' plyo-package.html            # expect 2
grep -c 'pdp__included\b' plyo-package.html           # expect 0 (static included removed; dynamic pkg-included used)
grep -c 'pdp__included\b' york-performance-package.html  # expect >=1 (other package keeps its static included)
```

- [ ] **Step 7: Commit**

```bash
git add templates/shared.js templates/package.js tools/variants.test.mjs plyo-package.html
git commit -m "feat: package-selector renderer + dispatcher; dynamic What's Included; build plyo PDP"
```

---

## Task 3: Styling + interactivity

**Files:** Modify `css/pages.css`, `js/chrome.js`. Browser-verified.

- [ ] **Step 1: Add CSS to `css/pages.css`** (after the `.pdp__tier` block):

```css
/* Package selector — "Select A Package" (Plyo) */
.pdp-page .pdp__pkg { display: flex; flex-direction: column; gap: var(--space-16); }
.pdp-page .pdp__pkg-label { font-family: var(--font-family-body); font-size: var(--font-size-16); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-neutral-1000); margin: 0; }
.pdp-page .pdp__pkg-options { display: flex; flex-direction: column; gap: var(--space-8); border: 0; padding: 0; margin: 0; }
.pdp-page .pdp__pkg-option { display: flex; align-items: center; gap: var(--space-12); padding: var(--space-12) var(--space-16); border: 1px solid var(--color-neutral-1000); cursor: pointer; }
.pdp-page .pdp__pkg-option:has(.pdp__pkg-radio:checked) { box-shadow: inset 0 0 0 1px var(--color-neutral-1000); background: var(--cream-base, #fbf7eb); }
.pdp-page .pdp__pkg-radio { flex: 0 0 auto; width: 18px; height: 18px; accent-color: var(--accent-default); }
.pdp-page .pdp__pkg-name { flex: 1 1 auto; font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--color-neutral-1000); }
.pdp-page .pdp__pkg-price { flex: 0 0 auto; font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--accent-default); white-space: nowrap; }
.pdp-page .pdp__pkg-included[hidden] { display: none; }
.pdp-page .pdp__pkg-included-title { font-family: var(--font-family-body); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-neutral-1000); margin: 0 0 var(--space-8); }
.pdp-page .pdp__pkg-included-list { list-style: disc; padding-left: var(--space-16); margin: 0; display: flex; flex-direction: column; gap: var(--space-8); font-family: var(--font-family-body); font-size: var(--font-size-14, 14px); color: var(--color-neutral-1000); }
.pdp-page .pdp__pkg-total { display: flex; justify-content: space-between; align-items: baseline; padding-top: var(--space-12); border-top: 1px solid var(--color-neutral-1000); font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--color-neutral-1000); }
.pdp-page .pdp__pkg-total-label { text-transform: uppercase; letter-spacing: 0.04em; }
.pdp-page .pdp__pkg-total-value { font-size: var(--font-size-20); }
```

- [ ] **Step 2: Add interactivity to `js/chrome.js`** (after the tier block):

```js
// ── PDP package selector ──
// Selected radio shows its included list + sets the total. No-op without [data-pkg].
document.querySelectorAll('[data-pkg]').forEach((pkg) => {
  const radios = [...pkg.querySelectorAll('[data-pkg-radio]')];
  const blocks = [...pkg.querySelectorAll('[data-pkg-included]')];
  const totalEl = pkg.querySelector('[data-pkg-total]');
  const update = () => {
    const checked = radios.find((r) => r.checked) || radios[0];
    const key = checked.dataset.pkgKey;
    for (const b of blocks) b.hidden = b.dataset.pkgIncluded !== key;
    if (totalEl) totalEl.textContent = `$${(parseFloat(checked.value) || 0).toFixed(2)}`;
  };
  radios.forEach((r) => r.addEventListener('change', update));
  update();
});
```

- [ ] **Step 3: Serve + browser-verify** — `npx serve . -l 4599`, open `plyo-package.html` at 1440:
  - "Select A Package" shows 2 cards; Plyo Package selected, Total $244.06, "What's Included" lists the 5 base items.
  - Select Plyo Plus Package → Total $311.07; included list swaps to 7 items (adds 15 lb Slam Ball + Complete Resistance Band Set); only one included list visible.
  - CTA reads "Add to cart"; another package product (`york-performance-package.html`) still shows its static What's Included.
  - 390px stacks cleanly.

- [ ] **Step 4: Commit**

```bash
git add css/pages.css js/chrome.js
git commit -m "feat: package-selector styles + selection-driven included list + total"
```

**REVIEW CHECKPOINT** — show Adam both packages (desktop + mobile).

---

## Task 4: Verify + finish

- [ ] **Step 1:** `npm test && npm run verify` → green + `VERIFY OK`.
- [ ] **Step 2:** Invoke `superpowers:finishing-a-development-branch` to merge `variant-package-selector` → `main` (or PR).

---

## Self-review (against the confirmed design)

**Coverage:** data split from `included` → Task 1; renderer + dispatcher → Task 2; package.js skips static included → Task 2 Step 4/6; selection swaps included + total → Tasks 2–3; real prices → Task 1; other packages unaffected → Task 2 Step 6; responsive → Task 3 Step 3. ✅

**Placeholders:** code + prices + contents literal (contents transcribed from existing copy); no TBDs. ✅

**Type consistency:** `packageSelectorHtml(p)` + `data-pkg*` attributes identical across shared.js (Task 2) and chrome.js (Task 3); `data-pkg-key` ↔ `data-pkg-included` index match is the show/hide contract; `variants.options[].{label,price,included}` identical across data, validator, renderer, tests. ✅
