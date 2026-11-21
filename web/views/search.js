// Instant Search view (#/search?q=...)

import { getPosts, isFiles, isSeries } from '../api.js';
import { t } from '../i18n.js';
import { createCard, createEmptyState, createSkeletonCard, el, ICONS } from '../ui.js';

const SUGGESTIONS = ['Avengers', 'Interstellar', 'Breaking Bad', 'Stranger Things', 'Anime', 'Dune', 'Spider-Man', 'KGF'];

export function renderSearch(container, initialQuery = '') {
  let destroyed = false;
  let timer = null;
  let reqId = 0;
  let allResults = [];
  let filter = 'all'; // 'all' | 'movies' | 'series' | 'files'
  let currentQuery = initialQuery || '';

  container.innerHTML = '';

  const input = el('input', {
    class: 'search-input',
    type: 'search',
    placeholder: t('searchPlaceholder'),
    value: currentQuery,
    autocomplete: 'off',
    spellcheck: 'false',
  });

  const filterChips = el('div', { class: 'chips', style: 'margin-top:16px' });
  const resultsWrap = el('div', { style: 'padding-bottom:80px' });

  const page = el(
    'div',
    { class: 'page-top' },
    el(
      'div',
      { class: 'page-head' },
      el('h1', { class: 'page-title' }, t('searchTitle')),
      el('p', { class: 'page-sub' }, t('searchSub')),
      el('div', { class: 'search-box' }, el('span', { html: ICONS.search }), input),
      filterChips,
    ),
    resultsWrap,
  );
  container.append(page);

  function renderFilterChips() {
    filterChips.innerHTML = '';
    if (!currentQuery.trim()) return;
    const defs = [
      { id: 'all', label: t('filterAll') },
      { id: 'movies', label: t('filterMovies') },
      { id: 'series', label: t('filterSeries') },
      { id: 'files', label: t('filterFiles') },
    ];
    for (const d of defs) {
      filterChips.append(
        el(
          'button',
          {
            type: 'button',
            class: `chip${filter === d.id ? ' active' : ''}`,
            onClick: () => {
              filter = d.id;
              renderFilterChips();
              renderResults();
            },
          },
          d.label,
        ),
      );
    }
  }

  function renderResults() {
    resultsWrap.innerHTML = '';
    if (!currentQuery.trim()) {
      const sugChips = el('div', { class: 'chips', style: 'justify-content:center;margin-top:20px' });
      SUGGESTIONS.forEach((s) => {
        sugChips.append(
          el(
            'button',
            {
              type: 'button',
              class: 'chip',
              onClick: () => {
                input.value = s;
                triggerSearch(s, true);
              },
            },
            s,
          ),
        );
      });
      resultsWrap.append(createEmptyState(ICONS.search, t('searchEmptyTitle'), t('searchEmptyDesc'), sugChips));
      return;
    }

    const filtered = allResults.filter((p) => {
      if (filter === 'movies') return p.type === 'singleVideo';
      if (filter === 'series') return isSeries(p);
      if (filter === 'files') return isFiles(p);
      return true;
    });

    if (!filtered.length) {
      resultsWrap.append(createEmptyState(ICONS.search, t('searchNoResults'), t('searchNoResultsDesc')));
      return;
    }

    const grid = el('div', { class: 'grid' });
    filtered.forEach((p) => grid.append(createCard(p)));
    resultsWrap.append(grid);
  }

  async function doSearch(q) {
    const myReq = ++reqId;
    const trimmed = q.trim();
    currentQuery = trimmed;
    renderFilterChips();

    if (!trimmed) {
      allResults = [];
      renderResults();
      return;
    }

    // Show skeletons
    resultsWrap.innerHTML = '';
    const skelGrid = el('div', { class: 'grid' });
    for (let i = 0; i < 8; i++) skelGrid.append(createSkeletonCard());
    resultsWrap.append(skelGrid);

    try {
      const data = await getPosts({ page: 1, limit: 40, searchTerm: trimmed });
      if (destroyed || myReq !== reqId) return;
      allResults = data.posts || [];
      renderResults();
    } catch {
      if (destroyed || myReq !== reqId) return;
      allResults = [];
      renderResults();
    }
  }

  function triggerSearch(val, immediate = false) {
    clearTimeout(timer);
    const trimmed = val.trim();
    const newHash = trimmed ? `#/search?q=${encodeURIComponent(trimmed)}` : '#/search';
    if (location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }
    if (immediate) doSearch(trimmed);
    else timer = setTimeout(() => doSearch(trimmed), 300);
  }

  input.addEventListener('input', () => triggerSearch(input.value, false));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerSearch(input.value, true);
  });

  if (currentQuery.trim()) {
    doSearch(currentQuery);
  } else {
    renderResults();
  }
  requestAnimationFrame(() => input.focus());

  return () => {
    destroyed = true;
    clearTimeout(timer);
  };
}
