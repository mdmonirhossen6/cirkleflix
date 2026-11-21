// Home view: Featured hero carousel + Continue Watching + Curated Circle FTP rows

import {
  cleanDisplayTitle,
  extractAudioBadge,
  extractQuality,
  extractYear,
  formatTime,
  getMeta,
  getPosts,
  isSeries,
  isVideo,
  posterUrl,
} from '../api.js';
import { t } from '../i18n.js';
import { getContinueWatching, inList, toggleList } from '../store.js';
import { createCard, createOfflineBanner, createRow, el, ICONS, toast } from '../ui.js';

const HOME_ROWS = [
  { key: 'latestReleases', params: { page: 1, limit: 18, order: 'desc' }, moreHref: '#/movies' },
  { key: 'englishMovies', params: { page: 1, limit: 18, category: 6, order: 'desc' }, moreHref: '#/category/6' },
  { key: 'hindiMovies', params: { page: 1, limit: 18, category: 2, order: 'desc' }, moreHref: '#/category/2' },
  { key: 'southDubbed', params: { page: 1, limit: 18, category: 3, order: 'desc' }, moreHref: '#/category/3' },
  { key: 'tvSeries', params: { page: 1, limit: 18, category: 9, order: 'desc' }, moreHref: '#/category/9' },
  { key: 'dubbedSeries', params: { page: 1, limit: 18, category: 22, order: 'desc' }, moreHref: '#/category/22' },
  { key: 'animeSeries', params: { page: 1, limit: 18, category: 21, order: 'desc' }, moreHref: '#/category/21' },
  { key: 'animationMovies', params: { page: 1, limit: 18, category: 1, order: 'desc' }, moreHref: '#/category/1' },
];

