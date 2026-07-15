# York Barbell — Build Out All Product PDPs

**Date:** 2026-07-15
**Status:** Design approved (brainstorming), pending spec review
**Repo:** `york-prototype` (plain HTML/CSS/vanilla JS, no build step)
**Owner:** Adam Tarr (Grounded Company) · Client: York Barbell

---

## Goal

Turn the three placeholder PDP templates into **23 real, per-product product-detail
pages**, each a standalone static `.html` file consistent with the rest of the repo,
and rewire the site's product links to point at them.

**Audience (decided):** Option 3 — *both* a readable developer-handoff reference (real
per-product static URLs, view-source shows the finished page) **and** a fully clickable
store for stakeholder demos. This is the highest bar and it constrains the architecture:
the output must be plain committed HTML, not a runtime-templated SPA.

---

## The 23 products

Source of truth for copy: Google Sheet **"YORK PDP Product Variants/Copy"**
(`1N_d_L1ks25SN8xiHqTMCvKDk4l_OjOXXrmv0PuWAGsc`, owner kit@thegroundedcompany.com),
three tabs whose columns differ and map onto the three templates.

Template assignment is taken from **Figma**, not from which sheet tab a product sits in
(Floor Guards lives on the Single tab but is designed on the Generic template).

### Single template (5 products)
Figma section: *Single Product Template PDPs*. Sheet tab: *Single Product PDPs*.

| # | Product | Figma frame | Copy | Notes |
|---|---|---|---|---|
| 1 | YORK Fitness Bench | `3020:26932` | full (10/10) | 2 empty gallery slots in Figma |
| 2 | FTS Power Cage | `3018:25832` | full (10/10) | variants = "Popular Accessories"; external links to yorkbarbell.com |
| 3 | YORK Aspire 366 Stationary Bike | `3020:27542` | 8/10 | |
| 4 | York R-350 Rower | `3020:28687` | 9/10 | |
| 5 | 300 Fan Bike (FB-300) | `3020:28124` | 9/10 | |

