// chrome.js — nav, dropdowns, mobile menu, search, cart drawer, announcement bar

// ── Body scroll lock (shared across all modals/drawers/overlays) ──
// Pin the body in place while an overlay is open so the background can't
// scroll. Tracks an open-count so nested/overlapping overlays don't clobber
// each other. On full unlock, restores the original scroll position.
window.YorkBodyLock = (function () {
  let savedScrollY = 0;
  let openCount = 0;
  function lock() {
    openCount += 1;
    if (openCount > 1) return;
    savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlock() {
    openCount = Math.max(0, openCount - 1);
    if (openCount > 0) return;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo({ top: savedScrollY, behavior: 'instant' });
  }
  return { lock, unlock };
})();

// ── Announcement bar carousel ──
function initAnnouncementBar() {
  const bar = document.getElementById('announcement-bar');
  if (!bar) return;
  const messages = bar.querySelectorAll('.announcement-bar__message');
  const prevBtn = bar.querySelector('.announcement-bar__nav--prev');
  const nextBtn = bar.querySelector('.announcement-bar__nav--next');
  if (messages.length === 0) return;

  let activeIndex = 0;
  let timer = null;
  const AUTO_INTERVAL_MS = 7000;

  function show(index) {
    activeIndex = ((index % messages.length) + messages.length) % messages.length;
    messages.forEach((msg, i) => {
      if (i === activeIndex) msg.removeAttribute('hidden');
      else msg.setAttribute('hidden', '');
    });
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(() => show(activeIndex + 1), AUTO_INTERVAL_MS);
  }
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  prevBtn?.addEventListener('click', () => {
    show(activeIndex - 1);
    stopAuto();
    startAuto();
  });
  nextBtn?.addEventListener('click', () => {
    show(activeIndex + 1);
    stopAuto();
    startAuto();
  });

  bar.addEventListener('mouseenter', stopAuto);
  bar.addEventListener('mouseleave', startAuto);

  // Auto-rotate only if user hasn't requested reduced motion
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reducedMotion.matches) startAuto();
}

initAnnouncementBar();

// ── Sticky nav + idle hide ──
// - Slides up with the announcement bar, anchors at 24px from the viewport top.
// - Auto-hides after the user is idle for ~2.5s. Any movement (mouse, scroll,
//   key, touch) brings it back.
function initStickyNav() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const announcement = document.getElementById('announcement-bar');
  const announcementHeight = announcement?.offsetHeight ?? 48;
  const NAV_TOP_AT_REST = announcementHeight + 24;
  const NAV_TOP_WHEN_STUCK = 24;
  const IDLE_DELAY = 2500;  // ms before nav hides

  function setTopOffset() {
    const top = Math.max(NAV_TOP_WHEN_STUCK, NAV_TOP_AT_REST - window.scrollY);
    document.documentElement.style.setProperty('--site-header-top', top + 'px');
  }

  setTopOffset();
  window.addEventListener('resize', setTopOffset);

  // Idle-hide only applies once the user has scrolled past the page's hero
  // (or past a small default threshold on pages without one). While they're
  // still looking at the hero, the nav stays put.
  function getHideThreshold() {
    const hero = document.querySelector(
      '.home__hero, [class$="__hero"], .about__container, .contact__container'
    );
    if (hero) {
      const rect = hero.getBoundingClientRect();
      return rect.top + window.scrollY + hero.offsetHeight - 100;  // 100px buffer
    }
    return 100;
  }

  let idleTimer = null;
  function maybeHide() {
    if (window.scrollY > getHideThreshold()) {
      header.classList.add('is-idle');
    }
  }
  function bumpActivity() {
    header.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(maybeHide, IDLE_DELAY);
  }

  // Scroll also updates the top offset
  window.addEventListener('scroll', () => {
    setTopOffset();
    bumpActivity();
  }, { passive: true });

  ['mousemove', 'keydown', 'touchstart', 'click'].forEach((evt) => {
    window.addEventListener(evt, bumpActivity, { passive: true });
  });

  bumpActivity();  // start the idle timer on load
}

initStickyNav();

