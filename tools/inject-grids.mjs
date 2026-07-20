// Populate the placeholder product-listing grids (category PLPs, new collection
// pages, Shop All, goal pages) with real products from data/merchandising.json,
// linked to their <slug>.html. Rewrites only the cards inside each grid; all
// surrounding bespoke markup (heroes, editorial, toolbars) is left byte-identical.
//
// Dev-time tool. Run: `npm run grids`. Site stays build-step-free.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadProducts } from '../lib/products.js';
import { loadMerchandising, resolveEntry, FILTER_LABELS } from '../lib/merchandising.js';
import { plpCardHtml, collectionCardHtml } from '../templates/shared.js';
import { replaceEachInner, replaceCount } from '../lib/html-inject.js';

// Single-category PLP: one `.plp-category__grid`, one "Showing all N results" count.
export function injectSingleCatPlp(html, cards, count) {
  let out = replaceEachInner(html, /<div class="plp-category__grid">/, [`\n${cards}\n      `]);
  out = replaceCount(out, /Showing all \d+ results/, `Showing all ${count} results`);
  return out;
}

// Shop All (plp-equipment): several `[data-plp-category="<attr>"]` sections, each
// with a `.plp__grid`. Replaces each section's grid inner with its cards, matched
// by the section's data-attr so document order and the filter buttons stay valid.
export function injectShopAll(html, sections) {
  let out = html;
  for (const { attr, cards } of sections) {
    const openRe = new RegExp(`<section[^>]*data-plp-category="${attr}"[^>]*>[\\s\\S]*?<div class="plp__grid">`);
    out = replaceEachInner(out, openRe, [cards]);
  }
  return out;
}

// Rebuild a goal subsection's sub-filter sidebar from the products present:
// one <li> per distinct filterType, in first-seen order, so the working filter
// (js/chrome.js matches data-collection-filter <-> data-collection-card-category)
// always offers exactly the categories on screen.
export function subcatsHtml(cards) {
  const seen = [];
  for (const c of cards) if (c.filterType && !seen.includes(c.filterType)) seen.push(c.filterType);
  return seen.map((t) =>
    `          <li><a href="#${t}" data-collection-filter="${t}">${FILTER_LABELS[t] || t}</a></li>`
  ).join('\n');
}

// Goal page: three [data-collection-products] sections in document order
// (Strength / Cardio / Mobility). Each has a `…__products-grid` and, before it,
// a `…__products-subcats` <ul>. `sections` is length-3: { cards, subcats }.
export function injectGoal(html, sections) {
  let out = replaceEachInner(html, /<div class="[^"]*__products-grid">/, sections.map((s) => s.cards));
  out = replaceEachInner(out, /<ul class="[^"]*__products-subcats"[^>]*>/, sections.map((s) => s.subcats), 'ul');
  return out;
}

// The "Don't forget to complete your gym" cross-sell grid at the foot of a goal
// page. The grid class varies (`…__footer-cta-grid` on muscle, `…__cta-grid` on
// longevity); both end in `cta-grid`, and there is exactly one per page.
export function injectCta(html, cards) {
  return replaceEachInner(html, /<div class="[^"]*cta-grid">/, [cards]);
}

// --- CLI ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const products = loadProducts('data/products.json');
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const merch = loadMerchandising('data/merchandising.json');

  // Every single-grid collection page (5 existing category PLPs + 3 new ones).
  const SINGLE_CAT = ['racks-benches', 'bars-weights', 'cardio-conditioning', 'accessories', 'storage',
    'systems', 'recovery-mobility', 'essentials'];
  for (const key of SINGLE_CAT) {
    const c = merch.collections[key];
    const cards = c.products.map((e) => plpCardHtml(resolveEntry(e, bySlug))).join('\n');
    const html = readFileSync(c.page, 'utf8');
    writeFileSync(c.page, injectSingleCatPlp(html, cards, c.products.length), 'utf8');
    console.log(`  ${c.page}: ${c.products.length} cards`);
  }
  console.log(`Injected ${SINGLE_CAT.length} single-category PLPs.`);

  // Shop All — group all products by primary `category` into the existing sections.
  // The 3 packages (category "equipment") have no section and are intentionally
  // skipped here; full re-section to the 8 new collections is deferred with the nav.
  const CAT_TO_ATTR = {
    'racks-benches': 'racks-benches', 'bars-weights': 'bars-weights',
    'cardio-conditioning': 'cardio', 'accessories': 'accessories', 'storage': 'storage',
  };
  const byCat = {};
  const skipped = [];
  for (const p of products) {
    const attr = CAT_TO_ATTR[p.category];
    if (!attr) { skipped.push(p.slug); continue; }
    (byCat[attr] ||= []).push(plpCardHtml(resolveEntry(p.slug, bySlug)));
  }
  const shopAllHtml = readFileSync(merch.shopAll.page, 'utf8');
  const sections = Object.entries(byCat).map(([attr, cards]) => ({
    attr,
    // grid <div> sits at 8-space indent in this page; cards go 2 deeper.
    cards: `\n${cards.map((c) => `  ${c}`).join('\n')}\n        `,
  }));
  writeFileSync(merch.shopAll.page, injectShopAll(shopAllHtml, sections), 'utf8');
  console.log(`Shop All: ${sections.length} sections populated; skipped ${skipped.length} package(s): ${skipped.join(', ') || 'none'}`);

  // Goal pages — each has 3 subsections (Strength / Cardio / Mobility).
  for (const [key, goal] of Object.entries(merch.goals)) {
    if (goal.sections.length !== 3) throw new Error(`${goal.page}: expected 3 sections, got ${goal.sections.length}`);
    const goalHtml = readFileSync(goal.page, 'utf8');
    const injected = goal.sections.map((sec) => {
      const resolved = sec.products.map((e) => resolveEntry(e, bySlug));
      const cards = resolved.map((c) => collectionCardHtml(c)).join('\n');
      return { cards: `\n${cards}\n      `, subcats: `\n${subcatsHtml(resolved)}\n        ` };
    });
    let outHtml = injectGoal(goalHtml, injected);
    if (goal.cta) {
      const ctaCards = goal.cta.map((e) => collectionCardHtml(resolveEntry(e, bySlug))).join('\n');
      outHtml = injectCta(outHtml, `\n${ctaCards}\n      `);
    }
    writeFileSync(goal.page, outHtml, 'utf8');
    const ctaNote = goal.cta ? ` + ${goal.cta.length}-card cross-sell` : '';
    console.log(`  ${goal.page}: ${goal.sections.map((s) => s.products.length).join('/')} cards${ctaNote}`);
  }
  console.log(`Injected ${Object.keys(merch.goals).length} goal pages.`);
}
