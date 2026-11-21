// Shared DOM utilities, SVG icons, cards, rows, skeletons, toasts, modals

import { cleanDisplayTitle, extractQuality, extractYear, posterUrl } from './api.js';
import { t } from './i18n.js';

export function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    node.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export const ICONS = {
  play: '<svg viewBox="0 0 24 24"><path class="fill" d="M6 4l15 8-15 8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect class="fill" x="6" y="4" width="4" height="16" rx="1"/><rect class="fill" x="14" y="4" width="4" height="16" rx="1"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
  chevLeft: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  chevRight: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  vlc: '<svg viewBox="0 0 24 24"><path d="M12 3l6 15H6L12 3z"/><path d="M4 21h16M8.5 12h7M7 16h10"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  volHigh: '<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  volMute: '<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>',
  rew10: '<svg viewBox="0 0 24 24"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>',
  fwd10: '<svg viewBox="0 0 24 24"><path d="M6 17l5-5-5-5M13 17l5-5-5-5"/></svg>',
  audio: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h2v-8H5v-1a7 7 0 0 1 14 0v1h-2v8h2a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z"/></svg>',
  sliders: '<svg viewBox="0 0 24 24"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  exitFull: '<svg viewBox="0 0 24 24"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
};

// ---- Toast ----
export function toast(message, isError = false) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const node = el('div', { class: `toast${isError ? ' err' : ''}` }, message);
  root.append(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity 0.25s';
    setTimeout(() => node.remove(), 260);
  }, 2600);
}

// ---- Modal ----
export function openModal(contentNode, onClose) {
  const root = document.getElementById('modal-root');
  if (!root) return () => {};
  const close = () => {
    back.remove();
    window.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const back = el(
    'div',
    {
      class: 'modal-back',
      onClick: (e) => {
        if (e.target === back) close();
      },
    },
    el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, contentNode),
  );
  root.innerHTML = '';
  root.append(back);
  window.addEventListener('keydown', onKey);
  return close;
}

// ---- Card ----
export function createCard(post, { wide = false, progress = null, href = null, subtitle = '' } = {}) {
  const title = cleanDisplayTitle(post);
  const year = extractYear(post);
  const quality = extractQuality(post);
  const imgSrc = posterUrl(post, !wide);

  const imgBox = el('div', { class: 'card-img' }, el('div', { class: 'card-fallback' }, title));

  if (imgSrc) {
    const img = el('img', {
      alt: title,
      decoding: 'async',
    });
    img.addEventListener('error', () => img.remove());
    img.src = imgSrc;
    imgBox.append(img);
  }

  // Badges
  const leftBadge = post.type === 'series' ? el('span', { class: 'badge badge-grad' }, 'SERIES') : quality ? el('span', { class: 'badge' }, quality) : null;
  const rightBadge = year ? el('span', { class: 'badge' }, year) : null;
  if (leftBadge || rightBadge) {
    imgBox.append(el('div', { class: 'card-badges' }, leftBadge || el('span'), rightBadge));
  }

  imgBox.append(el('div', { class: 'card-play' }, el('span', { html: ICONS.play })));

  if (progress && progress > 0) {
    const pct = Math.min(100, Math.max(3, Math.round(progress * 100)));
    imgBox.append(el('div', { class: 'card-progress' }, el('i', { style: `width:${pct}%` })));
  }

  const card = el(
    'a',
    {
      class: `card${wide ? ' wide' : ''}`,
      href: href || `#/title/${post.id}`,
      title,
    },
    imgBox,
    el('div', { class: 'card-title' }, title),
    subtitle ? el('div', { class: 'card-sub' }, subtitle) : null,
  );
  return card;
}

export function createSkeletonCard(wide = false) {
  return el(
    'div',
    { class: `card skel-card${wide ? ' wide' : ''}`, 'aria-hidden': 'true' },
    el('div', { class: 'card-img skel' }),
    el('div', { class: 'skel skel-line' }),
  );
}

// ---- Horizontal Row ----
export function createRow({ title, moreHref = '', cards = [], skeletonCount = 0, wide = false }) {
  const track = el('div', { class: 'row-track' });
  if (cards.length) {
    track.append(...cards);
  } else if (skeletonCount > 0) {
    for (let i = 0; i < skeletonCount; i++) track.append(createSkeletonCard(wide));
  }

  const btnLeft = el('button', { class: 'row-arrow left', type: 'button', 'aria-label': 'Scroll left', html: ICONS.chevLeft });
  const btnRight = el('button', { class: 'row-arrow right', type: 'button', 'aria-label': 'Scroll right', html: ICONS.chevRight });

  const updateArrows = () => {
    btnLeft.hidden = track.scrollLeft <= 8;
    btnRight.hidden = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  };
  const scrollByPage = (dir) => {
    const step = Math.max(320, track.clientWidth * 0.8);
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  btnLeft.addEventListener('click', () => scrollByPage(-1));
  btnRight.addEventListener('click', () => scrollByPage(1));
  track.addEventListener('scroll', updateArrows, { passive: true });
  requestAnimationFrame(updateArrows);

  const head = el(
    'div',
    { class: 'row-head' },
    el('h2', { class: 'row-title' }, title),
    moreHref
      ? el('a', { class: 'row-more', href: moreHref }, t('seeAll'), el('span', { html: ICONS.chevRight }))
      : null,
  );

  const row = el(
    'section',
    { class: 'row' },
    head,
    el('div', { class: 'row-body' }, btnLeft, track, btnRight),
  );

  row.setCards = (newCards) => {
    track.innerHTML = '';
    track.append(...newCards);
    requestAnimationFrame(updateArrows);
  };

  return row;
}

export function createEmptyState(iconHtml, heading, desc, actionNode = null) {
  return el(
    'div',
    { class: 'empty' },
    el('div', { class: 'empty-icon', html: iconHtml }),
    el('h3', {}, heading),
    desc ? el('p', {}, desc) : null,
    actionNode,
  );
}

export function createOfflineBanner(onRetry) {
  return el(
    'div',
    { class: 'offline' },
    el('h3', {}, t('offlineTitle')),
    el('p', {}, t('offlineDesc')),
    el('button', { class: 'btn btn-grad', type: 'button', onClick: onRetry }, t('retry')),
  );
}
