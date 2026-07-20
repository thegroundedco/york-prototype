# York — PLP / Collection / Goal linking & population (design)

**Date:** 2026-07-20
**Status:** Draft for review
**Author:** Adam Tarr + Claude
**Predecessor:** `2026-07-15-york-product-pdps-design.md` (the 23 PDPs this work links *to*)

---

## 1. Problem

The 23 product PDPs are built, merged, and live. But every product-listing surface that
should link *to* them is still **placeholder content**: each card reads `Product Title`,
`$1,2200.00`, a generic `plp-*.jpg` image, and an `href` to the retired
`product-single/generic/package.html` templates. Nothing links to the real `<slug>.html`
pages.

Separately, the site's **taxonomy has changed** since these pages were built. The client's
"YORK PDP Product Variants/Copy" sheet
(`1N_d_L1ks25SN8xiHqTMCvKDk4l_OjOXXrmv0PuWAGsc`) now carries a *categorization menu* tab and
a *shop-by-goal* tab, and Figma has a redesigned nav
(`AvkyvrFVv3PmI2pUm2wy3o`, node `2525:7689`). The new structure:

- **8 category collections** (was 6): Racks & Benches, Bars & Weights, Cardio & Conditioning,
  Accessories, Storage, **Systems** (new), **Recovery & Mobility** (new), **Essentials** (new),
  plus a **Shop All** button.
- **3 goal collections**, each now split into **Strength / Cardio / Mobility** subsections:
  Beginners, Rebuild Strength (= "Muscle Maintenance"), Strength for Life (= "Longevity").
- Products are **cross-listed** — e.g. Resistance Bands appears in 4 collections.

This spec covers **populating and correctly linking every card** on those surfaces from the
new taxonomy. The **new mega-nav chrome** and any **unbuilt SKUs** are explicitly **out of
scope** (see §9).

## 2. Goals / non-goals

**Goals**
- Every product card on every in-scope page shows a real product (image, name, price) and
  links to the correct `<slug>.html`.
- Membership + ordering come verbatim from the sheet (single source of truth).
- Data-driven and re-runnable: a merchandising change is a data edit + rebuild, never a
  hand-edit of 80+ cards.
- Existing bespoke layout (heroes, editorial feature blocks, filter sidebars) is preserved.
- The functional filters (PLP category filter; goal sub-filters) keep working — no regression.

**Non-goals**
- Building the new 8-column mega-nav from Figma (deferred; the 3 new collection pages are
  orphan-until-nav, accepted).
- Building PDPs for unbuilt SKUs (Floor Mats). Deferred.
- Phase-2 PDP variant selectors (already tracked separately).
- Homepage best-sellers (4 cards) and search-results (8 cards) — deferred to a later pass
  (they use the same components, so they'll be cheap later).

## 3. Approach (approved: "data-driven grid-injection")

Add a **merchandising data file** describing what goes where, and a **grid-injector** build
step that rewrites *only the cards inside each grid container*, leaving all surrounding
bespoke markup untouched. This mirrors the existing PDP generator (`build-products.mjs`) and
keeps the site build-step-free (committed static HTML; the generator is a dev-time tool).

Rejected alternatives: hand-populating 80+ cards (not re-runnable, drifts from the sheet);
whole-page generation (goal pages are too bespoke to templatize without flattening
hand-crafted design).

## 4. Data model

### 4.1 `data/merchandising.json` (new)

Ordered lists, resolved to real product slugs. An entry is either a **slug string** (card
name comes from `products.json`) or an **object `{ slug, label }`** when the sheet's display
name differs from the product's name (dumbbell-stand tiers, "…Sets"/"…Packages" wording,
Neoprene Hex).

