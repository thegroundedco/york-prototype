# York Phase 2 — Set-or-Individual Variant (Rubber Hex + Kettlebells)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a set-or-individual toggle to Rubber Hex Dumbbell Set (package template) and Kettlebells (generic template): tabs switch between a **bundle chooser** (set/package dropdown + qty) and an **individual picker** (weight dropdown + qty), with a live total. Real prices where the live catalog has them; deduced placeholders (flagged) for the missing side.

**Architecture:** Extends the established variant model — `variantBlock(p)` in `templates/shared.js` gains a `set-or-individual` case rendering `setOrIndividualHtml(p)`; interactivity in `js/chrome.js`; CSS in `css/pages.css`. Kettlebells (generic) already renders `variantBlock(p)`. Rubber Hex (package) needs the block wired into `package.js`, gated so the other 3 package products (which show no buy-box control) are unaffected.

**Tech Stack:** Node ESM generator, `node --test`, vanilla JS/CSS, zero deps. Second slice of the 6-type variant model (`2026-07-15-york-product-pdps-design.md`).

## Global Constraints

- **Zero deps; no site build step** (`npm run build` regenerates committed HTML).
- **Prices** (scraped from yorkbarbell.com `data-product_variations`, 2026-07-21):
  - Rubber Hex **sets are REAL** — 5–50 lb $805.81, 55–100 lb $2270.91, 105–125 lb $1684.80 (rate $1.465/lb, no sale).
  - Rubber Hex **individual units are PLACEHOLDER** — `price = weight × 1.465`, flagged `"placeholder": true`.
  - Kettlebell **individual weights are REAL** — 5 lb $8.45 … 80 lb $135.20 (rate $1.69/lb, no sale).
  - Kettlebell **packages are PLACEHOLDER** — `price = Σ(weights) × 1.69`, flagged `"placeholder": true` (contents approved by Adam, 2026-07-21).
  - Do NOT alter real prices. Placeholder prices are deduced only by the two per-lb rates above.
- **Kettlebells = same type as Rubber Hex** (Adam: "select a package or buy individuals like rubber hex").
- **Package template stays no-control for its other 3 products** — the block renders only when `variants.type !== 'quantity'`.
- **Text case:** ALL CAPS display/heading, sentence body, title labels.
- **CRLF cache-bust gotcha:** after `npm run build`, revert every rebuilt PDP except the 2 targets (`git checkout -- <others>`) — the only diff on the rest is the pre-existing `?v=` hash churn.
- **Branch:** `variant-set-or-individual` off `main` (`main` @ `d86b0ad`, pushed).

## File structure

| File | Responsibility |
|---|---|
| `data/products.json` | **modify** — `variants` for the 2 products (set-or-individual shape). |
| `lib/products.js` | **modify** — validate the set-or-individual shape. |
| `templates/shared.js` | **modify** — `setOrIndividualHtml(p)` + dispatcher case. |
| `templates/package.js` | **modify** — render `variantBlock(p)` for non-quantity types; CTA label. |
| `css/pages.css` | **modify** — `.pdp__soi` tabs/panels/select styles. |
| `js/chrome.js` | **modify** — toggle behavior + live total, beside the weight selector. |
| `tools/variants.test.mjs` | **modify** — renderer/dispatcher/validation tests for set-or-individual. |
| `tools/gen-soi-data.mjs` | **new (dev-only, not committed to site)** — writes the two `variants` blocks from the per-lb formulas. |

---

## Task 1: Variant data + validation

**Files:**
- Create (scratch, run once): `tools/gen-soi-data.mjs`
- Modify: `data/products.json`, `lib/products.js`
- Test: `tools/variants.test.mjs`

**Interfaces:**
- Produces per product: `variants = { type: 'set-or-individual', default: 'bundle'|'individual', bundleLabel: string, bundles: [{label, price}], individual: [{weight, price, placeholder?}] }`.

- [ ] **Step 1: Write `tools/gen-soi-data.mjs`** — computes prices from the two rates and rewrites the 2 `variants` blocks in place (slug-anchored, preserves CRLF). It replaces the current `"variants": { "type": "quantity" }` object for each slug:

