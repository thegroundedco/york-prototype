# York Barbell — Website Prototype

A clickable, front-end prototype of the York Barbell website, built from the
approved Figma designs (file `AvkyvrFVv3PmI2pUm2wy3o` — "York Barbell Website
26"). This is a **developer handoff reference**: it shows the intended markup,
styling, responsive behavior, and interactions for every page. It is not a
production build — there is no backend, no CMS, and no e-commerce wiring (see
[Handoff notes](#handoff-notes-what-still-needs-real-wiring)).

**Stack:** plain HTML + CSS + vanilla JS (ES modules). **No build step, no
framework, no dependencies.**

## Live preview

The prototype is published via GitHub Pages and tracks `main`:

> **https://faithgrounded.github.io/york-prototype/**

The site root redirects to `homepage.html` (via `index.html`). Every push to
`main` redeploys automatically within a minute or two.

## Run locally

No install needed — just serve the folder over HTTP (ES modules are
CORS-blocked over `file://`, so don't open the files directly):

```bash
npx serve .          # then open the printed URL (root redirects to homepage.html)
# or
python3 -m http.server 8000     # then open http://localhost:8000/
```

## Pages

Each page is its own standalone `.html` file (open any of them directly). The
shared header, announcement bar, and footer ("chrome") are duplicated into every
page rather than injected, so each file is self-contained.

| Group | Files |
|---|---|
| **Home** | `homepage.html` |
| **Collection landings** | `beginners-collection.html`, `muscle-maintenance.html`, `longevity-collection.html` |
| **Product listing (PLP)** | `plp-equipment.html`, `plp-racks-benches.html`, `plp-bars-weights.html`, `plp-cardio-conditioning.html`, `plp-accessories.html`, `plp-storage.html` |
| **Product detail (PDP)** | **23 per-product pages, generated** — one `<slug>.html` per product (e.g. `york-fitness-bench.html`, `plyo-package.html`). See "Product data & the PDP generator" below. `product-single.html` / `product-generic.html` / `product-package.html` remain as the three base layouts and as landing pages for not-yet-wired PLP cards. |
| **Search** | `search-results.html`, `search-empty.html` |
| **Content** | `about.html`, `contact.html`, `blog.html` |
| **Policy** | `returns-refunds.html`, `shipping.html`, `warranty.html` |

## Responsive

Designed and verified at three breakpoints: **1920**, **1440**, and **390**
(mobile). Several pages also carry intermediate handling around **1024** for
tablet. The layout is fluid between these anchors.

## File structure

```
index.html            Redirect → homepage.html (site-root entry for GitHub Pages)
*.html                One file per page (see table above)
css/
  tokens.css          Design tokens (CSS custom properties) — colors, spacing,
                      typography, layout. Mirrors the Figma primitive + semantic
                      variable collections. Edit tokens here; everything cascades.
  base.css            Reset + base typography utility classes (display-*, body-*)
  components.css       Reusable pieces: buttons, cards, forms, badges
  chrome.css          Announcement bar, nav/header, footer, dropdowns, mobile drawer
  pages.css           Per-page styles, scoped under a page/body class
                      (e.g. `#page-home .hero`, `.about-page …`). Largest file.
js/
  chrome.js           Nav, dropdowns, mobile drawer, search overlay, cart reveal,
                      announcement carousel, + homepage interactions
  modals.js           Opens/closes native <dialog> modals via [data-modal]
  pdp.js              PDP gallery + variant picker (PDP pages only)
  router.js           LEGACY — hash section-router from the original single-file
                      prototype. Commented out in markup; kept for reference only.
  pdp.js              PDP gallery + variant picker (PDP pages only)
assets/
  images/             Page imagery, foldered by area: home/ mega/ collections/
                      plp/ pdp/ about/ products/<slug>/ (per-product photos)
  icons/              Shared SVG/PNG icons (logo, cart, account)

data/
  products.json       The 23 products — single source of truth (copy, price,
                      image paths, template). Edit here, then re-run the generator.
templates/
  partials.js         Shared chrome (head, nav/mega-menu, footer, modals)
  single.js  generic.js  package.js   the three PDP layouts (render functions)
  shared.js  index.js   shared buy-box helpers + the template dispatcher
tools/
  build-products.mjs  data/products.json → 23 <slug>.html  (npm run build)
  verify.mjs          link / token / asset checks           (npm run verify)
  rewire-links.mjs    retarget nav/card links to real PDPs  (npm run rewire)
test/                 node --test unit tests for the above  (npm test)
```

**CSS load order matters:** `tokens → base → components → chrome → pages`.
Page-scoped rules in `pages.css` intentionally out-specify the generic component
rules. (One consolidated card-hover block lives at the very *end* of `pages.css`
for exactly this specificity reason — it's commented in place.)

## Product data & the PDP generator

The 23 product-detail pages are **generated**, not hand-written. `data/products.json`
is the single source of truth (each product's copy, price, image paths, and which of
the three layouts it uses); a small zero-dependency Node script renders each product
through `templates/` and writes a standalone `<slug>.html` to the repo root.

```bash
npm run build     # data/products.json + templates → 23 <slug>.html
npm run verify    # checks every internal link/asset resolves, no leftover tokens
npm test          # node --test unit tests (no third-party deps)
npm run rewire    # retarget nav/card product links to the real <slug>.html
```

**This does NOT add a build step to the site.** The generated `<slug>.html` files are
committed and served as plain static HTML exactly like every other page — `npm run`
is only for regenerating them when the data or a template changes. There are **no
runtime dependencies**; `node_modules/` is only present if you run the dev scripts.

> **Do not hand-edit the generated `<slug>.html` files** — they carry a
> `<!-- GENERATED … do not edit by hand -->` banner and are overwritten on the next
> `npm run build`. To change a product, edit `data/products.json` (or a `templates/`
> file for structural changes) and re-run the generator.

**Known scope notes for the next pass:**
- **Variant selectors (Phase 2):** ~6 products have real variant pickers in the Figma
  comps (weight matrix, tier/package selectors, set-vs-individual, accessories). Phase 1
  ships them with the quantity stepper; the custom selectors + `js/pdp.js` come next.
- **PLP/collection card grids** still contain placeholder cards and out-of-scope products
  that link to the three base templates (kept as landing pages). Wiring those grids to
  real products is a separate PLP pass; `npm run verify` reports them as non-failing
  warnings.
- **Prices** are from the live yorkbarbell.com listings (each product's
  `price.sourceUrl` records where). Variable products show the lowest "from" variant.

## Interactions worth clicking through

- **Announcement bar** auto-rotates (5s) with prev/next controls
- **Mega-menu** dropdowns on desktop nav; **slide-in drawer** on mobile
- **Cart icon** reveals a price summary on hover
- **Home goal cards**: whole card is clickable; image zooms + title turns red on hover
- **Home history heading**: on scroll into view, the year counts down to 1932,
  then the second line types itself on
- **Card hover (site-wide)**: black border → red, image zoom (respects
  `prefers-reduced-motion`)
- **PDP**: image gallery + variant picker
- **Modals**: native `<dialog>` (variant details, gallery, etc.)

## Design system

Tokens in `css/tokens.css` are the single source of truth for color, spacing,
type, and layout, and map 1:1 to the Figma variable collections in
"York Barbell Website 26". When building the production site, port these tokens
rather than re-deriving values from the comps.

## Handoff notes (what still needs real wiring)

This prototype is front-end only. To productionize:

- **Cart** is in-memory/visual only — no persistence, no real line items
- **Search** results are placeholder content — wire to a real search backend
- **Forms** (contact, newsletter) don't submit anywhere
- **PLP filters/sorting** are static — wire to the product database
- **Product data** for the 23 PDPs lives in `data/products.json` (see "Product data &
  the PDP generator"); PLP/collection card data is still hardcoded in that markup
- Chrome (header/footer) is **duplicated per page** — in production this should
  become a shared include/component/partial