```jsonc
{
  "collections": {
    "racks-benches":     { "page": "plp-racks-benches.html",     "label": "Racks & Benches",     "products": [ ... ] },
    "bars-weights":      { "page": "plp-bars-weights.html",      "label": "Bars & Weights",      "products": [ ... ] },
    "cardio-conditioning":{ "page": "plp-cardio-conditioning.html","label": "Cardio & Conditioning","products": [ ... ] },
    "accessories":       { "page": "plp-accessories.html",       "label": "Accessories",         "products": [ ... ] },
    "storage":           { "page": "plp-storage.html",           "label": "Storage",             "products": [ ... ] },
    "systems":           { "page": "plp-systems.html",           "label": "Systems",           "new": true, "products": [ ... ] },
    "recovery-mobility": { "page": "plp-recovery-mobility.html", "label": "Recovery & Mobility","new": true, "products": [ ... ] },
    "essentials":        { "page": "plp-essentials.html",        "label": "Essentials",        "new": true, "products": [ ... ] }
  },
  "shopAll": { "page": "plp-equipment.html", "groupBy": "category" },
  "goals": {
    "beginners":  { "page": "beginners-collection.html", "sections": [ {"products":[...]}, {"products":[...]}, {"products":[...]} ] },
    "muscle-maintenance": { "page": "muscle-maintenance.html", "sections": [ ... ] },
    "longevity":  { "page": "longevity-collection.html", "sections": [ ... ] }
  }
}
```

Goal `sections` array is **positional**: element 0 → the page's 1st `[data-collection-products]`
section (Strength), 1 → 2nd (Cardio), 2 → 3rd (Mobility). Section *headings* stay as authored
(they vary per page: "Strength Training" / "Strength training Basics" / "Basics (Whole Set)").

The fully resolved lists are in **Appendix A**. They are authored by resolving the sheet
against the name→slug map (Appendix B) once, by hand, at spec time — no fuzzy runtime matching.

### 4.2 `products.json` — add `filterType`

Add one field per product: a product-family tag used for the goal sub-filters. Vocabulary
(16 values): `benches, cages, systems, bars, plates, dumbbells, kettlebells, collars, bikes,
rower, ropes, balls, bands, mats, storage, floor`. Mapping in Appendix B. This is the only
change to `products.json`; nothing else about the 23 products moves.

## 5. The injector — `tools/inject-grids.mjs` (new)

A pure, tested rewrite function plus a CLI, in the style of `rewire-links.mjs`.

`injectGrids(html, spec)` → `{ html, cardsWritten, warnings[] }`. For each in-scope page it:

1. **Locates the grid container(s)** by existing anchors (no new attributes needed for the
   happy path; markers added only where noted in §6):
   - Single-category PLP → the one `.plp-category__grid`.
   - Shop All (`plp-equipment`) → each `[data-plp-category="<cat>"]` section's `.plp__grid`.
   - Goal page → each `[data-collection-products]` section's `.collections-*__products-grid`.
2. **Replaces the inner `<article>` cards** with data-driven cards rendered by the
   page-family-appropriate renderer (§7). Order = merchandising order.
3. **Updates counts/sidebars** so nothing goes stale:
   - Single-cat PLP: rewrite `.plp-category__count` → `Showing all N results`.
   - Shop All: rewrite each section count; rebuild the `data-plp-filters` sidebar to exactly
     the sections present.
   - Goal page: tag each card `data-collection-card-category="<filterType>"`, and rebuild that
     section's `.collections-*__products-subcats` list to the distinct `filterType`s present
     (labels from `FILTER_LABELS`, Appendix B), so the working filter matches the real cards.
4. Emits a **warning** (never a silent drop) for any slug not found in `products.json`, any
   goal page whose section count ≠ 3, or any product missing `filterType`.

Injection is idempotent: it replaces the card block between the container's open/close tags,
so re-running yields identical output. Cards are matched/replaced by container, not by regex
over the whole file, to stay robust to surrounding bespoke markup.

**Scripts** (`package.json`): add `"grids": "node tools/inject-grids.mjs"`. `build` stays
PDP-only; `grids` is a separate, independently-runnable step. `verify` runs both checks (§8).

## 6. Pages touched (12) & per-page work