```js
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'data/products.json';
let s = readFileSync(path, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const money = (n) => Math.round(n * 100) / 100;

// Rubber Hex: sets REAL; individual units = weight * 1.465 (placeholder).
const HEX_WEIGHTS = [2.5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125];
const rubberHex = {
  type: 'set-or-individual', default: 'bundle', bundleLabel: 'Set',
  bundles: [
    { label: '5 – 50 lb Set', price: 805.81 },
    { label: '55 – 100 lb Set', price: 2270.91 },
    { label: '105 – 125 lb Set', price: 1684.80 },
  ],
  individual: HEX_WEIGHTS.map((w) => ({ weight: `${w} lb`, price: money(w * 1.465), placeholder: true })),
};

// Kettlebells: individual weights REAL; packages = sum(weights)*1.69 (placeholder).
const KB = { 5: 8.45, 10: 16.90, 15: 25.35, 20: 33.80, 25: 42.25, 30: 50.70, 35: 59.15, 40: 67.60, 45: 76.05, 50: 84.50, 60: 101.40, 70: 118.30, 80: 135.20 };
const pack = (label, weights) => ({ label, price: money(weights.reduce((a, w) => a + w, 0) * 1.69), placeholder: true });
const kettlebells = {
  type: 'set-or-individual', default: 'individual', bundleLabel: 'Package',
  bundles: [
    pack('5 – 20 lb Pack', [5, 10, 15, 20]),
    pack('25 – 50 lb Pack', [25, 30, 35, 40, 45, 50]),
    pack('60 – 80 lb Pack', [60, 70, 80]),
  ],
  individual: Object.entries(KB).map(([w, price]) => ({ weight: `${w} lb`, price })),
};

// Render a variants object as pretty JSON at 4-space base indent with the file's newline.
function render(obj) {
  return JSON.stringify({ variants: obj }, null, 2)
    .replace(/^\{\n/, '').replace(/\n\}$/, '')      // drop the wrapper braces
    .split('\n').map((line) => '    ' + line).join(nl) // re-indent to 4 spaces + CRLF
    .replace(/^ {4}"variants"/, '"variants"')          // key sits at 4 already
    .replace(/^ {4}/, '    ');
}

const QTY_RE = /"variants": \{\r?\n\s*"type": "quantity"\r?\n\s*\}/;
for (const [slug, obj] of [['rubber-hex-dumbbell-set', rubberHex], ['kettlebells', kettlebells]]) {
  const i = s.indexOf(`"slug": "${slug}"`);
  const m = s.slice(i).match(QTY_RE);
  if (!m) throw new Error(`quantity variants not found after ${slug}`);
  const abs = i + m.index;
  s = s.slice(0, abs) + render(obj).trimStart() + s.slice(abs + m[0].length);
  console.log(`set ${slug}`);
}
writeFileSync(path, s, 'utf8');
```

> If the `render()` re-indentation proves fiddly against the file's exact style, fall back to building the block string by hand like `tools/*` scratch scripts already do — the goal is a valid, 4-space-indented `variants` object per slug. Verify with `node -e "require('./data/products.json')"` (must not throw).

- [ ] **Step 2: Run it** — `node tools/gen-soi-data.mjs`, then `node -e "JSON.parse(require('fs').readFileSync('data/products.json'))"` to confirm valid JSON. Spot-check:

```bash
node -e "const d=require('./data/products.json'); for(const s of ['rubber-hex-dumbbell-set','kettlebells']){const v=d.find(x=>x.slug===s).variants; console.log(s, v.type, v.default, 'bundles='+v.bundles.length, 'indiv='+v.individual.length, 'first indiv='+JSON.stringify(v.individual[0]));}"
```
Expect: rubber-hex `set-or-individual bundle bundles=3 indiv=26 first={"weight":"2.5 lb","price":3.66,"placeholder":true}`; kettlebells `... individual bundles=3 indiv=13 first={"weight":"5 lb","price":8.45}`.

- [ ] **Step 3: Write failing validation test** (append to `tools/variants.test.mjs`):