export function renderHome(container, { reload }) {
  let destroyed = false;
  let heroTimer = null;
  let activeSlide = 0;
  let slides = [];

  container.innerHTML = '';

  // Hero shell
  const heroBg = el('div', { class: 'hero-bg' });
  const heroPoster = el('div', { class: 'hero-poster' });
  const heroContent = el('div', { class: 'hero-content' });
  const heroDots = el('div', { class: 'hero-dots' });
  const hero = el('section', { class: 'hero' }, heroBg, heroPoster, heroContent, heroDots);

  const rowsWrap = el('div', { class: 'rows' });
  container.append(hero, rowsWrap);

  // Continue Watching row (local, instant)
  const history = getContinueWatching();
  if (history.length) {
    const cwCards = history.map((item) => {
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
      return createCard(item, { wide: true, progress: pct, href: watchHref, subtitle: sub });
    });
    rowsWrap.append(createRow({ title: t('continueWatching'), moreHref: '#/list', cards: cwCards, wide: true }));
  }

  // Create skeleton rows immediately for instant layout
  const rowNodes = HOME_ROWS.map((def) => {
    const r = createRow({ title: t(def.key), moreHref: def.moreHref, skeletonCount: 8 });
    rowsWrap.append(r);
    return { def, node: r };
  });

  function renderSlide(idx) {
    if (!slides.length || destroyed) return;
    activeSlide = ((idx % slides.length) + slides.length) % slides.length;
    const { post, meta } = slides[activeSlide];
    const title = meta?.name || cleanDisplayTitle(post);
    const year = extractYear(post) || (meta?.year ? String(meta.year).slice(0, 4) : '');
    const quality = extractQuality(post);
    const audio = extractAudioBadge(post);
    const pUrl = posterUrl(post, false);
    const backdrop = meta?.background || '';

    // Background image
    heroBg.innerHTML = '';
    heroPoster.innerHTML = '';
    hero.classList.toggle('no-backdrop', !backdrop);

    const bgImg = el('img', {
      src: backdrop || pUrl,
      alt: '',
      class: backdrop ? '' : 'poster-bg',
    });
    bgImg.addEventListener('load', () => bgImg.classList.add('show'));
    if (bgImg.complete) requestAnimationFrame(() => bgImg.classList.add('show'));
    heroBg.append(bgImg);

    if (!backdrop && pUrl) {
      heroPoster.append(el('img', { src: pUrl, alt: title }));
    }

    // Meta line
    const metaItems = [];
    if (meta?.imdbRating) metaItems.push(el('span', { class: 'badge badge-imdb' }, `IMDb ${meta.imdbRating}`));
    if (year) metaItems.push(el('span', {}, year));
    if (meta?.runtime) metaItems.push(el('span', {}, meta.runtime));
    if (quality) metaItems.push(el('span', { class: 'badge' }, quality));
    if (audio) metaItems.push(el('span', { class: 'badge' }, audio));
    if (isSeries(post)) metaItems.push(el('span', { class: 'badge badge-grad' }, 'SERIES'));

    const metaLine = el('div', { class: 'meta-line' });
    metaItems.forEach((item, i) => {
      if (i > 0) metaLine.append(el('span', { class: 'dot' }));
      metaLine.append(item);
    });

    const plotText = meta?.description || (post.metaData && post.metaData !== 'null' ? post.metaData : '');

    // List button
    const saved = inList(post.id);
    const listBtn = el(
      'button',
      {
        class: `btn btn-glass btn-icon${saved ? ' on' : ''}`,
        type: 'button',
        'aria-label': saved ? t('inMyList') : t('myList'),
        title: saved ? t('inMyList') : t('myList'),
        html: saved ? ICONS.check : ICONS.plus,
        onClick: () => {
          const nowIn = toggleList(post);
          listBtn.classList.toggle('on', nowIn);
          listBtn.innerHTML = nowIn ? ICONS.check : ICONS.plus;
          toast(nowIn ? t('addedToList') : t('removedFromList'));
        },
      },
    );

    const actions = el(
      'div',
      { class: 'hero-actions' },
      isVideo(post)
        ? el('a', { class: 'btn btn-primary', href: `#/watch/${post.id}` }, el('span', { html: ICONS.play }), t('play'))
        : null,
      el('a', { class: 'btn btn-glass', href: `#/title/${post.id}` }, el('span', { html: ICONS.info }), t('details')),
      listBtn,
    );

    heroContent.innerHTML = '';
    heroContent.append(el('div', { class: 'hero-kicker' }, t('featured')));

    if (meta?.logo) {
      const logoImg = el('img', { class: 'hero-logo', src: meta.logo, alt: title });
      logoImg.addEventListener('error', () => {
        logoImg.replaceWith(el('h1', { class: 'hero-title' }, title));
      });
      heroContent.append(logoImg);
    } else {
      heroContent.append(el('h1', { class: 'hero-title' }, title));
    }

    heroContent.append(metaLine);
    if (plotText) heroContent.append(el('p', { class: 'hero-plot' }, plotText));
    heroContent.append(actions);

    // Dots
    heroDots.innerHTML = '';
    slides.forEach((_, i) => {
      heroDots.append(
        el('button', {
          type: 'button',
          class: i === activeSlide ? 'active' : '',
          'aria-label': `Slide ${i + 1}`,
          onClick: () => {
            renderSlide(i);
            restartTimer();
          },
        }),
      );
    });
  }

  function restartTimer() {
    clearInterval(heroTimer);
    if (slides.length > 1) {
      heroTimer = setInterval(() => renderSlide(activeSlide + 1), 8000);
    }
  }

  hero.addEventListener('mouseenter', () => clearInterval(heroTimer));
  hero.addEventListener('mouseleave', restartTimer);

  // Fetch Featured posts for Hero
  getPosts({ page: 1, limit: 8, category: 80, order: 'desc' })
    .then(async (data) => {
      if (destroyed) return;
      const featured = (data.posts || []).filter(isVideo).slice(0, 5);
      if (!featured.length) return;
      slides = featured.map((post) => ({ post, meta: null }));
      renderSlide(0);
      restartTimer();

      // Enrich hero items with Cinemeta metadata in parallel
      await Promise.all(
        slides.map(async (s, i) => {
          const m = await getMeta(isSeries(s.post) ? 'series' : 'movie', s.post.title, extractYear(s.post));
          if (destroyed || !m) return;
          s.meta = m;
          if (i === activeSlide) renderSlide(activeSlide);
        }),
      );
    })
    .catch(() => {
      if (destroyed) return;
      container.innerHTML = '';
      container.append(createOfflineBanner(reload));
    });

  // Fetch all rows in parallel
  rowNodes.forEach(({ def, node }) => {
    getPosts(def.params)
      .then((data) => {
        if (destroyed) return;
        const posts = data.posts || [];
        if (!posts.length) {
          node.remove();
          return;
        }
        node.setCards(posts.map((p) => createCard(p)));
      })
      .catch(() => {
        if (!destroyed) node.remove();
      });
  });

  return () => {
    destroyed = true;
    clearInterval(heroTimer);
  };
}