| Page | Type | Action |
|---|---|---|
| `plp-racks-benches.html` | single-cat PLP | inject 4 cards + count |
| `plp-bars-weights.html` | single-cat PLP | inject 9 cards + count |
| `plp-cardio-conditioning.html` | single-cat PLP | inject 7 cards + count |
| `plp-accessories.html` | single-cat PLP | inject 4 cards + count |
| `plp-storage.html` | single-cat PLP | inject 4 cards + count |
| `plp-systems.html` | **new** collection PLP | clone base, inject 7 cards |
| `plp-recovery-mobility.html` | **new** collection PLP | clone base, inject 5 cards |
| `plp-essentials.html` | **new** collection PLP | clone base, inject 9 cards |
| `plp-equipment.html` | Shop All | populate sections from primary `category`; add the missing packages section |
| `beginners-collection.html` | goal | inject 3 sections (12/6/5) + rebuild sub-filters |
| `muscle-maintenance.html` | goal | inject 3 sections (10/7/5) + rebuild sub-filters |
| `longevity-collection.html` | goal | inject 3 sections (8/5/6) + rebuild sub-filters |

**New collection pages** are created by cloning `plp-accessories.html` (simplest single-grid
PLP) and editing: `<title>`, breadcrumb trailing crumb, `<h1>` title, the `aria-label`, and
adding `data-plp-grid="<collection>"` to the `.plp-category__grid` for a stable injector
anchor. Hero/intro copy uses the collection label + a one-line description (placeholder-quality,
flagged for Adam to refine). They inherit the current (old) chrome — acceptable, since the nav
rebuild is deferred and these pages are reachable via direct link / future nav.

**Shop All (`plp-equipment`)**: its existing 5 `data-plp-category` sections
(racks-benches, bars-weights, cardio, accessories, storage) are populated from each product's
**primary `category`** field (single-listed, no repeats). The packages
(`category: equipment`) currently have no section — add one ("Systems") so all 23 appear.
Full re-section to the 8 new collections is tied to the nav rebuild and deferred.

## 7. Card renderers (in `templates/shared.js`, beside `recCardHtml`)

Reuse the existing price formatter (compareAt → `Sale` badge + strikethrough). Card image =
`images.gallery[0]`. CTA keeps `href="#cart"` (no real cart) as the existing cards do; the
**title link** is what carries the product href.

- `plpCardHtml({ href, name, image, price })` → `.plp__card` markup (matches current PLP cards).
- `collectionCardHtml({ href, name, image, price, filterType })` → `.collections-product-card`
  markup incl. `data-collection-card-category="<filterType>"`.

Both take a resolved `{ href, name, image, price }` produced from the merchandising entry +
`products.json` (label override applied when present).

## 8. Verification & tests

**`node --test` unit tests** (new `tools/inject-grids.test.mjs`, zero-dep, matching the
existing 90-test suite style):
- injector replaces cards within a container and leaves surrounding markup byte-identical;
- idempotent (second run == first);
- label override renders overridden title but resolves image/price/href from the base slug;
- sub-filter sidebar rebuilt to exactly the present `filterType`s;
- unknown slug → warning, not a crash.

**`tools/verify.mjs`** extended to assert on the built pages:
- zero `product-(single|generic|package)\.html` hrefs remain on any in-scope page;
- every card href resolves to an existing `<slug>.html`;
- every merchandising slug exists in `products.json`; every product has a `filterType`;
- each goal page has exactly 3 injected sections;
- per-page card counts equal the merchandising list lengths (Appendix A).

**Manual walkthrough** (`npx serve .`): spot-check one page of each type at 1440 — cards
render, images load, links land on the right PDP, filters still filter.

## 9. Open decisions — confirm on review

1. **Dumbbell-stand tiers (Storage).** The sheet lists Mini 2-Tier / 2-Tier / 3-Tier as three
   items, all backed by the single `york-dumbbell-stand` PDP (Phase-2 variant selectors not
   built yet). **Default: render all three** (labeled cards, same image/price/link) to match
   the client's menu. Alternative: collapse to one "York Dumbbell Stand" card. *(Recommend
   default; easy to switch.)*
2. **Floor Mats.** Net-new SKU, no copy, no PDP → **omitted** from Accessories (4 cards
   instead of 5). Needs copy + a PDP in a later pass.
