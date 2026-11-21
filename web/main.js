// CirkleFlix entry point: hash router, top nav, language toggle, settings modal

import { onLangChange, t, toggleLang } from './i18n.js';
import { el } from './ui.js';
import { renderCategory, renderMyList, renderSection } from './views/browse.js';
import { renderDetail } from './views/detail.js';
import { renderHome } from './views/home.js';
import { renderPlayer } from './views/player.js';
import { renderSearch } from './views/search.js';
import { openSettingsModal } from './views/settings.js';

const navEl = document.getElementById('nav');
const navLinksEl = document.getElementById('nav-links');
const viewEl = document.getElementById('view');
const langBtn = document.getElementById('lang-toggle');
const settingsBtn = document.getElementById('settings-btn');

const NAV_ITEMS = [
  { href: '#/', match: (p) => p === '/' || p === '', key: 'navHome' },
  { href: '#/movies', match: (p) => p === '/movies', key: 'navMovies' },
  { href: '#/series', match: (p) => p === '/series', key: 'navSeries' },
  { href: '#/anime', match: (p) => p === '/anime', key: 'navAnime' },
  { href: '#/more', match: (p) => p === '/more', key: 'navMore' },
  { href: '#/list', match: (p) => p === '/list', key: 'navList' },
];

let cleanupView = null;

function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#/, '');
  const [pathPart, qsPart] = raw.split('?');
  const path = pathPart || '/';
  const query = Object.fromEntries(new URLSearchParams(qsPart || '').entries());
  return { path, query };
}

function renderNav(currentPath) {
  navLinksEl.innerHTML = '';
  for (const item of NAV_ITEMS) {
    navLinksEl.append(
      el(
        'a',
        {
          href: item.href,
          class: item.match(currentPath) ? 'active' : '',
        },
        t(item.key),
      ),
    );
  }
}

function route() {
  const { path, query } = parseRoute();
  cleanupView?.();
  cleanupView = null;

  const isWatch = path.startsWith('/watch/');
  navEl.classList.toggle('hidden', isWatch);
  renderNav(path);

  if (!isWatch) window.scrollTo(0, 0);

  const ctx = { reload: () => route() };

  if (path === '/' || path === '') {
    cleanupView = renderHome(viewEl, ctx);
  } else if (path === '/movies' || path === '/series' || path === '/anime' || path === '/more') {
    cleanupView = renderSection(viewEl, path.slice(1), ctx);
  } else if (path === '/list') {
    cleanupView = renderMyList(viewEl, ctx);
  } else if (path === '/search') {
    cleanupView = renderSearch(viewEl, query.q || '');
  } else if (path.startsWith('/category/')) {
    const id = path.slice('/category/'.length);
    cleanupView = renderCategory(viewEl, id, ctx);
  } else if (path.startsWith('/title/')) {
    const id = path.slice('/title/'.length);
    cleanupView = renderDetail(viewEl, id, ctx);
  } else if (isWatch) {
    const id = path.slice('/watch/'.length);
    cleanupView = renderPlayer(viewEl, id, query);
  } else {
    location.hash = '#/';
  }
}

// Scroll-reactive navbar glass
window.addEventListener(
  'scroll',
  () => {
    navEl.classList.toggle('solid', window.scrollY > 24);
  },
  { passive: true },
);

// Language toggle
langBtn?.addEventListener('click', () => {
  toggleLang();
});
onLangChange(() => route());

// Settings modal
settingsBtn?.addEventListener('click', () => {
  openSettingsModal(() => route());
});

// Global "/" shortcut to jump to Search
window.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (location.hash.startsWith('#/watch/')) return;
  e.preventDefault();
  location.hash = '#/search';
});

window.addEventListener('hashchange', route);
route();