```js
test('the 2 set-or-individual products have valid data', () => {
  for (const slug of ['rubber-hex-dumbbell-set', 'kettlebells']) {
    const p = bySlug.get(slug);
    assert.equal(p.variants.type, 'set-or-individual');
    assert.ok(['bundle', 'individual'].includes(p.variants.default));
    assert.ok(p.variants.bundles.length >= 1 && p.variants.individual.length >= 1);
    assert.deepEqual(validateProduct(p), []);
  }
});

test('validateProduct rejects a set-or-individual with an empty side', () => {
  const bad = { ...bySlug.get('kettlebells'), variants: { type: 'set-or-individual', default: 'bundle', bundleLabel: 'Package', bundles: [], individual: [{ weight: '5 lb', price: 8.45 }] } };
  assert.ok(validateProduct(bad).some((e) => /bundles|set-or-individual/i.test(e)));
});
```

- [ ] **Step 4: Run, verify fail** — `node --test tools/variants.test.mjs` → FAIL (no validation yet).

- [ ] **Step 5: Extend `validateProduct` in `lib/products.js`** (after the weight-selector block, before `return e;`):

```js
  if (p.variants && p.variants.type === 'set-or-individual') {
    if (!['bundle', 'individual'].includes(p.variants.default)) e.push('set-or-individual: default must be "bundle" or "individual"');
    if (typeof p.variants.bundleLabel !== 'string' || !p.variants.bundleLabel) e.push('set-or-individual: bundleLabel required');
    const b = p.variants.bundles, ind = p.variants.individual;
    if (!Array.isArray(b) || b.length === 0) e.push('set-or-individual: bundles must be a non-empty array');
    else b.forEach((o, i) => { if (!o?.label || typeof o.price !== 'number' || !(o.price > 0)) e.push(`set-or-individual bundle ${i}: label + positive price required`); });
    if (!Array.isArray(ind) || ind.length === 0) e.push('set-or-individual: individual must be a non-empty array');
    else ind.forEach((o, i) => { if (!/\d+(\.\d+)?\s*lb/i.test(o?.weight || '') || typeof o.price !== 'number' || !(o.price > 0)) e.push(`set-or-individual individual ${i}: weight + positive price required`); });
  }
```

- [ ] **Step 6: Run, verify pass** — `node --test tools/variants.test.mjs` → PASS; `npm test` green.

- [ ] **Step 7: Commit**

```bash
git add data/products.json lib/products.js tools/variants.test.mjs tools/gen-soi-data.mjs
git commit -m "feat: set-or-individual variant data + validation (rubber hex, kettlebells)"
```

---

## Task 2: Renderer + dispatcher, wired into both templates

**Files:**
- Modify: `templates/shared.js`, `templates/package.js`
- Test: `tools/variants.test.mjs`

**Interfaces:**
- Produces: `setOrIndividualHtml(p) -> string` (`.pdp__soi` with 2 tabs, 2 panels, a live total); `variantBlock` gains `case 'set-or-individual'`.

- [ ] **Step 1: Write failing tests** (append):

```js
import { setOrIndividualHtml } from '../templates/shared.js';

test('setOrIndividualHtml renders 2 tabs, 2 panels, both selects, default panel visible', () => {
  const h = setOrIndividualHtml(bySlug.get('rubber-hex-dumbbell-set'));
  assert.match(h, /data-soi-tab="bundle"[^>]*>Set</);
  assert.match(h, /data-soi-tab="individual"[^>]*>Individual</);
  assert.equal((h.match(/data-soi-select/g) || []).length, 2);
  assert.match(h, /data-soi-panel="individual"[^>]*hidden/);       // bundle default -> individual hidden
  assert.match(h, /value="805.81"[^>]*selected>5 – 50 lb Set/);
  assert.match(h, /data-soi-total[^>]*>\$805\.81/);
});

test('setOrIndividualHtml honors default=individual (kettlebells) + bundleLabel', () => {
  const h = setOrIndividualHtml(bySlug.get('kettlebells'));
  assert.match(h, /data-soi-tab="bundle"[^>]*>Package</);          // bundleLabel = Package
  assert.match(h, /data-soi-panel="bundle"[^>]*hidden/);           // individual default -> bundle hidden
  assert.match(h, /data-soi-total[^>]*>\$8\.45/);
});

test('variantBlock routes set-or-individual to the toggle', () => {
  assert.match(variantBlock(bySlug.get('kettlebells')), /data-soi/);
});
```

- [ ] **Step 2: Run, verify fail** — `node --test tools/variants.test.mjs`.

- [ ] **Step 3: Implement `setOrIndividualHtml` in `templates/shared.js`** (beside `weightSelectorHtml`), and add the dispatcher case:

```js
// Compact qty stepper used inside a set-or-individual panel.
function soiQty(mode) {
  return `              <div class="pdp__soi-qty">
                <button type="button" class="pdp__soi-qty-btn" data-soi-qty-decrement aria-label="Decrease ${mode} quantity">–</button>
                <input class="pdp__soi-qty-value" type="text" inputmode="numeric" value="1" data-soi-qty-value aria-label="${mode} quantity">
                <button type="button" class="pdp__soi-qty-btn" data-soi-qty-increment aria-label="Increase ${mode} quantity">+</button>
              </div>`;
}

function soiOptions(items, labelKey) {
  return items.map((o, i) =>
    `                <option value="${o.price.toFixed(2)}"${i === 0 ? ' selected' : ''}>${escapeHtml(o[labelKey])} — ${formatPrice(o.price)}</option>`
  ).join('\n');
}

// Set-or-individual toggle (Rubber Hex, Kettlebells). Tabs switch a bundle
// chooser and an individual weight picker; js/chrome.js keeps the total live.
export function setOrIndividualHtml(p) {
  const v = p.variants;
  const bundleDefault = v.default !== 'individual';
  const startPrice = (bundleDefault ? v.bundles[0] : v.individual[0]).price;
  return `          <div class="pdp__soi" data-soi>
            <div class="pdp__soi-tabs" role="tablist">
              <button type="button" class="pdp__soi-tab${bundleDefault ? ' is-active' : ''}" data-soi-tab="bundle" role="tab" aria-selected="${bundleDefault}">${escapeHtml(v.bundleLabel)}</button>
              <button type="button" class="pdp__soi-tab${bundleDefault ? '' : ' is-active'}" data-soi-tab="individual" role="tab" aria-selected="${!bundleDefault}">Individual</button>
            </div>
            <div class="pdp__soi-panel" data-soi-panel="bundle"${bundleDefault ? '' : ' hidden'}>
              <label class="pdp__soi-label">Select a ${escapeHtml(v.bundleLabel.toLowerCase())}</label>
              <select class="pdp__soi-select" data-soi-select aria-label="Select a ${escapeHtml(v.bundleLabel.toLowerCase())}">
${soiOptions(v.bundles, 'label')}
              </select>
${soiQty('bundle')}
            </div>
            <div class="pdp__soi-panel" data-soi-panel="individual"${bundleDefault ? ' hidden' : ''}>
              <label class="pdp__soi-label">Select weight</label>
              <select class="pdp__soi-select" data-soi-select aria-label="Select weight">
${soiOptions(v.individual, 'weight')}
              </select>
${soiQty('individual')}
            </div>
            <div class="pdp__soi-total">
              <span class="pdp__soi-total-label">Total</span>
              <span class="pdp__soi-total-value" data-soi-total>${formatPrice(startPrice)}</span>
            </div>
          </div>`;
}
```

Add to `variantBlock`'s switch: `case 'set-or-individual': return setOrIndividualHtml(p);`

- [ ] **Step 4: Wire `templates/package.js`.** Add `variantBlock` to its `./shared.js` import. After the `${descriptionHtml(p)}` block and before `<div class="pdp__included">`, insert a gated block; and make the CTA label conditional. Concretely:
  - Add before the `pdp__included` div:
    ```
    ${p.variants && p.variants.type !== 'quantity' ? variantBlock(p) : ''}
    ```
  - Replace the CTA line's label: compute near the other consts `const ctaLabel = p.variants && p.variants.type === 'set-or-individual' ? 'Add to cart' : \`Add Bundle to cart - ${currentPriceLabel}\`;` and render `>${ctaLabel}<`.
  - Leave the other 3 package products untouched (their `variants.type === 'quantity'` → block is `''`, CTA unchanged).

- [ ] **Step 5: Run, verify pass** — `npm test` green.

- [ ] **Step 6: Build + keep only the 2 targets**

```bash
npm run build
for f in $(git diff --name-only -- '*.html'); do [ "$f" = rubber-hex-dumbbell-set.html ] || [ "$f" = kettlebells.html ] || git checkout -- "$f"; done
git diff --name-only -- '*.html'          # expect only rubber-hex-dumbbell-set.html + kettlebells.html
grep -c 'data-soi-tab' rubber-hex-dumbbell-set.html   # expect 2
grep -c 'data-soi-tab' kettlebells.html               # expect 2
grep -c 'pdp__included' york-performance-package.html # expect >=1 (other package unaffected: still no soi)
grep -c 'data-soi' york-performance-package.html      # expect 0
```