### Generic template (13 products)
Figma section: *Generic Template PDPs*. Sheet tab: *Generic PDPs* (12 named rows; the
"Mini, 2 & 3 Tier Dumbbell Stand" row is one product entity per the sheet's own note).

| # | Product | Figma frame | Copy |
|---|---|---|---|
| 6 | Floor Guards — Pack of 4 | `3017:19081` | full (Single tab, 8/10) |
| 7 | YORK Yoga Mat – Red/Gray | `3017:18463` | 8/9 |
| 8 | Battle Rope | `3018:20694` | 8/9 |
| 9 | Men's North American Chrome Olympic Training Weight Bar | `3018:24792` | 8/9 |
| 10 | Women's Elite Olympic Training Weight Bar | `3018:24041` | 8/9 |
| 11 | Rubber Training Bumper Plates | `3018:22501` | 8/9 |
| 12 | YORK Quick Access Collar | `3017:17845` | 8/9 |
| 13 | York Mini / 2 / 3 Tier Dumbbell Stand | `3020:30111` | 7/9 (combined entity) |
| 14 | Olympic A-Frame 2″ Weight Plate Tree | `3018:21506` | 8/9 |
| 15 | Slam Ball | `3018:19883` | 7/9 |
| 16 | Resistance Bands | `3011:17125` | 8/9 |
| 17 | Kettlebells | `3039:6834` | 8/9 |
| 18 | Vinyl Fitbell | `3020:31707` (assumed) | **name only (1/9) — copy drafted by Claude** |

> **Product 18 identity is unverified.** The sheet lists "Vinyl Fitbell" (name only); the
> nearest Figma frame is "YORK Neoprene Hex Dumbbells (Fitbells)" (`3020:31707`). These may
> be the same product, two finishes of one line, or two distinct SKUs. The frame mapping is
> a working assumption to confirm with Gabriela during the copy-drafting step — if they are
> distinct, product 18 ships image-less (or with a placeholder) until real Vinyl Fitbell
> photography exists, and the Neoprene Hex frame is left unused.

### Package template (4 products)
Figma section: *Package Template PDPs*. Sheet tab: *Package PDPs* (all 18/18 columns).

| # | Product | Figma frame | Copy |
|---|---|---|---|
| 19 | Essential Olympic Training Set | `3018:23519` | full |
| 20 | YORK Performance Package | `3020:26406` | full |
| 21 | Plyo Package | `3020:29285` | full |
| 22 | Rubber Hex Dumbbell Set | `3020:31177` | full |

### The 23rd (no Figma frame)
| # | Product | Figma frame | Copy | Handling |
|---|---|---|---|---|
| 23 | FTS Flat-to-Incline Utility Bench | **none** | full (9/10) | Build on **Single** template (it's a bench). Images pulled from yorkbarbell.com (no Figma source). Flag as design-unverified. |

**Reconciliation math:** sheet has 24 named product rows; the Single tab's "YORK Mini
2-Tier Dumbbell Stand" row is a pointer that says to merge it into the Generic tab's
combined stand entry. 24 − 1 = **23**.

---

## Architecture

### Data flow

```
Google Sheet ──fetch──▶ data/products.json ──┐
Figma frames ──export─▶ assets/images/products/<slug>/ ──┼─▶ tools/build-products.mjs ──▶ 23 static .html (committed)
yorkbarbell.com ──scrape─▶ prices in products.json ──────┘
```

The Sheet stays the source of truth for copy. `products.json` is the committed,
in-repo snapshot the generator reads. The generator is a **dev-time authoring tool** —
the *site itself* keeps its promise: no build step, no dependencies, `npx serve .` runs
it. Developers never run the generator to read the pages; they read committed HTML.

### New file structure

```
data/
  products.json              23 products — committed snapshot, single source of truth
templates/
  single.tmpl.html           tokenized copy of today's product-single.html
  package.tmpl.html          tokenized copy of today's product-package.html
  generic.tmpl.html          tokenized copy of today's product-generic.html
tools/
  build-products.mjs         data + templates → 23 .html at repo root
  fetch-prices.mjs           one-off scrape of yorkbarbell.com → prices
  export-images.mjs          drives Figma export → assets/images/products/<slug>/
  verify.mjs                 validation + link/asset/token checks (fails build)
assets/images/products/<slug>/
  gallery-1.jpg … gallery-5.jpg   (3–5 present; empty red slots dropped)
  editorial.jpg
<slug>.html  ×23             generated, committed, at repo ROOT
```

### Two structural decisions (approved)

1. **Generated pages live at the repo root**, next to `about.html` — `fts-power-cage.html`,
   not `products/fts-power-cage.html`. A subfolder would force `../assets/…` and
   `../about.html` paths, making generated pages' chrome markup no longer byte-identical
   to the hand-written pages' chrome — which defeats the repo's job as a diff-able
   reference. Cost accepted: root HTML count goes 22 → 42 (retire 3 templates, add 23),
   which is genuinely cluttered.

2. **The three `product-*.html` files are retired** into `templates/*.tmpl.html`; the
   root copies are deleted. After rewiring, nothing links to them. README page-table
   updated to match.

### Scope guardrail — tokenize the BUILT templates, do not rebuild to match Figma

The built templates were already breakpoint-swept at 1920/1440/390 (commit `73e47dc`)
and `CLAUDE.md` explicitly forbids re-doing those sweeps. The built templates differ
from the Figma frames in places (e.g. Figma's generic PDP has two variant pickers; the
built generic has a quantity field only). **We tokenize the built templates as-is and
inject data.** We do not restructure them to match Figma. Figma is used only for
(a) template assignment, (b) image export, (c) reference when drafting missing copy,
(d) **the variant selectors** (see below). Visual fidelity reconciliation against the
comps is the separate PDP spot-check already queued in `CLAUDE.md` — out of scope here.

**The one deliberate exception: variant selectors.** The built templates' buy box has
only a quantity stepper, but the comps + sheet define richer selectors for ~6 products.
Those custom variant blocks are *added* from Figma — this is intentional net-new UI, not
a re-run of the breakpoint sweep. See the "Variant selectors" section for the full model.

---

## Data model

One object per product in `data/products.json`. Common core plus template-specific keys.

```jsonc
{
  "slug": "fts-power-cage",          // explicit, kebab-case; a name change never silently moves a URL
  "name": "FTS Power Cage",
  "template": "single",              // single | generic | package
  "category": "racks-benches",       // for breadcrumb + Shop-All link + related fallback
  "figmaFrame": "3018:25832",
  "price": { "current": null, "compareAt": null, "sourceUrl": "https://yorkbarbell.com/..." },
  "shortDescription": "…",           // sheet "Description (1-3 sentences)" — buy-box description
  "keyFeatures": ["…", "…"],         // sheet "Key Features" — split on * / - / newline
  "specs": ["Material: 12 gauge steel", "Weight Capacity: 500 lbs"],  // ARRAY OF STRINGS (see below)
  "detailsBody": "…",                // sheet "Details About The Product"
  "highlights": [{ "title": "…", "body": "…" }],   // sheet "Product Highlight 1/2"
  "variants": { "type": "weight-selector",         // see "Variant selectors" section — discriminated by type
                "options": [ { "label": "10 lb", "price": 16.00 }, { "label": "25 lb", "price": 46.00 } ] },
  "relatedSlugs": ["fts-flat-to-incline-utility-bench"],  // sheet "You May Also Like" or category fallback
  "externalLinks": [{ "label": "Hi/Low Pulley", "url": "https://yorkbarbell.com/..." }],  // Power Cage only
  "included": ["…"],                 // package only — sheet "What's Included"
  "addOns": [{ "name": "…", "price": "…", "desc": "…", "slug": "…" }],  // single only — derived, see note
  "images": { "gallery": ["assets/images/products/fts-power-cage/gallery-1.jpg", "…"],
              "editorial": "assets/images/products/fts-power-cage/editorial.jpg" },
  "copySource": "sheet",             // sheet | drafted-by-claude
  "imageSource": "figma"             // figma | yorkbarbell.com
}
```

### Specs are plain strings, not parsed label/value pairs

The sheet's *Features & Specs* column is inconsistently formatted — the Fitness Bench
crams everything onto one dash-delimited line (`MSRP/MAP $160.00 - Selling Price $104.00
- Weight 38 lb`); the Power Cage uses one spec per newline. A parser that split these
into `label: value` pairs would guess wrong silently (e.g. turn `44 × 17 × 9. HSA
Elegible` into a spec row named "9. HSA Elegible"). Therefore:

- `specs` is an **array of strings**. The generator splits only on obvious delimiters
  (newline, ` - `, leading `*`/`-`), trims, drops empties. Nothing more.
- Renders as a plain list.
- **All 23 parsed outputs are hand-reviewed**; ugly ones are surfaced to Adam.
- Sheet typos (`Elegible`, `modiular`) are fixed in `products.json` and flagged for
  Gabriela — never silently edited in the client's source, never shipped verbatim as a
  spec value without a flag.

### Provenance

`copySource: "drafted-by-claude"` for the Vinyl Fitbell (product 18). Drafted pages get
an HTML comment banner (`<!-- COPY DRAFTED BY CLAUDE — pending client approval -->`) so
no one mistakes a draft for approved client copy. `imageSource: "yorkbarbell.com"` for
the FTS Flat-to-Incline bench (product 23).

---

## Images

**Source:** Figma export (decided), driven by the node IDs already mapped for all 22
framed products. Per product: 5 gallery slots (1 main 723×888 + 4 secondary 353×436) +
1 editorial banner (1440×500). ~138 unique images across 23 products.

**No new assets for featured/recommendation/add-on/card slots** — those are cards
pointing at *other* products and reuse that product's `gallery-1.jpg`. This collapses
~280 slots down to ~138 unique exports, and makes "You May Also Like" cards
automatically show the correct photo once the related product exists.

### Three known image hazards, designed for

1. **Empty slots are real.** The Fitness Bench has 2 of 5 gallery slots filled with a
   flat red placeholder rectangle. Floor Guards has all 5. The gallery template must
   render **3–5 images gracefully** (not assume exactly 5). `export-images.mjs` detects
   a near-solid-red image and drops that slot rather than shipping a red square. Per-
   product tallies reported to Adam.
2. **FTS Flat-to-Incline bench (product 23) has no Figma frame → zero Figma images.**
   Pull its photos from its yorkbarbell.com listing (already being scraped for price),
   marked `imageSource: "yorkbarbell.com"`. If Adam prefers no gallery over old-site
   photography, ship it image-less instead — open question, low stakes.
3. **Repo weight.** ~138 committed images. Export at 1× JPEG where Figma allows. If they
   come out as large PNGs, report the total size to Adam **before** committing rather
   than silently adding tens of MB.

---

## Prices

**Source:** scrape yorkbarbell.com — one lookup per product, storing `current`,
`compareAt`, and the `sourceUrl` the number came from, so every price on the site is
traceable to an openable page. The Power Cage row already links yorkbarbell.com URLs.

- Misses stay `null` and render as a visible `Price TBD`, never a plausible invented
  number. List of misses reported to Adam.
- This fixes the **23 PDPs only**. The junk prices elsewhere (`$1,000.00` ×49,
  `$1,2200.00` typo, `$0.00`s) live in PLP/collection card markup — addressed in the
  wiring pass below, from the same `products.json`, only where a card confidently
  resolves to one of the 23.

---

## Link wiring

**Principle:** `products.json` becomes the truth for every product card anywhere — PDP,
PLP card, mega-menu link, "You May Also Like" row. Fix a price/name once, correct
everywhere.

### How rewiring works

The mega menu already names products and encodes their intended template
(`<a href="product-generic.html">Kettlebells</a>`). Resolving a link = read anchor text
→ match to a product in the JSON → rewrite `href` to that product's `<slug>.html`.

**The ~800 raw links are mostly duplicated chrome.** The mega menu is byte-identical
across ~21 pages, so its product links are the *same set repeated*. The distinct review
surface is therefore small: (a) the mega-menu's product links — reviewed **once**, then
the same resolution applied everywhere the chrome appears; (b) the PLP grids, collection
grids, and homepage best-sellers — the only places with genuinely per-page product cards.
So "hand-review every link" means reviewing one mega-menu + the card grids, not 800
independent decisions.

- **Matching is fuzzy and reviewed, never guessed.** Menu says `Vinyl Fitbell
  (Multi-Color)`, sheet says `Vinyl Fitbell`; menu says `Fitness Bench`, sheet says
  `YORK Fitness Bench`. A normalized-match table resolves these; **every one of the ~800
  links' resolution is hand-reviewed**; anything not confidently matched is surfaced to
  Adam, not guessed.
- **A link is retargeted only when it confidently resolves** to one of the 23. Cards for
  products outside this scope (accessories, catalog items not in the sheet) keep their
  current behavior. No pages are invented.
- **PLP/collection cards are hand-authored HTML**, so this pass *edits those ~13 files in
  place* (retarget hrefs; optionally fix junk prices/titles from the JSON) via a
  scripted, reviewable transform — diff shown to Adam, not 800 hand-edits.

### Related products & external links
- `relatedSlugs` from the sheet's "You May Also Like" column where filled; same-category
  fallback where blank.
- Power Cage's real-site accessory links (Hi/Low Pulley, Plate Storage Attachment, 2″
  Adapter Sleeve) render as external links to yorkbarbell.com, per the sheet's request.

### Explicitly NOT in scope
- Turning PLPs/collections into generated pages. Cleaner, but a large rewrite of
  working, verified pages. This pass only *retargets links and fixes card data*. Full
  PLP generation is a future pass (Adam's call, deferred).

---

## Shipping & Returns

Per Gabriela's sheet comment ("I recommend we provide a link to the shipping and returns
page for more details rather than have all this copy in each PDP"): PDPs render a **short
warranty line + link** to `shipping.html` / `returns-refunds.html`, not the full policy
blob. The built templates already do exactly this in their Shipping & Returns accordion —
so this is the existing behavior, retained.

---

## Variant selectors

**This is the one place the build deliberately goes beyond the built templates.** The
buy box in each built template has only a quantity stepper. But the Figma comps — and the
sheet's "Product Variants" column (C), whose header states it is "different PER product" —
define richer selectors for a handful of products. Shipping the quantity-only built buy
box for those products would be wrong. So the variant block is the intentional exception
to the "don't rebuild to match Figma" guardrail: we **add** Figma-designed variant
components that the built templates lack.

### The six variant types (from sheet column C, verified against Figma)

| Type | Products (count) | UI |
|---|---|---|
| `quantity` (default) | ~16 — most singles, most generics, 2 packages | Plain qty stepper — **already in the built templates**, no new work |
| `weight-selector` | Rubber Bumper Plates, Slam Ball (2) | "Sold individually" matrix: one row per weight, each with its own price + qty stepper (confirmed in Bumper Plates comp `3018:22501`) |
| `tier-selector` | Mini / 2 / 3 Tier Dumbbell Stand (1) | "Select A Tier" (Mini / 2-tier / 3-tier) → then quantity |
| `package-selector` | Plyo Package (1) | "Select a Package" configuration chooser |
| `set-or-individual` | Rubber Hex Dumbbell Set (1) | Toggle whole-set vs. individual dumbbell; individual reveals a weight picker |
| `accessories` | FTS Power Cage (1) | "Popular Accessories" list; links to yorkbarbell.com accessory pages |

Floorguards and Vinyl Fitbell have an empty column C → default to `quantity` (Floorguards
is a fixed pack of 4; Vinyl Fitbell is the drafted-copy product, confirm with Gabriela).

### How they're built

- Each type is a **variant-block partial** the generator injects into the buy box based on
  `product.variants.type`. The `quantity` partial is the existing built markup; the other
  five are new, modeled on their Figma comps.
- **Data source for options + per-option prices:** the Figma comp shows the intended
  option set and layout; **real prices come from yorkbarbell.com** (same scrape as the
  base price). Where a product page isn't found, options render with `Price TBD`, never an
  invented number. Every variant product's option set is surfaced to Adam for review — I
  will not guess weights/tiers.
- **Interactivity:** `js/pdp.js` is currently empty. Variant behavior (weight-matrix per-
  row steppers, tier/package/set toggles updating the displayed price, individual-vs-set
  reveal) lives in a new `js/pdp.js` module, loaded only on PDP pages. It is progressive —
  the selectors are real form controls that work without JS; JS only updates price/qty
  display.
- **Responsive:** because these components are NOT in the already-swept built templates,
  each new variant block gets its own responsive treatment and is checked at 1440 (comp)
  and 390 (mobile) as part of the manual gate. This is net-new responsive work, not a
  re-run of the existing sweep.

### Staging (DECIDED)

Five custom variant components, each appearing on only 1–2 products, is the single
largest chunk of genuinely new UI in this project. Everything else is data-filling.

**The build is staged in two phases, in this order:**

1. **Phase 1 — all 23 pages, `quantity` default.** Generator, data, images, prices,
   link wiring, verification, README. Every product ships as a complete, correct page;
   the ~6 custom-variant products carry the quantity stepper as a visible interim.
2. **Phase 2 — the five custom variant selectors.** Weight-selector, tier-selector,
   package-selector, set-or-individual, accessories — plus the `js/pdp.js` interactivity
   and their 1440/390 responsive checks. Swapped into the ~6 affected products only.

The 16 quantity-only products are correct after Phase 1 and untouched by Phase 2.

---

## Templates — token map

Each built template becomes a tokenized `.tmpl.html`. Sections and their data bindings:

### Common buy-box (all three)
- breadcrumb (Home / {{category}} / {{name}})
- `{{name}}` → `pdp__title`
- `{{price.compareAt}}` / `{{price.current}}` → `pdp__price-original` / `pdp__price-current`
  (single price when no compareAt; `Price TBD` when null)
- `{{shortDescription}}` → `pdp__description` (Read More/Less retained)
- accordion: Description (`{{detailsBody}}`) inline · Features & Specs (`{{specs}}`) opens
  side modal · Shipping & Returns (static short line + links)
- gallery: `{{images.gallery}}` → main + up to 4 cells; gallery modal carousel mirrors
  the same list
- **variant block** (`{{variants}}`): the quantity stepper by default, or one of the five
  custom selectors per the "Variant selectors" section — this is the one buy-box element
  that varies structurally, not just by content

### Single-only
- `pdp__quantity` (retained) · `pdp__addons` (`{{addOns}}`, up to 3) · `pdp__cta` ·
  `pdp__financing` · `pdp__key-features` (`{{keyFeatures}}`)
  - **Add-ons data source:** the sheet has no add-ons column, so `addOns` is *derived*
    from the product's first up-to-3 `relatedSlugs` (name + price + one-line
    description pulled from those products' own JSON entries). For the Power Cage,
    whose variants column is "Popular Accessories" with explicit yorkbarbell.com
    accessory links, `addOns` is built from `externalLinks` instead. If a product has
    fewer than 3 related items, render fewer rows (never pad with placeholders).
- secondary: feature banner (`{{highlights[0]}}` or editorial) + 2 product cards
  (`{{relatedSlugs[0..1]}}`)
- recs: 4-card "You May Also Like" (`{{relatedSlugs}}`, category fallback)

### Generic-only
- `pdp__quantity` (retained) · feature (full-bleed `{{editorial}}` + one card
  `{{highlights[0]}}`) · featured-products carousel · recs 4-card row

### Package-only
- `pdp__included` (`{{included}}`) replaces quantity · accordion with embedded recs
  (`{{relatedSlugs}}`) · featured sections

---

## Verification

`tools/verify.mjs` runs every build and **fails on**:
- Any internal `href`/`src` that doesn't resolve to a file on disk — across every page.
- Any leftover template token (`{{…}}`) in output.
- Any link still pointing at retired `product-*.html`.
- Any product missing: ≥3 gallery images, non-empty name, non-empty description, and a
  price-or-explicit-TBD.

**Manual gate (Claude, then Adam):** render one page per template + the three oddballs
(FTS bench w/ no frame; Vinyl Fitbell w/ drafted copy; Floor Guards on generic template)
at 1440 and actually look at them before calling done (per the `verify` skill — drive the
real page, observe, don't just trust the file wrote).

**Not tested:** pixel-matching against Figma comps (1440-only; that's the queued PDP
spot-check, not this build).

---

## Open questions for Adam (low-stakes, can resolve during build)

1. FTS Flat-to-Incline bench images: pull from yorkbarbell.com, or ship image-less?
2. Keep retired `product-*.html` as orphan reference pages for the dev team, or delete?
3. Fix junk PLP/collection card prices in this pass (from `products.json`) or defer to
   the PLP pass?

---

## Success criteria

- 23 standalone `<slug>.html` files at repo root, each self-contained, chrome
  byte-identical to hand-written pages, real copy + real images + traceable price.
- `data/products.json` is the committed single source; re-running the generator
  reproduces all 23 deterministically.
- Every product link site-wide that confidently resolves to one of the 23 points at its
  real page; no link points at a retired template; nothing guessed.
- `tools/verify.mjs` passes clean.
- README updated (page table, "generated — do not edit" note, how to re-run the generator).