// ── Desktop dropdown menus ──
function initDropdowns() {
  const triggers = document.querySelectorAll('[data-dropdown]');
  const dropdowns = document.querySelectorAll('.dropdown');

  function closeAll() {
    dropdowns.forEach((d) => d.setAttribute('hidden', ''));
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
  }

  triggers.forEach((trigger) => {
    const targetId = `dropdown-${trigger.dataset.dropdown}`;
    const target = document.getElementById(targetId);
    if (!target) return;

    function openOne() {
      closeAll();
      target.removeAttribute('hidden');
      trigger.setAttribute('aria-expanded', 'true');
    }

    trigger.addEventListener('mouseenter', openOne);
    trigger.addEventListener('focus', openOne);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  document.getElementById('site-header')?.addEventListener('mouseleave', closeAll);
}

initDropdowns();

// ── Search overlay ──
function initSearch() {
  const overlay = document.getElementById('search-overlay');
  const triggers = document.querySelectorAll('[data-toggle-search]');
  if (!overlay) return;
  const closeBtn = overlay.querySelector('.search-overlay__close');
  const input = overlay.querySelector('.search-overlay__input');

  function open() {
    overlay.removeAttribute('hidden');
    window.YorkBodyLock.lock();
    input?.focus();
  }
  function close() {
    overlay.setAttribute('hidden', '');
    window.YorkBodyLock.unlock();
    if (input) input.value = '';
    renderTypeahead('');
  }

  triggers.forEach((t) => t.addEventListener('click', open));
  closeBtn?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hasAttribute('hidden')) close();
  });

  // Click outside the field / links / buttons closes the overlay
  overlay.addEventListener('click', (e) => {
    if (!e.target.closest('.search-overlay__field, .search-overlay__close, a, button')) {
      close();
    }
  });

  // Click on the page area below the overlay also closes it
  document.addEventListener('click', (e) => {
    if (overlay.hasAttribute('hidden')) return;
    if (!overlay.contains(e.target) && !e.target.closest('[data-toggle-search]')) {
      close();
    }
  });

  // ── Search typeahead ──
  // Small in-memory catalog — every entry maps to a real PDP we've built.
  const SEARCH_CATALOG = [
    { name: 'York Performance Package', price: '$222.00', image: 'assets/images/pdp/pkg-main.jpg', url: 'product-package.html' },
    { name: 'York Fitness Bench', price: '$222.00', image: 'assets/images/pdp/bench-main.jpg', url: 'product-single.html' },
    { name: 'Battle Rope', price: '$222.00', image: 'assets/images/pdp/rope-main.jpg', url: 'product-generic.html' },
    { name: 'FTS Power Cage', price: '$1,200.00', image: 'assets/images/pdp/pkg-secondary-2.jpg', url: 'product-package.html' },
    { name: 'FTS Flat to Incline Utility Bench', price: '$420.00', image: 'assets/images/pdp/bench-main.jpg', url: 'product-single.html' },
    { name: 'Rubber Hex Dumbbell Set', price: '$680.00', image: 'assets/images/pdp/pkg-secondary-2.jpg', url: 'product-generic.html' },
    { name: 'Olympic Training Set: Plates + 44 lb Bar', price: '$1,520.00', image: 'assets/images/pdp/pkg-detail-2.jpg', url: 'product-package.html' },
    { name: 'Olympic Training Set: Plates + 33 lb Bar', price: '$1,420.00', image: 'assets/images/pdp/pkg-detail-2.jpg', url: 'product-package.html' },
    { name: "Men's North American Chrome Olympic Training Bar", price: '$340.00', image: 'assets/images/pdp/pkg-main.jpg', url: 'product-generic.html' },
    { name: "Women's Elite Olympic Training Bar", price: '$320.00', image: 'assets/images/pdp/pkg-main.jpg', url: 'product-generic.html' },
    { name: 'Black Rubber Training Bumper Plates', price: '$540.00', image: 'assets/images/pdp/pkg-detail-2.jpg', url: 'product-package.html' },
    { name: 'Kettlebells', price: '$80.00', image: 'assets/images/pdp/pkg-secondary-1.jpg', url: 'product-generic.html' },
    { name: 'Vinyl Fitbell (Multi-Color)', price: '$60.00', image: 'assets/images/pdp/pkg-main.jpg', url: 'product-single.html' },
    { name: 'Aspire 366 Stationary Bike', price: '$1,200.00', image: 'assets/images/pdp/single-product-2.jpg', url: 'product-single.html' },
    { name: 'Aspire 110 Rower', price: '$880.00', image: 'assets/images/pdp/single-rec-4.jpg', url: 'product-single.html' },
    { name: 'R-350 Rower', price: '$1,140.00', image: 'assets/images/pdp/single-rec-4.jpg', url: 'product-single.html' },
    { name: '300 Fan Bike', price: '$960.00', image: 'assets/images/pdp/single-product-2.jpg', url: 'product-single.html' },
    { name: 'Battle Rope', price: '$222.00', image: 'assets/images/pdp/rope-main.jpg', url: 'product-generic.html' },
    { name: 'Slam Ball', price: '$45.00', image: 'assets/images/pdp/pkg-secondary-1.jpg', url: 'product-generic.html' },
    { name: 'Plyo Package', price: '$340.00', image: 'assets/images/pdp/pkg-detail-1.jpg', url: 'product-package.html' },
    { name: 'Resistance Bands', price: '$32.00', image: 'assets/images/pdp/single-rec-1.jpg', url: 'product-generic.html' },
    { name: 'Yoga Mat', price: '$48.00', image: 'assets/images/pdp/single-rec-1.jpg', url: 'product-generic.html' },
    { name: 'York Quick Access Collar', price: '$28.00', image: 'assets/images/pdp/pkg-detail-1.jpg', url: 'product-generic.html' },
    { name: '2 Tier Dumbbell Stand', price: '$220.00', image: 'assets/images/pdp/pkg-secondary-2.jpg', url: 'product-generic.html' },
    { name: '3 Tier Dumbbell Stand', price: '$280.00', image: 'assets/images/pdp/pkg-secondary-2.jpg', url: 'product-generic.html' },
  ];

  const popular = overlay.querySelector('[data-search-popular]');
  const results = overlay.querySelector('[data-search-results]');

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function renderTypeahead(query) {
    if (!results) return;
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      popular?.removeAttribute('hidden');
      results.setAttribute('hidden', '');
      results.innerHTML = '';
      return;
    }
    popular?.setAttribute('hidden', '');
    const matches = SEARCH_CATALOG
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 8);
    if (matches.length === 0) {
      results.innerHTML = `
        <p class="search-overlay__results-title">Products</p>
        <p class="search-overlay__no-results">No products matched &ldquo;${escapeHtml(query)}.&rdquo; Try a different term.</p>
      `;
    } else {
      results.innerHTML = `
        <p class="search-overlay__results-title">Products</p>
        <ul class="search-overlay__results-list" role="list">
          ${matches.map((p) => `
            <li>
              <a class="search-overlay__result" href="${p.url}">
                <img class="search-overlay__result-image" src="${p.image}" alt="">
                <span class="search-overlay__result-name">${escapeHtml(p.name)}</span>
                <span class="search-overlay__result-price">${escapeHtml(p.price)}</span>
              </a>
            </li>
          `).join('')}
        </ul>
        <a class="search-overlay__results-all" href="search-results.html?q=${encodeURIComponent(query)}">See all results for &ldquo;${escapeHtml(query)}&rdquo; →</a>
      `;
    }
    results.removeAttribute('hidden');
  }

  input?.addEventListener('input', () => renderTypeahead(input.value));
}

