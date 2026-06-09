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
| **Product detail (PDP)** | `product-package.html`, `product-single.html`, `product-generic.html` |
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
assets/
  images/             Page imagery, foldered by area: home/ mega/ collections/
                      plp/ pdp/ about/
  icons/              Shared SVG/PNG icons (logo, cart, account)
```

**CSS load order matters:** `tokens → base → components → chrome → pages`.
Page-scoped rules in `pages.css` intentionally out-specify the generic component
rules. (One consolidated card-hover block lives at the very *end* of `pages.css`
for exactly this specificity reason — it's commented in place.)

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
- **Product data** (prices, variants, inventory) is hardcoded in the markup
- Chrome (header/footer) is **duplicated per page** — in production this should
  become a shared include/component/partial