- [ ] **Step 7: Commit**

```bash
git add templates/shared.js templates/package.js tools/variants.test.mjs rubber-hex-dumbbell-set.html kettlebells.html
git commit -m "feat: set-or-individual renderer + dispatcher; wire package template; build 2 PDPs"
```

---

## Task 3: Styling + interactivity

**Files:** Modify `css/pages.css`, `js/chrome.js`. Verified in the browser (no unit test for DOM behavior).

- [ ] **Step 1: Add CSS to `css/pages.css`** (after the `.pdp__weight-selector` block; design-system vars, square corners):

```css
/* Set-or-individual toggle (Rubber Hex, Kettlebells) */
.pdp-page .pdp__soi { border: 1px solid var(--color-neutral-1000); }
.pdp-page .pdp__soi-tabs { display: flex; }
.pdp-page .pdp__soi-tab {
  flex: 1 1 0; padding: var(--space-12) var(--space-16); background: var(--color-neutral-0);
  border: 0; border-bottom: 1px solid var(--color-neutral-1000); cursor: pointer;
  font-family: var(--font-family-body); font-weight: var(--font-weight-bold);
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-neutral-1000);
}
.pdp-page .pdp__soi-tab + .pdp__soi-tab { border-left: 1px solid var(--color-neutral-1000); }
.pdp-page .pdp__soi-tab.is-active { background: var(--color-neutral-1000); color: var(--color-neutral-0); border-bottom-color: transparent; }
.pdp-page .pdp__soi-panel { display: flex; flex-direction: column; gap: var(--space-12); padding: var(--space-16); }
.pdp-page .pdp__soi-label { font-family: var(--font-family-body); font-weight: var(--font-weight-bold); color: var(--color-neutral-1000); }
.pdp-page .pdp__soi-select {
  width: 100%; padding: var(--space-12) var(--space-16); border: 1px solid var(--color-neutral-1000);
  background: var(--color-neutral-0); font-family: var(--font-family-body); font-size: var(--font-size-16);
  color: var(--color-neutral-1000); border-radius: 0;
}
.pdp-page .pdp__soi-qty { display: inline-flex; align-items: stretch; border: 1px solid var(--color-neutral-1000); width: 164px; }
.pdp-page .pdp__soi-qty-btn { width: 44px; background: transparent; border: 0; cursor: pointer; font-size: var(--font-size-20); color: var(--color-neutral-1000); }
.pdp-page .pdp__soi-qty-btn:hover { background: var(--accent-default); color: var(--text-on-accent); }
.pdp-page .pdp__soi-qty-value { flex: 1 1 auto; width: 100%; border: 0; border-left: 1px solid var(--color-neutral-1000); border-right: 1px solid var(--color-neutral-1000); text-align: center; background: transparent; font-family: var(--font-family-body); font-size: var(--font-size-16); }
.pdp-page .pdp__soi-total { display: flex; justify-content: space-between; align-items: baseline; padding: var(--space-12) var(--space-16); border-top: 1px solid var(--color-neutral-1000); font-family: var(--font-family-body); font-weight: var(--font-weight-bold); }
.pdp-page .pdp__soi-total-label { text-transform: uppercase; letter-spacing: 0.04em; }
.pdp-page .pdp__soi-total-value { font-size: var(--font-size-20); }
```

- [ ] **Step 2: Add interactivity to `js/chrome.js`** (after the weight-selector block):

