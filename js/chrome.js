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

// ── Mobile: scroll-stop reveal of floating nav ──
// At ≤767px, the header sits in normal flow at the top. When the user
// scrolls and then stops scrolling (and isn't at the top of the page),
// add .is-revealed so the CSS slides a floating duplicate down. Scrolling
// again removes the class.
function initMobileFloatingNav() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const STOP_DELAY = 150;   // ms after last scroll event = "stopped"
  const MIN_SCROLL_Y = 80;  // don't reveal while still near the top
  let stopTimer = null;

  function onScroll() {
    if (!isMobile()) {
      header.classList.remove('is-revealed');
      return;
    }
    // Always hide while actively scrolling
    header.classList.remove('is-revealed');
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      if (window.scrollY > MIN_SCROLL_Y) {
        header.classList.add('is-revealed');
      }
    }, STOP_DELAY);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // Re-evaluate when crossing the breakpoint
  window.addEventListener('resize', () => {
    if (!isMobile()) header.classList.remove('is-revealed');
  });
}
initMobileFloatingNav();

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

// ── Home goal cards: whole-card click routes to the card's CTA ──
// The CTA <a> stays the real (keyboard/AT-focusable) link; this just makes the
// rest of the card a mouse target. Clicks that land on a real link/button are
// left alone so they navigate themselves (and we don't double-fire).
document.querySelectorAll('.goal-card').forEach((card) => {
  const cta = card.querySelector('.goal-card__cta');
  if (!cta) return;
  card.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    window.location.href = cta.href;
  });
});

// ── Home history heading: count the year down, then type the second line ──
// When the section scrolls into view: the year counts back from the current
// year to 1932 (~3s, ease-out), the second line stays hidden until that
// finishes, then it types itself on (~1.5s). Reduced-motion shows the final
// state instantly.
function initHistoryReveal() {
  const heading = document.querySelector('[data-history-animate]');
  if (!heading) return;
  const yearEl = heading.querySelector('[data-history-year]');
  const typedEl = heading.querySelector('[data-history-typed]');

  const FINAL_YEAR = 1932;
  const COUNT_MS = 3000;
  const TYPE_MS = 1500;
  const startYear = new Date().getFullYear();
  const fullText = typedEl ? typedEl.textContent : '';
  const chars = Array.from(fullText);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    if (yearEl) yearEl.textContent = String(FINAL_YEAR);
    if (typedEl) typedEl.textContent = fullText;
    return;
  }

  // "Before" state, set synchronously so it's ready before the section is
  // scrolled to (it sits well below the fold, so this is never visible).
  if (yearEl) yearEl.textContent = String(startYear);
  if (typedEl) typedEl.textContent = '';

  function typeLine() {
    if (!typedEl) return;
    typedEl.classList.add('is-typing');
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / TYPE_MS);
      typedEl.textContent = chars.slice(0, Math.round(t * chars.length)).join('');
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        typedEl.textContent = fullText;
        typedEl.classList.remove('is-typing');
      }
    }
    requestAnimationFrame(frame);
  }

  function countDown() {
    if (!yearEl) { typeLine(); return; }
    const span = startYear - FINAL_YEAR;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      yearEl.textContent = String(Math.round(startYear - span * eased));
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        yearEl.textContent = String(FINAL_YEAR);
        typeLine();
      }
    }
    requestAnimationFrame(frame);
  }

  let started = false;
  const run = () => { if (!started) { started = true; countDown(); } };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { run(); obs.disconnect(); }
      });
    }, { threshold: 0.5 });
    io.observe(heading);
  } else {
    run();
  }
}
initHistoryReveal();

// ── Cart price reveal: latch open after first hover so it stays visible ──
document.querySelectorAll('.site-nav__icon-btn--cart').forEach((btn) => {
  const reveal = () => btn.classList.add('is-price-revealed');
  btn.addEventListener('mouseenter', reveal, { once: true });
  btn.addEventListener('focus', reveal, { once: true });
});

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
  const intervalAttr = parseInt(carousel.dataset.carouselInterval || '5000', 10);
  const AUTO_INTERVAL_MS = Number.isFinite(intervalAttr) ? intervalAttr : 5000;
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

