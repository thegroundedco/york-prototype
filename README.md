# York Barbell HTML Prototype

A single-file HTML prototype of the York Barbell website, built from the completed Figma designs (file `AvkyvrFVv3PmI2pUm2wy3o` — "York Barbell Website 26"). Intended as a developer handoff reference.

## Open

Any local file server works. Two examples:

```bash
python3 -m http.server 8000        # then open http://localhost:8000/prototype.html
# or
npx serve .                        # then open the URL it prints
```

Opening `prototype.html` directly via `file://` mostly works but ES modules and some MCP-fetched assets may be CORS-blocked — prefer a local server.

## Navigation

The prototype is a single HTML file. Pages are switched via URL hash:

- `#home` — Home page
- `#about` — About
- (more added as pages are built)

## File structure

- `prototype.html` — the single page; every page template lives here as a `<section>`
- `css/tokens.css` — design tokens (CSS custom properties) from Figma primitives + semantic collections
- `css/base.css` — reset + typography classes
- `css/components.css` — buttons, cards, forms, badges
- `css/chrome.css` — announcement bar, nav, footer, dropdowns, mobile drawer
- `css/pages.css` — per-page styles, scoped under section IDs (e.g. `#page-home .hero`)
- `js/router.js` — hash routing
- `js/chrome.js` — nav, dropdowns, mobile menu, search overlay, cart drawer, announcement dismiss
- `js/modals.js` — modal open/close
- `js/pdp.js` — PDP-specific (gallery, variant picker)
- `assets/images/` — exported from Figma per page
- `assets/icons/` — SVG icons shared across pages

## Page → Figma frame map

(Populated as pages are built.)

| Page | Figma frame IDs |
|---|---|
| Home | `986:12585` (1920) / `986:12356` (1440) / `986:12712` (390) |

## "Wire to backend" gaps for dev handoff

- Cart state is in-memory only; persisting + showing real line items requires a backend
- Search results are placeholder; wire to a real search engine
- Forms (contact, newsletter) do not submit anywhere
- Filters on PLPs are static; wire to product DB