3. **Neoprene Hex Dumbbells = `vinyl-fitbell`** (your call 2026-07-20): reuse that PDP with the
   label "Neoprene Hex Dumbbells". `vinyl-fitbell` appears nowhere else in the new taxonomy.
4. **Goal sub-filters.** Default: **preserve** the working filter UI by tagging cards with
   `filterType` and rebuilding each sidebar from the products present. Alternative: drop the
   sidebars for flat grids (simpler, but loses a built feature). *(Recommend preserve.)*
5. **Shop All scope.** Default: populate existing sections from primary `category` + add a
   packages section (all 23 shown once). Full 8-collection re-section deferred with the nav.

## 10. Sequencing (section-by-section, each reviewed before the next)

1. Data + tooling: write `merchandising.json` (Appendix A), add `filterType`, build
   `inject-grids.mjs` + unit tests + card renderers. **Review checkpoint.**
2. The 5 existing single-category PLPs. **Review.**
3. The 3 new collection pages (clone + inject). **Review.**
4. Shop All. **Review.**
5. The 3 goal pages (+ sub-filter rebuild). **Review.**
6. Extend `verify.mjs`, full walkthrough, then merge to `main` (auto-deploys to Pages).

---

## Appendix A — resolved membership (exact card lists & counts)

### Category collections
- **Racks & Benches (4):** york-fitness-bench · fts-flat-to-incline-utility-bench ·
  fts-power-cage · york-performance-package
- **Bars & Weights (9):** mens-north-american-chrome-olympic-training-weight-bar ·
  womens-elite-olympic-training-weight-bar · rubber-training-bumper-plates ·
  rubber-hex-dumbbell-set · vinyl-fitbell *(label "Neoprene Hex Dumbbells")* · kettlebells ·
  york-quick-access-collar · essential-olympic-training-set · york-performance-package
- **Cardio & Conditioning (7):** york-aspire-366-stationary-bike · york-r-350-rower ·
  york-fb-300-fan-bike · battle-rope · slam-ball · resistance-bands · plyo-package
- **Accessories (4):** resistance-bands · york-yoga-mat · york-quick-access-collar ·
  floor-guards-pack-of-4 *(Floor Mats omitted — §9.2)*
- **Storage (4):** york-dumbbell-stand *(label "Mini 2-Tier Dumbbell Stand")* ·
  york-dumbbell-stand *(label "2-Tier Dumbbell Stand")* · york-dumbbell-stand
  *(label "3-Tier Dumbbell Stand")* · olympic-a-frame-weight-plate-tree
  *(Dumbbell Storage landing-page line is a section label, not a card)*
- **Systems (7, NEW):** essential-olympic-training-set · york-performance-package ·
  plyo-package · rubber-hex-dumbbell-set *(label "Rubber Hex Dumbbell Sets")* ·
  resistance-bands *(label "Resistance Band Sets")* · slam-ball *(label "Slam Ball Sets")* ·
  kettlebells *(label "Kettlebell Packages")*
- **Recovery & Mobility (5, NEW):** resistance-bands · york-yoga-mat · kettlebells ·
  floor-guards-pack-of-4 · plyo-package
- **Essentials (9, NEW):** york-performance-package · essential-olympic-training-set ·
  rubber-hex-dumbbell-set · resistance-bands · york-aspire-366-stationary-bike ·
  york-r-350-rower · kettlebells · york-yoga-mat · floor-guards-pack-of-4

### Goals (section order: Strength / Cardio / Mobility)
- **Beginners** — Strength (12): vinyl-fitbell *(Neoprene Hex)* · york-fitness-bench ·
  resistance-bands · rubber-hex-dumbbell-set · kettlebells · fts-flat-to-incline-utility-bench ·
  mens-north-american-chrome-olympic-training-weight-bar · womens-elite-olympic-training-weight-bar ·
  rubber-training-bumper-plates · york-quick-access-collar · essential-olympic-training-set ·
  fts-power-cage — Cardio (6): york-aspire-366-stationary-bike · york-r-350-rower · battle-rope ·
  slam-ball · resistance-bands · plyo-package — Mobility (5): york-yoga-mat · resistance-bands ·
  kettlebells · floor-guards-pack-of-4 · plyo-package
