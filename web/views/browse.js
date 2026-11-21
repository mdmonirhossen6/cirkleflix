// Browse views: Movies, Series, Anime, More, Category (with subcategories & infinite scroll), My List

import { formatTime, getCategories, getPosts } from '../api.js';
import { t } from '../i18n.js';
import { clearHistory, clearList, getContinueWatching, getMyList } from '../store.js';
import {
  createCard,
  createEmptyState,
  createOfflineBanner,
  createSkeletonCard,
  el,
  ICONS,
  toast,
} from '../ui.js';

const SECTION_CONFIG = {
  movies: {
    titleKey: 'moviesTitle',
    subKey: 'moviesSub',
    cats: [
      { id: 6, label: 'English Movies' },
      { id: 2, label: 'Hindi Movies' },
      { id: 7, label: 'English Dubbed' },
      { id: 3, label: 'South Dubbed' },
      { id: 4, label: 'South Indian' },
      { id: 1, label: 'Animation' },
      { id: 20, label: 'Animation Dubbed' },
      { id: 8, label: 'Foreign Movies' },
      { id: 85, label: 'Documentary' },
    ],
  },
  series: {
    titleKey: 'seriesTitle',
    subKey: 'seriesSub',
    cats: [
      { id: 9, label: 'English & Foreign Series' },
      { id: 22, label: 'Dubbed Series' },
      { id: 5, label: 'Hindi TV Serials' },
      { id: 238, label: 'Indian TV Show' },
      { id: 15, label: 'WWE' },
    ],
  },
  anime: {
    titleKey: 'animeTitle',
    subKey: 'animeSub',
    cats: [
      { id: 21, label: 'Anime Series' },
      { id: 1, label: 'Animation Movies' },
      { id: 20, label: 'Animation Dubbed' },
    ],
  },
  more: {
    titleKey: 'moreTitle',
    subKey: 'moreSub',
    cats: [
      { id: 13, label: 'PC & Console Games' },
      { id: 11, label: 'Software' },
      { id: 14, label: 'Mobile Apps & Games' },
      { id: 12, label: 'Tutorials & Courses' },
      { id: 36, label: 'Comics & Books' },
      { id: 251, label: 'Awards Shows' },
      { id: 10, label: 'Islamic' },
      { id: 250, label: 'Others' },
    ],
  },
};

export function renderSection(container, sectionKey, { reload }) {
  const cfg = SECTION_CONFIG[sectionKey] || SECTION_CONFIG.movies;
  let activeCat = cfg.cats[0].id;
  return renderPaginatedGrid(container, {
    title: t(cfg.titleKey),
    sub: t(cfg.subKey),
    chips: cfg.cats.map((c) => ({ id: c.id, label: c.label })),
    initialChip: activeCat,
    reload,
  });
}

export function renderCategory(container, catId, { reload }) {
  let destroyed = false;
  let cleanupInner = null;

  container.innerHTML = '';
  const wrap = el('div', { class: 'page-top' });
  container.append(wrap);

  getCategories()
    .then((cats) => {
      if (destroyed) return;
      const numId = Number(catId);
      let main = cats.find((c) => c.id === numId);
      let activeSub = numId;

      if (!main) {
        for (const c of cats) {
          const sub = (c.subCategory || []).find((s) => s.id === numId);
          if (sub) {
            main = c;
            activeSub = sub.id;
            break;
          }
        }
      }

      const title = main ? main.name : `Category #${catId}`;
      const subs = (main?.subCategory || []).slice().reverse(); // newest years first
      const chips = subs.length
        ? [{ id: main.id, label: t('allYears') }, ...subs.map((s) => ({ id: s.id, label: s.name.replace(main.name, '').trim() || s.name }))]
        : [];

      cleanupInner = renderPaginatedGrid(container, {
        title,
        sub: '',
        chips,
        initialChip: activeSub,
        fallbackCategory: numId,
        reload,
      });
    })
    .catch(() => {
      if (destroyed) return;
      container.innerHTML = '';
      container.append(createOfflineBanner(reload));
    });

  return () => {
    destroyed = true;
    cleanupInner?.();
  };
}