initSearch();

// ── Mobile nav drawer ──
function initMobileDrawer() {
  const hamburger = document.querySelector('.site-nav__hamburger');
  const drawer = document.getElementById('mobile-nav-drawer');
  if (!hamburger || !drawer) return;
  const closeBtn = drawer.querySelector('.mobile-drawer__close');

  let previouslyFocused = null;

  function open() {
    previouslyFocused = document.activeElement;
    drawer.removeAttribute('hidden');
    hamburger.setAttribute('aria-expanded', 'true');
    drawer.querySelector('a, button')?.focus();
    window.YorkBodyLock.lock();
  }
  function close() {
    drawer.setAttribute('hidden', '');
    hamburger.setAttribute('aria-expanded', 'false');
    window.YorkBodyLock.unlock();
    previouslyFocused?.focus();
  }

  hamburger.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);

  // Clicking any link inside the drawer dismisses it
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) close();
  });

  // Expand/collapse "Shop Equipment" subnav
  const expandBtns = drawer.querySelectorAll('.mobile-drawer__expand-btn');
  expandBtns.forEach((btn) => {
    const subnav = btn.nextElementSibling;
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if (expanded) {
        subnav?.setAttribute('hidden', '');
      } else {
        subnav?.removeAttribute('hidden');
      }
    });
  });
}