- **Rebuild Strength (muscle-maintenance)** — Strength (10): york-performance-package ·
  fts-power-cage · fts-flat-to-incline-utility-bench · mens-north-american-chrome-olympic-training-weight-bar ·
  womens-elite-olympic-training-weight-bar · rubber-training-bumper-plates · york-quick-access-collar ·
  rubber-hex-dumbbell-set · kettlebells · olympic-a-frame-weight-plate-tree — Cardio (7):
  york-r-350-rower · york-aspire-366-stationary-bike · york-fb-300-fan-bike · battle-rope ·
  slam-ball · resistance-bands · plyo-package — Mobility (5): resistance-bands · york-yoga-mat ·
  kettlebells · plyo-package · floor-guards-pack-of-4
- **Strength for Life (longevity)** — Strength (8): york-performance-package ·
  fts-flat-to-incline-utility-bench · rubber-hex-dumbbell-set · kettlebells ·
  mens-north-american-chrome-olympic-training-weight-bar · womens-elite-olympic-training-weight-bar ·
  rubber-training-bumper-plates · york-quick-access-collar — Cardiovascular (5):
  york-aspire-366-stationary-bike · york-r-350-rower · york-fb-300-fan-bike · battle-rope ·
  plyo-package — Mobility (6): kettlebells · resistance-bands · york-yoga-mat · slam-ball ·
  plyo-package · floor-guards-pack-of-4

## Appendix B — name→slug + filterType map

| Sheet display name(s) | slug | filterType |
|---|---|---|
| YORK Fitness Bench | york-fitness-bench | benches |
| FTS Flat-to-Incline Utility Bench | fts-flat-to-incline-utility-bench | benches |
| FTS Power Cage *(+ "…larger budget…")* | fts-power-cage | cages |
| YORK Performance System / …Package | york-performance-package | systems |
| North American Olympic Training Bar *(20 kg / 28 mm)* | mens-north-american-chrome-olympic-training-weight-bar | bars |
| Elite Olympic Training Bar *(15 kg / 25 mm)* | womens-elite-olympic-training-weight-bar | bars |
| Rubber Training Bumper Plates | rubber-training-bumper-plates | plates |
| Rubber Hex Dumbbells / …Sets | rubber-hex-dumbbell-set | dumbbells |
| Neoprene Hex Dumbbells | vinyl-fitbell | dumbbells |
| Kettlebells / Kettlebell Packages | kettlebells | kettlebells |
| Quick Access Collars | york-quick-access-collar | collars |
| Essential Olympic Training / Strength System | essential-olympic-training-set | systems |
| YORK Aspire 366 Bike / Aspire Bike | york-aspire-366-stationary-bike | bikes |
| YORK R-350 Rower / YORK Rower | york-r-350-rower | rower |
| YORK FB300 Fan Bike / FB300 Fan Bike | york-fb-300-fan-bike | bikes |
| Battle Rope | battle-rope | ropes |
| Slam Balls / Slam Ball Sets | slam-ball | balls |
| Resistance Bands / Resistance Band Sets | resistance-bands | bands |
| Plyo Performance System / Plyo System | plyo-package | systems |
| Yoga Mat | york-yoga-mat | mats |
| Floorguards | floor-guards-pack-of-4 | floor |
| Mini 2-Tier / 2-Tier / 3-Tier Dumbbell Stand | york-dumbbell-stand | storage |
| Olympic A-Frame Plate Tree / Olympic Plate Tree | olympic-a-frame-weight-plate-tree | storage |
| **Floor Mats** | — *(omitted, no PDP)* | — |
| Dumbbell Storage (Landing Page) | — *(section label, not a card)* | — |

`FILTER_LABELS` (filterType → sidebar label): benches→Benches, cages→Cages, systems→Systems,
bars→Bars, plates→Plates, dumbbells→Dumbbells, kettlebells→Kettlebells, collars→Collars,
bikes→Bikes, rower→Rower, ropes→Ropes, balls→Balls, bands→Bands, mats→Mats, storage→Storage,
floor→Floor.