// ── Cart count badge + running total ──
// Persists across pages in localStorage. Any add-to-cart trigger increments
// the count AND adds the product's price to the running total.
(function () {
  const COUNT_KEY = 'york_cart_count';
  const TOTAL_KEY = 'york_cart_total';
  const getCount = () => parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0;
  const getTotal = () => parseFloat(localStorage.getItem(TOTAL_KEY) || '0') || 0;
  const setState = (n, t) => {
    localStorage.setItem(COUNT_KEY, String(Math.max(0, n)));
    localStorage.setItem(TOTAL_KEY, String(Math.max(0, t)));
    render();
  };

  const fmt = (n) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function render() {
    const n = getCount();
    const t = getTotal();
    document.querySelectorAll('[data-cart-badge]').forEach((badge) => {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.toggleAttribute('hidden', n === 0);
    });
    document.querySelectorAll('.site-nav__cart-total').forEach((el) => {
      el.textContent = fmt(t);
    });
  }
  render();

  // Parse "$1,299.00" / "$899.00" / "1299" → 1299, 899, 1299
  const parsePrice = (s) => {
    if (!s) return 0;
    const m = String(s).replace(/[, ]+/g, '').match(/\$?(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  };

  // Find the price for the product the trigger belongs to.
  function priceFor(trigger) {
    // 1) Explicit data-price on the trigger itself
    if (trigger.dataset.price) return parsePrice(trigger.dataset.price);
    // 2) Price baked into the trigger's own text (e.g. "Add Bundle to cart - $222.00")
    const inText = parsePrice(trigger.textContent);
    if (inText) return inText;
    // 3) Walk to the nearest product-card / buy-box ancestor and find a price element
    const card = trigger.closest(
      '.product-card, .collections-product-card, .pdp-single__rec-card, ' +
      '.pdp__rec-card, .pdp__featured-card, .pdp__buy, .pdp-single__buy, ' +
      '.pdp-generic__buy, .pdp-single__product'
    );
    const scope = card || trigger.parentElement;
    if (!scope) return 0;
    // Prefer sale price (current selling price) when both sale + original exist
    const saleEl = scope.querySelector(
      '.product-card__price--sale, .collections-product-card__price--sale, ' +
      '.pdp-single__rec-price--sale, .pdp__rec-price--sale'
    );
    if (saleEl) return parsePrice(saleEl.textContent);
    // Otherwise the first non-modifier price
    const priceEl = scope.querySelector(
      '.product-card__price, .collections-product-card__price, ' +
      '.pdp-single__rec-price, .pdp__rec-price, .pdp__price, .pdp-single__price'
    );
    if (priceEl) return parsePrice(priceEl.textContent);
    return 0;
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest(
      'a[href="#cart"], [data-add-to-cart], .pdp__cta, .pdp-single__cta, .pdp-generic__cta'
    );
    if (!trigger) return;
    e.preventDefault();
    const price = priceFor(trigger);
    setState(getCount() + 1, getTotal() + price);
  });

  // Keep multiple tabs in sync
  window.addEventListener('storage', (e) => {
    if (e.key === COUNT_KEY || e.key === TOTAL_KEY) render();
  });
})();

// ── Reading-progress highlight ──
// Each [data-typewriter] paragraph is split into per-word spans. All words
// start dimmed; as the user scrolls past the paragraphs, words light up
// one by one in reading order, like a karaoke-style reading position.
const typewriterEls = Array.from(document.querySelectorAll('[data-typewriter]'));
if (typewriterEls.length) {
  typewriterEls.forEach((el) => {
    const text = el.textContent;
    // Split keeping whitespace; only word tokens get wrapped
    const tokens = text.split(/(\s+)/);
    el.innerHTML = tokens
      .map((t) => {
        if (!t) return '';
        if (/^\s+$/.test(t)) return t;
        return `<span class="reading-word">${t.replace(/</g, '&lt;')}</span>`;
      })
      .join('');
    el.removeAttribute('hidden');
    el.classList.add('reading-progress');
  });

  // Collect all word spans across all paragraphs in document order
  const allWords = [];
  typewriterEls.forEach((el) => {
    el.querySelectorAll('.reading-word').forEach((w) => allWords.push(w));
  });

  // Anchor the reading-progress range to the nearest [data-reading-anchor] ancestor
  // (the scroll runway). Reading fills as the user scrolls THROUGH the anchor.
  const anchor = typewriterEls[0].closest('[data-reading-anchor]');

  const onScroll = () => {
    const vh = window.innerHeight;
    let startY, endY;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const topAbs = window.scrollY + rect.top;
      const bottomAbs = window.scrollY + rect.bottom;
      // Progress 0 when anchor top is at viewport top; 1 when anchor bottom is at viewport bottom.
      startY = topAbs;
      endY = bottomAbs - vh;
    } else {
      // Fallback: anchor on first/last paragraphs
      const firstRect = typewriterEls[0].getBoundingClientRect();
      const lastRect = typewriterEls[typewriterEls.length - 1].getBoundingClientRect();
      startY = Math.max(0, window.scrollY + firstRect.top - vh * 0.5);
      endY = window.scrollY + lastRect.bottom - vh * 0.2;
    }
    const range = endY - startY;
    const progress = range > 0 ? Math.max(0, Math.min(1, (window.scrollY - startY) / range)) : 0;
    const currentIdx = Math.floor(progress * allWords.length);
    allWords.forEach((w, i) => {
      w.classList.toggle('is-read', i < currentIdx);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

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

// ── PDP description: truncated by default, toggles open via [data-pdp-description-toggle] ──
document.querySelectorAll('[data-pdp-description]').forEach((desc) => {
  const toggle = desc.querySelector('[data-pdp-description-toggle]');
  if (!toggle) return;
  const moreLabel = toggle.querySelector('[data-pdp-description-label-more]');
  const lessLabel = toggle.querySelector('[data-pdp-description-label-less]');
  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const expanded = desc.classList.toggle('is-expanded');
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (moreLabel) moreLabel.toggleAttribute('hidden', expanded);
    if (lessLabel) lessLabel.toggleAttribute('hidden', !expanded);
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

// ── PDP weight selector (sold-individually matrix) ──
// Per-row steppers update the row qty; the subtotal re-sums qty*price live.
// No-op on pages without a [data-weight-selector].
document.querySelectorAll('[data-weight-selector]').forEach((sel) => {
  const rows = [...sel.querySelectorAll('[data-weight-row]')];
  const subtotalEl = sel.querySelector('[data-weight-subtotal]');
  const recompute = () => {
    let total = 0;
    for (const row of rows) {
      const qty = Math.max(0, parseInt(row.querySelector('[data-weight-qty]').value, 10) || 0);
      const price = parseFloat(row.querySelector('[data-weight-price]').dataset.weightPrice) || 0;
      total += qty * price;
    }
    if (subtotalEl) subtotalEl.textContent = `$${total.toFixed(2)}`;
  };
  for (const row of rows) {
    const qty = row.querySelector('[data-weight-qty]');
    row.querySelector('[data-weight-decrement]')?.addEventListener('click', () => {
      qty.value = Math.max(0, (parseInt(qty.value, 10) || 0) - 1); recompute();
    });
    row.querySelector('[data-weight-increment]')?.addEventListener('click', () => {
      qty.value = (parseInt(qty.value, 10) || 0) + 1; recompute();
    });
    qty.addEventListener('input', () => { qty.value = qty.value.replace(/[^0-9]/g, ''); recompute(); });
  }
  recompute();
});

// ── PDP set-or-individual toggle ──
// Tabs switch the visible panel; total = active panel's selected price * qty.
// No-op on pages without a [data-soi].
document.querySelectorAll('[data-soi]').forEach((soi) => {
  const tabs = [...soi.querySelectorAll('[data-soi-tab]')];
  const panels = [...soi.querySelectorAll('[data-soi-panel]')];
  const totalEl = soi.querySelector('[data-soi-total]');
  const active = () => panels.find((p) => !p.hidden) || panels[0];
  const recompute = () => {
    const panel = active();
    const price = parseFloat(panel.querySelector('[data-soi-select]').value) || 0;
    const qty = Math.max(1, parseInt(panel.querySelector('[data-soi-qty-value]').value, 10) || 1);
    if (totalEl) totalEl.textContent = `$${(price * qty).toFixed(2)}`;
  };
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const key = tab.dataset.soiTab;
      for (const t of tabs) {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      }
      for (const p of panels) p.hidden = p.dataset.soiPanel !== key;
      recompute();
    });
  }
  for (const panel of panels) {
    panel.querySelector('[data-soi-select]').addEventListener('change', recompute);
    const qv = panel.querySelector('[data-soi-qty-value]');
    panel.querySelector('[data-soi-qty-decrement]')?.addEventListener('click', () => {
      qv.value = Math.max(1, (parseInt(qv.value, 10) || 1) - 1); recompute();
    });
    panel.querySelector('[data-soi-qty-increment]')?.addEventListener('click', () => {
      qv.value = (parseInt(qv.value, 10) || 1) + 1; recompute();
    });
    qv.addEventListener('input', () => { qv.value = qv.value.replace(/[^0-9]/g, ''); recompute(); });
  }
  recompute();
});

// ── PDP tier selector ──
// Checked radio's price * qty drives the live total. No-op without [data-tier].
document.querySelectorAll('[data-tier]').forEach((tier) => {
  const radios = [...tier.querySelectorAll('[data-tier-radio]')];
  const qv = tier.querySelector('[data-tier-qty-value]');
  const totalEl = tier.querySelector('[data-tier-total]');
  const recompute = () => {
    const checked = radios.find((r) => r.checked) || radios[0];
    const price = parseFloat(checked.value) || 0;
    const qty = Math.max(1, parseInt(qv.value, 10) || 1);
    if (totalEl) totalEl.textContent = `$${(price * qty).toFixed(2)}`;
  };
  radios.forEach((r) => r.addEventListener('change', recompute));
  tier.querySelector('[data-tier-qty-decrement]')?.addEventListener('click', () => { qv.value = Math.max(1, (parseInt(qv.value, 10) || 1) - 1); recompute(); });
  tier.querySelector('[data-tier-qty-increment]')?.addEventListener('click', () => { qv.value = (parseInt(qv.value, 10) || 1) + 1; recompute(); });
  qv.addEventListener('input', () => { qv.value = qv.value.replace(/[^0-9]/g, ''); recompute(); });
  recompute();
});

// ── PDP package selector ──
// Selected radio shows its included list + sets the total. No-op without [data-pkg].
document.querySelectorAll('[data-pkg]').forEach((pkg) => {
  const radios = [...pkg.querySelectorAll('[data-pkg-radio]')];
  const blocks = [...pkg.querySelectorAll('[data-pkg-included]')];
  const totalEl = pkg.querySelector('[data-pkg-total]');
  const update = () => {
    const checked = radios.find((r) => r.checked) || radios[0];
    const key = checked.dataset.pkgKey;
    for (const b of blocks) b.hidden = b.dataset.pkgIncluded !== key;
    if (totalEl) totalEl.textContent = `$${(parseFloat(checked.value) || 0).toFixed(2)}`;
  };
  radios.forEach((r) => r.addEventListener('change', update));
  update();
});

// ── PDP accessories add-ons ──
// Total = base cage price + sum of checked add-ons. No-op without [data-acc].
document.querySelectorAll('[data-acc]').forEach((acc) => {
  const base = parseFloat(acc.dataset.accBase) || 0;
  const checks = [...acc.querySelectorAll('[data-acc-check]')];
  const totalEl = acc.querySelector('[data-acc-total]');
  const update = () => {
    let total = base;
    for (const c of checks) if (c.checked) total += parseFloat(c.value) || 0;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  };
  checks.forEach((c) => c.addEventListener('change', update));
  update();
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

// ── Search results: swap "term" placeholders with the ?q= the user typed ──
(function injectSearchTerm() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('q');
  if (!raw) return;
  const term = raw.trim();
  if (!term) return;
  document.querySelectorAll('.plp-search__term').forEach((el) => {
    el.textContent = term;
  });
  // Mirror it back into the search overlay input so the user can refine
  const input = document.querySelector('.search-overlay__input');
  if (input && !input.value) input.value = term;
})();

// ── PLP sort icon → open the visually-hidden native <select> on mobile ──
// At ≤767 the dropdown is hidden but kept in the DOM. The icon button calls
// showPicker() (Chromium / Safari 16.4+) and falls back to a focus+click.
document.querySelectorAll('.plp__sort-icon').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const container = btn.closest('.plp__sort, .plp-category__sort');
    const select = container && container.querySelector('.plp__sort-select');
    if (!select) return;
    e.preventDefault();
    try {
      if (typeof select.showPicker === 'function') {
        select.showPicker();
        return;
      }
    } catch (_) { /* fall through */ }
    select.focus();
    select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
});