initMobileDrawer();

// ── Cart drawer ──
function initCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const triggers = document.querySelectorAll('[data-toggle-cart]');
  if (!drawer) return;
  const closeBtn = drawer.querySelector('.cart-drawer__close');

  let previouslyFocused = null;

  function open() {
    previouslyFocused = document.activeElement;
    drawer.removeAttribute('hidden');
    drawer.querySelector('button, a')?.focus();
    // Also close the mobile drawer if it's open (cart should sit alone)
    document.getElementById('mobile-nav-drawer')?.setAttribute('hidden', '');
    window.YorkBodyLock.lock();
  }
  function close() {
    drawer.setAttribute('hidden', '');
    window.YorkBodyLock.unlock();
    previouslyFocused?.focus();
  }

  triggers.forEach((t) => t.addEventListener('click', open));
  closeBtn?.addEventListener('click', close);

  // Closing via the "Continue shopping" link inside the drawer should also dismiss it
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) close();
  });
}

initCartDrawer();

// ── Carousels (hero, gallery, etc.) ──
function initCarousel(carousel) {
  const slides = carousel.querySelectorAll('[data-carousel-slide]');
  const dots = carousel.querySelectorAll('[data-carousel-dot]');
  if (slides.length === 0 || dots.length === 0) return;

  let activeIndex = 0;
  let timer = null;
  const intervalAttr = parseInt(carousel.dataset.carouselInterval || '6000', 10);
  const AUTO_INTERVAL_MS = Number.isFinite(intervalAttr) ? intervalAttr : 6000;
  const noAuto = carousel.hasAttribute('data-carousel-no-auto');

  function go(index) {
    activeIndex = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      if (i === activeIndex) slide.removeAttribute('hidden');
      else slide.setAttribute('hidden', '');
    });
    dots.forEach((dot, i) => {
      dot.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
    });
  }

  function startAuto() {
    if (noAuto) return;
    stopAuto();
    timer = setInterval(() => go(activeIndex + 1), AUTO_INTERVAL_MS);
  }
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      go(i);
      if (!noAuto) { stopAuto(); startAuto(); }
    });
  });

  if (!noAuto) {
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
  }

  // Pointer swipe support (works for touch + mouse drag)
  let pointerStartX = null;
  let pointerId = null;
  carousel.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return; // only left mouse or touch
    pointerStartX = e.clientX;
    pointerId = e.pointerId;
  });
  carousel.addEventListener('pointerup', (e) => {
    if (pointerStartX === null || e.pointerId !== pointerId) return;
    const diff = pointerStartX - e.clientX;
    pointerStartX = null;
    pointerId = null;
    if (Math.abs(diff) < 50) return;
    go(diff > 0 ? activeIndex + 1 : activeIndex - 1);
  });
  carousel.addEventListener('pointercancel', () => {
    pointerStartX = null;
    pointerId = null;
  });

  // Keyboard arrow navigation
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(activeIndex + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(activeIndex - 1); }
  });

  // Expose go() so external code (e.g. modal opener) can jump to a specific slide
  carousel._goToSlide = go;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reducedMotion.matches) startAuto();
}

document.querySelectorAll('[data-carousel]').forEach(initCarousel);

