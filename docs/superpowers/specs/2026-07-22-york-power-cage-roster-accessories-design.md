# York Power Cage — Roster-Only "Popular Accessories" (Design)

**Date:** 2026-07-22
**Status:** Approved by Adam
**Client ask (York, Website Feedback.md 2026-07-21):** "We need to make sure the popular accessories are products within our 23 products list for the microsite." (Roster is now 22 after the Vinyl Fitbell removal.)

## Problem

The FTS Power Cage PDP's "Popular Accessories" checkbox list contains four
yorkbarbell.com products that are NOT in the microsite roster (Hi/Low Pulley,
Weight Stack Conversion Kit, Plate Storage Attachment, 2" Olympic Adapter
Sleeve), each linking out to yorkbarbell.com in a new tab.

## Decision

Replace them with four curated roster products, referenced **by slug only** —
name, price, and link resolve from each product's own `products.json` entry at
build time (single source of truth for money; no drift when prices change or a
product is removed).

Chosen accessories (Adam's pick, 2026-07-22):

| Slug | Renders as | Price today |
|---|---|---|
| `fts-flat-to-incline-utility-bench` | FTS Flat-to-Incline Utility Bench | $351.04 |
| `mens-north-american-chrome-olympic-training-weight-bar` | Men's North American Chrome Olympic Training Weight Bar | $329.67 |
| `olympic-a-frame-weight-plate-tree` | Olympic A-Frame Weight Plate Tree | $91.00 |
| `york-quick-access-collar` | York Quick Access Collar | $7.80 |

Variant-priced roster products (bumper plates, kettlebells, etc.) are
deliberately excluded: a checkbox that adds one number to a live total needs a
fixed price.

## Changes

1. **`data/products.json`** — `fts-power-cage.variants` becomes
   `{ "type": "accessories", "options": [{ "slug": "…" }, ×4] }`.
   No label/price/url stored.
2. **`templates/index.js`** — new `resolveAccessories(product, allProducts)`,
   mirroring `resolveRelated`, maps each option slug to
   `{ slug, name, price }` and attaches the resolved list for the renderer.
   Unlike `resolveRelated` it **throws on an unknown slug** — a curated
   add-on list with a missing product is a build failure, not a silent
   omission. Wired into `renderProduct`'s pipeline for accessories products.
3. **`templates/shared.js` `accessoriesHtml`** — same structure (checkbox +
   linked name + red price + live Total starting at base $927.64). Link
   becomes internal `<slug>.html`, same tab (drop `target="_blank"` +
   `rel="noopener noreferrer"`). Row label = product's roster `name`.
4. **`lib/products.js` `validateProduct`** — accessories case now requires a
   non-empty `slug` string per option (replaces label/price/url checks).
   Roster-existence is the resolver's job (validateProduct is per-product and
   has no roster access).

## Untouched

- `js/chrome.js` `[data-acc]` handler — prices still arrive via the same
  checkbox `value` and `data-acc-base` attributes.
- CSS (`.pdp__acc*`) — markup shape unchanged.
- All other products' pages and variant types.

## Testing / verification

- Update `tools/variants.test.mjs` accessories tests: validation requires
  slug; renderer emits internal links, roster names, and roster prices; no
  `target="_blank"`; resolver throws on an unknown slug.
- `npm test` and `npm run verify` green.
- After `npm run build`, revert every rebuilt PDP except
  `fts-power-cage.html` (CRLF `?v=` cache-bust churn gotcha).
