# York — Site image pass (Figma → site), design + checklist

**Date:** 2026-07-21
**Status:** In progress
**Source of client direction:** `York, Website Feedback.md` (Obsidian) — "Steps: 1. Images first
(export all from Figma for the proper pages; PDPs already look great). 2. Compare Figma↔site
after, incl. nav. 3. PDPs next."

## Goal

Replace the placeholder images on **every non-PDP page + the nav** with the real images from
the Figma file, then a Figma↔site verification pass. PDPs are out of scope here (client says
they look great). Product-linking on homepage/search folds in while those pages are open.

## Source

Figma file `AvkyvrFVv3PmI2pUm2wy3o` ("York Barbell Website 26"), page `107:305` "Ready for Dev".
Match the **1440 desktop** frames (the site is 1440-based). Frame map below.

## Per-page workflow (repeat for each page)

1. **Inventory** the site page's `<img src>` slots (which are placeholders vs already-real).
2. **Screenshot the Figma frame** (`get_screenshot`) to see the intended images + placement.
3. **Export** the frame's images: `get_design_context` returns a JSON of asset download URLs
   (or `download_assets`); `curl` them down.
4. **Place** into `assets/images/<area>/…` at the filenames the page references (replace
   placeholders in-place; keep the site's existing filenames so no HTML edit is needed unless
   a slot is missing).
5. **Rebuild** if the page is generator-output (PLPs/collections are hand-authored; only the
   PDPs are generated — not in scope). Most image swaps need no HTML change.
6. **Before/after screenshot** at 1440 via the local dev server; **Adam reviews per page**
   before moving on.

## Page order (all non-PDP; per Adam "everything non-PDP", per-page review)

1. Homepage — `986:12356` (carousel slides `1613:13972`, `1613:14019`)
2. Nav mega-menu — `2525:7689`
3. Beginners collection — `2313:5912`
4. Muscle Maintenance — `1167:31053`
5. Longevity — `1221:32488`
6. Shop All Equipment PLP — `1498:14715`
7. Category PLP (template for the 6 single-category PLPs) — `1542:13341`
8. Search results — `1582:13731`; Search empty — `2485:10209`
9. Blog — `2697:15187`
10. About — `1613:14085`; Contact — `1723:10`; Returns — `1730:14911`; Shipping — `1844:14376`; Warranty — `1828:27192`

## Then (later phases, tracked separately)

- **Phase 2 — Verify:** page-by-page Figma↔site diff, incl. nav; fix mismatches.
- **Phase 3 — PDPs:** Kettlebell/Rubber Hex selector redesign (all-sizes grid + bundle-as-a-
  selection-above-individual + header price reflects selection); Power Cage "Popular
  Accessories" limited to products within the 23; homepage/search product linking.

## Notes

- Assets currently ~20MB; keep exports optimized (Figma exports at 1–2×; downscale large hero
  images to ≤1600px wide JPEG where practical, matching the existing asset conventions).
- The CRLF CSS cache-bust + `.nojekyll` Pages fix are already in place; image-only changes
  don't touch CSS, so no PDP rebuild/hash churn from this pass.