// ── PLP category filter (show only the selected category, hide others) ──
document.querySelectorAll('[data-plp-filters]').forEach((filterList) => {
  const filters = filterList.querySelectorAll('[data-plp-filter]');
  const categories = document.querySelectorAll('[data-plp-category]');
  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      const value = filter.dataset.plpFilter;
      filters.forEach((f) => {
        const isActive = f === filter;
        f.classList.toggle('plp__filter--active', isActive);
        f.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      categories.forEach((cat) => {
        const show = value === 'all' || cat.dataset.plpCategory === value;
        if (show) cat.removeAttribute('hidden');
        else cat.setAttribute('hidden', '');
      });
    });
  });
});

// ── Collection landing: subcategory filter ──
// Each products section can wrap its subcat links + grid in [data-collection-products].
// Clicking a [data-collection-filter] hides cards whose
// [data-collection-card-category] doesn't match. Clicking the active filter clears it.
document.querySelectorAll('[data-collection-products]').forEach((section) => {
  const filters = section.querySelectorAll('[data-collection-filter]');
  const cards = section.querySelectorAll('[data-collection-card-category]');
  filters.forEach((filter) => {
    filter.addEventListener('click', (e) => {
      e.preventDefault();
      const value = filter.dataset.collectionFilter;
      const wasActive = filter.classList.contains('is-active');
      filters.forEach((f) => f.classList.remove('is-active'));
      if (wasActive) {
        cards.forEach((c) => c.removeAttribute('hidden'));
        return;
      }
      filter.classList.add('is-active');
      cards.forEach((c) => {
        if (c.dataset.collectionCardCategory === value) c.removeAttribute('hidden');
        else c.setAttribute('hidden', '');
      });
    });
  });
});

// ── PDP quantity selector ──
document.querySelectorAll('[data-qty-value]').forEach((input) => {
  const wrap = input.parentElement;
  const dec = wrap?.querySelector('[data-qty-decrement]');
  const inc = wrap?.querySelector('[data-qty-increment]');
  function setValue(n) {
    const next = Math.max(1, parseInt(n, 10) || 1);
    input.value = String(next);
  }
  dec?.addEventListener('click', () => setValue(parseInt(input.value, 10) - 1));
  inc?.addEventListener('click', () => setValue(parseInt(input.value, 10) + 1));
  input.addEventListener('change', () => setValue(input.value));
});

// ── Gallery image triggers: open modal AT a specific carousel index ──
document.querySelectorAll('[data-gallery-index]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const index = parseInt(trigger.dataset.galleryIndex, 10);
    if (!Number.isFinite(index)) return;
    const modalId = `modal-${trigger.dataset.modal}`;
    const modal = document.getElementById(modalId);
    const carousel = modal?.querySelector('[data-carousel]');
    if (carousel && typeof carousel._goToSlide === 'function') {
      carousel._goToSlide(index);
      carousel.focus();
    }
  });
});

// ── Tabs (role=tablist with opt-in data-tabs attribute) ──
function initTabs(tablist) {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  if (tabs.length === 0) return;

  function activate(tab) {
    tabs.forEach(t => {
      const isActive = t === tab;
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.setAttribute('tabindex', isActive ? '0' : '-1');
      const panelId = t.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      if (panel) {
        if (isActive) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      }
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (e) => {
      let target = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') target = tabs[0];
      else if (e.key === 'End') target = tabs[tabs.length - 1];
      if (target) { e.preventDefault(); target.focus(); activate(target); }
    });
  });
}

document.querySelectorAll('[role="tablist"][data-tabs]').forEach(initTabs);

// ── PDP recommendations: progress bar reflects horizontal scroll ──
document.querySelectorAll('[data-pdp-recs]').forEach((scroller) => {
  const bar = scroller.parentElement?.querySelector('[data-pdp-recs-bar]');
  if (!bar) return;
  function update() {
    const max = scroller.scrollWidth - scroller.clientWidth;
    const visibleRatio = scroller.clientWidth / scroller.scrollWidth;
    const barWidthPct = Math.max(15, Math.min(100, visibleRatio * 100));
    bar.style.width = barWidthPct + '%';
    if (max <= 0) {
      bar.style.left = '0%';
      return;
    }
    const scrollRatio = scroller.scrollLeft / max;
    const leftPct = (100 - barWidthPct) * scrollRatio;
    bar.style.left = leftPct + '%';
  }
  update();
  scroller.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
});