```js
// ── PDP set-or-individual toggle ──
// Tabs switch the visible panel; total = active panel's selected price * qty.
document.querySelectorAll('[data-soi]').forEach((soi) => {
  const tabs = [...soi.querySelectorAll('[data-soi-tab]')];
  const panels = [...soi.querySelectorAll('[data-soi-panel]')];
  const totalEl = soi.querySelector('[data-soi-total]');
  const active = () => panels.find((p) => !p.hidden) || panels[0];
  const recompute = () => {
    const panel = active();
    const price = parseFloat(panel.querySelector('[data-soi-select]').value) || 0;
    const qty = Math.max(1, parseInt(panel.querySelector('[data-soi-qty-value]').value, 10) || 1);
    if (totalEl) totalEl.textContent = `$${(price * qty).toFixed(2)}`;
  };
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    const key = tab.dataset.soiTab;
    tabs.forEach((t) => { const on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); });
    panels.forEach((p) => { p.hidden = p.dataset.soiPanel !== key; });
    recompute();
  }));
  panels.forEach((panel) => {
    panel.querySelector('[data-soi-select]').addEventListener('change', recompute);
    const qv = panel.querySelector('[data-soi-qty-value]');
    panel.querySelector('[data-soi-qty-decrement]')?.addEventListener('click', () => { qv.value = Math.max(1, (parseInt(qv.value, 10) || 1) - 1); recompute(); });
    panel.querySelector('[data-soi-qty-increment]')?.addEventListener('click', () => { qv.value = (parseInt(qv.value, 10) || 1) + 1; recompute(); });
    qv.addEventListener('input', () => { qv.value = qv.value.replace(/[^0-9]/g, ''); recompute(); });
  });
  recompute();
});
```

- [ ] **Step 3: Serve + browser-verify** — `npx serve . -l 4599`:
  - `kettlebells.html` (default = Individual): weight dropdown defaults to 5 lb, Total $8.45; switch weight to 80 lb → Total $135.20; qty 2 → $270.40; click **Package** tab → shows the 3 packs, Total updates to the selected pack; the placeholder packs read $84.50 / $380.25 / $354.90.
  - `rubber-hex-dumbbell-set.html` (default = Set): set dropdown defaults to 5–50 lb Set, Total $805.81; switch to 55–100 → $2,270.91; click **Individual** → weight dropdown (2.5 lb $3.66 …), Total updates; the package CTA reads "Add to cart".
  - A different package product (`york-performance-package.html`) is unchanged (no toggle, its normal "Add Bundle to cart - $…").
  - 390px: tabs/panel stack cleanly.

- [ ] **Step 4: Commit**

```bash
git add css/pages.css js/chrome.js
git commit -m "feat: set-or-individual toggle styles + live-total interactivity"
```

**REVIEW CHECKPOINT** — show Adam both PDPs (both tabs, desktop + mobile).

---

## Task 4: Verify + finish

- [ ] **Step 1:** `npm test && npm run verify` → tests green, `VERIFY OK`.
- [ ] **Step 2:** Invoke `superpowers:finishing-a-development-branch` to merge `variant-set-or-individual` → `main` (or PR), per Adam's choice.

---

## Self-review (against the confirmed design)

**Coverage:** data (real + deduced placeholder, flagged) → Task 1; renderer + dispatcher + both templates wired → Task 2; toggle UI (tabs + bundle chooser + weight picker + live total) → Tasks 2–3; package template gated so other 3 unaffected → Task 2 Step 4/6; kettlebells default=individual + "Package" label → Task 1/2; responsive → Task 3 Step 3. ✅

**Placeholders:** all code + formulas literal; placeholder *prices* are intentional + flagged `"placeholder": true`; no plan TBDs. ✅

**Type consistency:** `setOrIndividualHtml(p)` / `variantBlock` names + the `data-soi*` attribute set are identical across shared.js (Task 2) and chrome.js (Task 3); `variants` field names (`bundles`/`individual`/`bundleLabel`/`default`) identical across gen script, validator, renderer, and tests. ✅

---

## Appendix — deduced placeholder values

- **Rubber Hex individual** (weight × $1.465): 2.5 $3.66 · 5 $7.33 · 10 $14.65 · 15 $21.98 · 20 $29.30 · 25 $36.63 · 30 $43.95 · 35 $51.28 · 40 $58.60 · 45 $65.93 · 50 $73.25 · 55 $80.58 · 60 $87.90 · 65 $95.23 · 70 $102.55 · 75 $109.88 · 80 $117.20 · 85 $124.53 · 90 $131.85 · 95 $139.18 · 100 $146.50 · 105 $153.83 · 110 $160.15 · 115 $167.48 · 120 $175.80 · 125 $183.13.
- **Kettlebell packages** (Σweights × $1.69): 5–20 lb Pack (5+10+15+20=50) $84.50 · 25–50 lb Pack (225) $380.25 · 60–80 lb Pack (210) $354.90.
