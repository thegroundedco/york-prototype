# York Barbell — working context for Claude

This file is the cross-machine memory for the York Barbell project. `README.md` is the
*developer* handoff (architecture, page map, how to run). This file is the *agent* handoff:
project state, working agreements, and gotchas that aren't discoverable from the code.

Owner: Adam Tarr (Grounded Company). Client: York Barbell.

---

## The two halves of this project

**1. The Figma design system + retrofit** (file `AvkyvrFVv3PmI2pUm2wy3o`, "York Barbell Website 26").
Not in this repo — lives in Figma. Status and rules below.

**2. This repo — the static HTML site.** Plain HTML/CSS/vanilla JS, no build step, no
`package.json`. `npm run dev` does NOT work. Serve it: `npx serve .` or
`python3 -m http.server 8000`. Root `index.html` redirects to `homepage.html`.

---

## Repo status

All ~21 page templates are **built and breakpoint-swept** at 1920 / 1440 / 390 (several also
handle ~1024 tablet). Remaining work is **spot-check / QA, not building.** Do not re-do the
PDP / PLP / search responsive sweeps — they were completed in commit `73e47dc` (2026-06-05).

User-verified at all breakpoints: homepage, the 3 collection landings, about, contact, blog,
and the 3 policy pages. Swept but awaiting Adam's spot-check: the 3 PDPs, the 6 PLPs, and the
2 search pages.

**Live site:** https://thegroundedco.github.io/york-barbell/ — GitHub Pages, auto-redeploys
on every push to `main`.

**Remotes:** `origin` = `thegroundedco/york-barbell` (canonical). `faithgrounded` =
the original repo, kept as a secondary remote, no longer the source of truth. If a git push
hangs on a credential popup in a non-interactive shell, use:
`git -c credential.helper="!gh auth git-credential" push`

---

## Working agreements (these override default behavior)

**Section-by-section, user-directed — never bulk.** Inventory the target page into named
sections (Hero, Product Info, Image Strip, Related Products, Footer…), surface them to Adam,
let him pick what to work on and what to change, execute just that scope, show the result,
repeat. Bulk whole-page passes have failed here: ~150 decisions per page is too opaque for
review, and Adam has design judgment on the calls that matter.

**Text case:** ALL CAPS for display + heading styles, sentence case for body and caption,
title case for labels. In Figma this is enforced via the `textCase: UPPER` attribute, not by
rewriting the source strings.

---

## Figma-side rules (for design-system retrofit work)

**Retrofits must produce ZERO visual change.** The page should render pixel-identical
afterward. A retrofit only swaps a raw value for the closest exact-match variable. It does
not flip modes, restructure, or reposition anything.

Forbidden: applying Light mode to a frame; touching any IMAGE or GRADIENT paint; rebuilding a
`fills` array (mutate paints **in place** via `setBoundVariableForPaint`); adding/removing
nodes; reordering, resizing, repositioning, regrouping.

**Known failure modes to defend against** (all three happened in one frame, all caught by Adam
on visual review):
1. *Image paint stripped* — a fills-array rebuild wiped a hero photo to solid black. Never
   rewrite a fills array.
2. *Cream-surface text missed* — the "nearest opaque ancestor" walk missed an absolutely
   positioned heading. Build the surface map by **absolute bounding box + visual stacking**,
   not layout ancestry.
3. *Red CTA background lost* — a frame fill silently never got bound. Run a post-binding
   verification walk: re-read every touched node's resolved hex and compare to the original.

**Color consolidation table** (raw hex → variable):
- Near-black → `neutral/1000`: `#000000` `#101820` `#171717` `#1A1A1A` `#222222` `#333333` `#3B3B3B`
- Medium-gray → `neutral/500`: `#8A8A8A` `#9F9F9F` `#A4A4A4`
- Dark-gray → `neutral/700`: `#4F4F4F`
- Light-gray placeholder → `neutral/200`: `#D9D9D9` `#C7C7C7`
- Text-muted → `text/muted`: `#B2B2B2` `#B8B8B8`
- Off-white → `neutral/0`: `#FFFFFF` `#F5F5F5` `#F7F7F7` `#F2F2F2`
- Brand red → `accent/default` (frames) or `text/accent` (text): `#DA291C` `#D82828`
- Cream → `cream/base`: `#FBF7EB`

Acknowledged drift, leave unbound: `#7E7E7E` (newsletter placeholder), `#2D2926` (external
`surface/surface-invert`), `#DBDBDB` / `#DADADA`. Large flex-spread spacing idioms stay
unbound too.

**Footer components** — replace any custom-frame footer with the proper instance, then treat
it as chrome and skip it during binding:
| Breakpoint | Component ID |
|---|---|
| 1920 | `852:26137` |
| 1440 | `2395:6736` |
| 390 | `2395:6342` |

Nav and announcement bar are **not** covered by that rule — ask before swapping those.

**Open manual-fix queue** (blocked by a Figma plugin-runtime limit with the Field Gothic font —
`setBoundVariable` on fontSize never persists, so these need doing by hand in the Figma UI):
font-size bindings system-wide; ~48 off-scale font sizes across 30 frames; product-card title
case on the 9 collection-landing frames.

---

## Code gotchas

**Duplicate hero/title sizing in `css/pages.css`.** A consolidated breakpoint block near the
END of the file (~line 5520+) groups *every* page's hero/title selector together across three
ranges (≥1441 → 64px, 768–1440 → 48px, ≤767 → 24px). It loads after the per-section rules at
equal specificity, so **it wins**. When changing a hero or title font-size, edit both places —
or pull that one selector out of the shared group — otherwise the per-section edit is dead
code. This is how a mobile home-hero change silently stayed 24px.

**CSS load order matters:** `tokens → base → components → chrome → pages`. Page-scoped rules
intentionally out-specify the generic component rules.

**Chrome is duplicated per page,** not injected — a change to the header or footer means
editing all ~21 HTML files.