function renderPaginatedGrid(container, { title, sub, chips = [], initialChip = null, fallbackCategory = null, reload }) {
  let destroyed = false;
  let activeCat = initialChip ?? fallbackCategory;
  let page = 1;
  let totalPages = 1;
  let loading = false;
  let observer = null;

  container.innerHTML = '';
  const pageWrap = el('div', { class: 'page-top' });
  const chipsWrap = el('div', { class: 'chips' });
  const head = el(
    'div',
    { class: 'page-head' },
    el('h1', { class: 'page-title' }, title),
    sub ? el('p', { class: 'page-sub' }, sub) : null,
    chips.length ? chipsWrap : null,
  );

  const grid = el('div', { class: 'grid' });
  const sentinel = el('div', { class: 'grid-sentinel' });
  const loadMoreBox = el('div', { class: 'load-more' });

  pageWrap.append(head, grid, sentinel, loadMoreBox);
  container.append(pageWrap);

  function renderChips() {
    chipsWrap.innerHTML = '';
    for (const c of chips) {
      chipsWrap.append(
        el(
          'button',
          {
            type: 'button',
            class: `chip${c.id === activeCat ? ' active' : ''}`,
            onClick: () => {
              if (c.id === activeCat) return;
              activeCat = c.id;
              renderChips();
              resetAndLoad();
            },
          },
          c.label,
        ),
      );
    }
  }

  function renderLoadMore() {
    loadMoreBox.innerHTML = '';
    if (loading) {
      loadMoreBox.textContent = t('loading');
    } else if (page < totalPages) {
      loadMoreBox.append(
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-glass',
            onClick: () => loadPage(page + 1),
          },
          t('loadMore'),
        ),
      );
    }
  }

  async function loadPage(nextPage) {
    if (loading || destroyed) return;
    loading = true;
    if (nextPage === 1) {
      grid.innerHTML = '';
      for (let i = 0; i < 12; i++) grid.append(createSkeletonCard());
    }
    renderLoadMore();

    try {
      const data = await getPosts({ page: nextPage, limit: 24, category: activeCat, order: 'desc' });
      if (destroyed) return;
      if (nextPage === 1) grid.innerHTML = '';
      const posts = data.posts || [];
      page = data.pagination?.active || nextPage;
      totalPages = data.pagination?.pages || 1;
      if (nextPage === 1 && !posts.length) {
        grid.replaceWith(createEmptyState(ICONS.film, t('searchNoResults'), ''));
      } else {
        posts.forEach((p) => grid.append(createCard(p)));
      }
    } catch {
      if (destroyed) return;
      if (nextPage === 1) {
        container.innerHTML = '';
        container.append(createOfflineBanner(reload));
      }
    } finally {
      loading = false;
      if (!destroyed) renderLoadMore();
    }
  }

  function resetAndLoad() {
    page = 1;
    totalPages = 1;
    loadPage(1);
  }

  if (chips.length) renderChips();
  resetAndLoad();

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !loading && page < totalPages) {
        loadPage(page + 1);
      }
    },
    { rootMargin: '400px' },
  );
  observer.observe(sentinel);

  return () => {
    destroyed = true;
    observer?.disconnect();
  };
}

export function renderMyList(container, { reload }) {
  container.innerHTML = '';
  const pageWrap = el('div', { class: 'page-top' });
  const saved = getMyList();
  const history = getContinueWatching();

  const actions = el('div', { class: 'chips' });
  if (saved.length) {
    actions.append(
      el(
        'button',
        {
          type: 'button',
          class: 'chip',
          onClick: () => {
            clearList();
            toast(t('listCleared'));
            reload();
          },
        },
        t('clearList'),
      ),
    );
  }
  if (history.length) {
    actions.append(
      el(
        'button',
        {
          type: 'button',
          class: 'chip',
          onClick: () => {
            clearHistory();
            toast(t('historyCleared'));
            reload();
          },
        },
        t('clearHistory'),
      ),
    );
  }

  pageWrap.append(
    el(
      'div',
      { class: 'page-head' },
      el('h1', { class: 'page-title' }, t('myListTitle')),
      el('p', { class: 'page-sub' }, t('myListSub')),
      saved.length || history.length ? actions : null,
    ),
  );

  if (saved.length) {
    const grid = el('div', { class: 'grid', style: 'margin-bottom:48px' });
    saved.forEach((item) => grid.append(createCard(item)));
    pageWrap.append(grid);
  } else if (!history.length) {
    pageWrap.append(createEmptyState(ICONS.film, t('myListEmpty'), t('myListEmptyDesc')));
  }

  if (history.length) {
    pageWrap.append(
      el('div', { class: 'page-head', style: 'margin-top:20px' }, el('h2', { class: 'row-title' }, t('continueWatching'))),
    );
    const hGrid = el('div', { class: 'grid', style: 'padding-bottom:80px' });
    history.forEach((item) => {
      const pct = item.duration > 0 ? item.time / item.duration : 0.1;
      const sub =
        item.type === 'series' && item.epTitle
          ? item.epTitle
          : item.duration > 0
            ? t('remaining', { time: formatTime(Math.max(0, item.duration - item.time)) })
            : '';
      const watchHref =
        item.type === 'series'
          ? `#/watch/${item.id}?s=${item.seasonIdx || 0}&e=${item.epIdx || 0}`
          : `#/watch/${item.id}`;
      hGrid.append(createCard(item, { progress: pct, href: watchHref, subtitle: sub }));
    });
    pageWrap.append(hGrid);
  }

  container.append(pageWrap);
  return () => {};
}
