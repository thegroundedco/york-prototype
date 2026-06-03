// router.js — hash-based section router

const DEFAULT_ROUTE = 'home';
const NOT_FOUND_ID = 'page-not-found';

function currentRoute() {
  const hash = window.location.hash.replace(/^#/, '').split('?')[0];
  return hash || DEFAULT_ROUTE;
}

function showSection(route) {
  const pages = document.querySelectorAll('.page');
  let matched = null;

  pages.forEach((section) => {
    if (section.id === `page-${route}`) {
      matched = section;
      section.removeAttribute('hidden');
    } else {
      section.setAttribute('hidden', '');
    }
  });

  if (!matched) {
    matched = document.getElementById(NOT_FOUND_ID);
    if (matched) matched.removeAttribute('hidden');
  }

  if (matched) {
    const title = matched.dataset.title;
    if (title) document.title = title;
  }

  // Update aria-current on nav links
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const linkHash = (link.getAttribute('href') || '').replace(/^#/, '');
    if (linkHash === route) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function init() {
  showSection(currentRoute());
  window.addEventListener('hashchange', () => showSection(currentRoute()));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
