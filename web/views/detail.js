// Title detail page (#/title/:id): Cinemeta enrichment, episodes, files, VLC, resume, related

import {
  checkVlc,
  cleanDisplayTitle,
  extractAudioBadge,
  extractQuality,
  extractYear,
  formatTime,
  getFilesList,
  getMeta,
  getPost,
  getPosts,
  getSeasons,
  isFiles,
  isSeries,
  isVideo,
  openInVlc,
  parseEpisodeSE,
  posterUrl,
} from '../api.js';
import { t } from '../i18n.js';
import { getEpProgress, getProgress, inList, isEpWatched, toggleList } from '../store.js';
import { createCard, createOfflineBanner, createRow, el, ICONS, toast } from '../ui.js';

export function renderDetail(container, postId, { reload }) {
  let destroyed = false;
  container.innerHTML = '';

  const root = el('div', { class: 'detail' });
  const bg = el('div', { class: 'detail-bg' });
  const main = el('div', { class: 'detail-main' });
  const extra = el('div');
  root.append(bg, main, extra);
  container.append(root);

  // Skeleton while loading post
  main.append(
    el('div', { class: 'detail-poster skel' }),
    el(
      'div',
      { class: 'detail-info' },
      el('div', { class: 'skel', style: 'height:44px;width:65%;margin-bottom:16px' }),
      el('div', { class: 'skel', style: 'height:18px;width:45%;margin-bottom:20px' }),
      el('div', { class: 'skel', style: 'height:80px;width:90%' }),
    ),
  );

  Promise.all([getPost(postId), checkVlc()])
    .then(([post, vlcAvailable]) => {
      if (destroyed) return;
      renderPost(post, null, vlcAvailable);

      // Enrich with Cinemeta for videos & series
      if (isVideo(post)) {
        getMeta(isSeries(post) ? 'series' : 'movie', post.title, extractYear(post)).then((meta) => {
          if (destroyed || !meta) return;
          renderPost(post, meta, vlcAvailable);
        });
      }

      // Related titles from primary category
      const mainCat = (post.categories || []).find((c) => c.type === 'main' && c.id !== 80) || post.categories?.[0];
      if (mainCat) {
        getPosts({ page: 1, limit: 14, category: mainCat.id, order: 'desc' })
          .then((data) => {
            if (destroyed) return;
            const related = (data.posts || []).filter((p) => p.id !== post.id).slice(0, 12);
            if (!related.length) return;
            const row = createRow({
              title: t('moreLikeThis'),
              moreHref: `#/category/${mainCat.id}`,
              cards: related.map((p) => createCard(p)),
            });
            row.style.marginTop = '24px';
            row.style.paddingBottom = '60px';
            root.append(row);
          })
          .catch(() => {});
      }
    })
    .catch(() => {
      if (destroyed) return;
      container.innerHTML = '';
      container.append(createOfflineBanner(reload));
    });

  let activeSeasonIdx = 0;

  function renderPost(post, meta, vlcAvailable) {
    const cleanTitle = meta?.name || cleanDisplayTitle(post);
    const year = extractYear(post) || (meta?.year ? String(meta.year).slice(0, 4) : '');
    const quality = extractQuality(post);
    const audio = extractAudioBadge(post);
    const pUrl = posterUrl(post, false);
    const backdrop = meta?.background || '';
    const prog = getProgress(post.id);
    const seasons = isSeries(post) ? getSeasons(post) : [];
    const files = isFiles(post) ? getFilesList(post) : [];

    if (prog && isSeries(post) && prog.seasonIdx < seasons.length) {
      activeSeasonIdx = prog.seasonIdx;
    }

    // Background
    bg.innerHTML = '';
    const bgImg = el('img', {
      src: backdrop || pUrl,
      alt: '',
      class: backdrop ? '' : 'poster-bg',
    });
    bgImg.addEventListener('load', () => bgImg.classList.add('show'));
    if (bgImg.complete) requestAnimationFrame(() => bgImg.classList.add('show'));
    bg.append(bgImg);

    // Poster
    const posterBox = el('div', { class: 'detail-poster' });
    if (pUrl) {
      posterBox.append(el('img', { src: pUrl, alt: cleanTitle }));
    } else if (meta?.poster) {
      posterBox.append(el('img', { src: meta.poster, alt: cleanTitle }));
    }

    // Categories
    const catsWrap = el('div', { class: 'detail-cats' });
    (post.categories || []).forEach((c) => {
      catsWrap.append(el('a', { href: `#/category/${c.id}` }, c.name));
    });

    // Title / Logo
    const titleNode = meta?.logo
      ? (() => {
          const img = el('img', { class: 'detail-logo', src: meta.logo, alt: cleanTitle });
          img.addEventListener('error', () => img.replaceWith(el('h1', { class: 'detail-title' }, cleanTitle)));
          return img;
        })()
      : el('h1', { class: 'detail-title' }, cleanTitle);

    const rawNode =
      post.title && post.title.toLowerCase() !== cleanTitle.toLowerCase()
        ? el('div', { class: 'detail-raw' }, post.title)
        : null;

    // Meta line
    const metaItems = [];
    if (meta?.imdbRating) metaItems.push(el('span', { class: 'badge badge-imdb' }, `IMDb ${meta.imdbRating}`));
    if (year) metaItems.push(el('span', {}, year));
    if (meta?.runtime) metaItems.push(el('span', {}, meta.runtime));
    if (quality) metaItems.push(el('span', { class: 'badge' }, quality));
    if (audio) metaItems.push(el('span', { class: 'badge' }, audio));
    if (meta?.genres?.length) metaItems.push(el('span', {}, meta.genres.slice(0, 3).join(', ')));

    const metaLine = el('div', { class: 'meta-line' });
    metaItems.forEach((item, i) => {
      if (i > 0) metaLine.append(el('span', { class: 'dot' }));
      metaLine.append(item);
    });

    // Plot
    const plotText = meta?.description || (post.metaData && post.metaData !== 'null' ? post.metaData : '');

    // Cast / Director
    let peopleNode = null;
    if (meta?.director?.length || meta?.cast?.length) {
      peopleNode = el('dl', { class: 'detail-people' });
      if (meta.director?.length) {
        peopleNode.append(el('dt', {}, t('director')), el('dd', {}, meta.director.join(', ')));
      }
      if (meta.cast?.length) {
        peopleNode.append(el('dt', {}, t('cast')), el('dd', {}, meta.cast.join(', ')));
      }
    }

    // Actions
    const actions = el('div', { class: 'detail-actions' });

    if (post.type === 'singleVideo' && typeof post.content === 'string' && post.content) {
      const canResume = prog && prog.time > 15 && !prog.finished;
      actions.append(
        el(
          'a',
          { class: 'btn btn-primary', href: `#/watch/${post.id}` },
          el('span', { html: ICONS.play }),
          canResume ? t('resume') : t('play'),
        ),
      );
      if (vlcAvailable) {
        actions.append(
          el(
            'button',
            {
              class: 'btn btn-glass',
              type: 'button',
              onClick: async () => {
                toast(t('launchingVlc'));
                try {
                  await openInVlc([post.content], canResume ? prog.time : 0);
                } catch {
                  toast(t('vlcFailed'), true);
                }
              },
            },
            el('span', { html: ICONS.vlc }),
            t('openVlc'),
          ),
        );
      }
      actions.append(
        el(
          'button',
          {
            class: 'btn btn-glass',
            type: 'button',
            onClick: () => {
              navigator.clipboard?.writeText(post.content);
              toast(t('linkCopied'));
            },
          },
          el('span', { html: ICONS.link }),
          t('copyLink'),
        ),
      );
      actions.append(
        el(
          'a',
          { class: 'btn btn-glass', href: post.content, target: '_blank', rel: 'noopener' },
          el('span', { html: ICONS.download }),
          t('download'),
        ),
      );
    } else if (isSeries(post) && seasons.length) {
      const targetS = prog && prog.seasonIdx < seasons.length ? prog.seasonIdx : 0;
      const targetE =
        prog && prog.epIdx < (seasons[targetS]?.episodes?.length || 0)
          ? prog.epIdx
          : Math.max(
              0,
              (seasons[targetS]?.episodes || []).findIndex((ep) => !!ep.link),
            );
      const hasAnyLink = seasons.some((s) => s.episodes.some((ep) => !!ep.link));

      actions.append(
        el(
          'a',
          {
            class: 'btn btn-primary',
            href: `#/watch/${post.id}?s=${targetS}&e=${targetE}`,
            disabled: !hasAnyLink,
          },
          el('span', { html: ICONS.play }),
          prog ? `${t('resume')} ${prog.epTitle ? '' : ''}`.trim() : t('play'),
        ),
      );

      if (vlcAvailable && hasAnyLink) {
        actions.append(
          el(
            'button',
            {
              class: 'btn btn-glass',
              type: 'button',
              onClick: async () => {
                const season = seasons[activeSeasonIdx] || seasons[0];
                const urls = season.episodes.map((ep) => ep.link).filter(Boolean);
                if (!urls.length) return;
                toast(t('launchingVlc'));
                try {
                  await openInVlc(urls, 0);
                } catch {
                  toast(t('vlcFailed'), true);
                }
              },
            },
            el('span', { html: ICONS.vlc }),
            t('openVlc'),
          ),
        );
      }
    }

    if (meta?.trailer) {
      actions.append(
        el(
          'a',
          {
            class: 'btn btn-glass',
            href: `https://www.youtube.com/watch?v=${encodeURIComponent(meta.trailer)}`,
            target: '_blank',
            rel: 'noopener',
          },
          el('span', { html: ICONS.play }),
          t('trailer'),
        ),
      );
    }

    // My List button
    const saved = inList(post.id);
    const listBtn = el(
      'button',
      {
        class: `btn btn-glass${saved ? ' on' : ''}`,
        type: 'button',
        onClick: () => {
          const nowIn = toggleList(post);
          listBtn.classList.toggle('on', nowIn);
          listBtn.innerHTML = '';
          listBtn.append(el('span', { html: nowIn ? ICONS.check : ICONS.plus }), nowIn ? t('inMyList') : t('myList'));
          toast(nowIn ? t('addedToList') : t('removedFromList'));
        },
      },
      el('span', { html: saved ? ICONS.check : ICONS.plus }),
      saved ? t('inMyList') : t('myList'),
    );
    actions.append(listBtn);

    // Resume note
    let resumeNote = null;
    if (prog && prog.time > 15 && !prog.finished && prog.duration > 0) {
      const pct = Math.min(100, Math.round((prog.time / prog.duration) * 100));
      resumeNote = el(
        'div',
        { class: 'resume-note' },
        el('span', {}, t('resumeAt', { time: formatTime(prog.time) })),
        el('span', { class: 'bar' }, el('i', { style: `width:${pct}%` })),
      );
    }

    const info = el(
      'div',
      { class: 'detail-info' },
      catsWrap,
      titleNode,
      rawNode,
      metaLine,
      plotText ? el('p', { class: 'detail-plot' }, plotText) : null,
      peopleNode,
      actions,
      resumeNote,
      post.view ? el('div', { class: 'source-note' }, `${t('source')}: Circle FTP · #${post.id} · ${post.view.toLocaleString()} views`) : null,
    );

    main.innerHTML = '';
    main.append(posterBox, info);

    // Extra section: Episodes or Files
    extra.innerHTML = '';
    if (isSeries(post) && seasons.length) {
      renderEpisodesSection(extra, post, seasons, meta);
    } else if (files.length) {
      renderFilesSection(extra, files);
    }
  }

  function renderEpisodesSection(target, post, seasons, meta) {
    const videosBySE = new Map();
    if (Array.isArray(meta?.videos)) {
      for (const v of meta.videos) {
        videosBySE.set(`${v.s}:${v.e}`, v);
      }
    }

    const prog = getProgress(post.id);
    const epList = el('div', { class: 'ep-list' });
    const seasonChips = el('div', { class: 'chips' });

    function drawSeason(sIdx) {
      activeSeasonIdx = sIdx;
      seasonChips.innerHTML = '';
      if (seasons.length > 1) {
        seasons.forEach((s, i) => {
          seasonChips.append(
            el(
              'button',
              {
                type: 'button',
                class: `chip${i === sIdx ? ' active' : ''}`,
                onClick: () => drawSeason(i),
              },
              s.seasonName,
            ),
          );
        });
      }

      const season = seasons[sIdx];
      epList.innerHTML = '';
      season.episodes.forEach((ep, eIdx) => {
        const { s, e } = parseEpisodeSE(ep.title, season.seasonName, sIdx, eIdx);
        const epKey = `s${sIdx}e${eIdx}`;
        const vMeta = videosBySE.get(`${s}:${e}`);
        const epProg = getEpProgress(post.id, epKey);
        const watched = isEpWatched(post.id, epKey);
        const isCurrent = prog && prog.seasonIdx === sIdx && prog.epIdx === eIdx;
        const pct = epProg && epProg.duration > 0 ? Math.min(100, Math.round((epProg.time / epProg.duration) * 100)) : 0;

        const thumb = el('div', { class: 'ep-thumb' });
        if (vMeta?.thumb) thumb.append(el('img', { src: vMeta.thumb, alt: '', loading: 'lazy' }));
        thumb.append(el('span', { class: 'play', html: ICONS.play }));
        if (pct > 0 && !watched) {
          thumb.append(el('div', { class: 'card-progress' }, el('i', { style: `width:${pct}%` })));
        }

        const rowBtn = el(
          'button',
          {
            type: 'button',
            class: `ep${isCurrent ? ' current' : ''}`,
            disabled: !ep.link,
            onClick: () => {
              if (!ep.link) return;
              location.hash = `#/watch/${post.id}?s=${sIdx}&e=${eIdx}`;
            },
          },
          el('div', { class: 'ep-num' }, String(eIdx + 1)),
          thumb,
          el(
            'div',
            {},
            el('div', { class: 'ep-name' }, vMeta?.name ? `${eIdx + 1}. ${vMeta.name}` : ep.title),
            el('div', { class: 'ep-desc' }, !ep.link ? t('unavailable') : vMeta?.overview || ep.title),
          ),
          el(
            'div',
            { class: 'ep-side' },
            watched ? el('span', { class: 'ep-watched', title: t('watched'), html: ICONS.check }) : null,
          ),
        );
        epList.append(rowBtn);
      });
    }

    drawSeason(activeSeasonIdx);

    target.append(
      el(
        'section',
        { class: 'episodes' },
        el('div', { class: 'episodes-head' }, el('h2', {}, t('episodes')), seasonChips),
        epList,
      ),
    );
  }

  function renderFilesSection(target, files) {
    const list = el('div', { class: 'files' });
    files.forEach((f) => {
      list.append(
        el(
          'a',
          { class: 'file', href: f.link, target: '_blank', rel: 'noopener' },
          el('div', { class: 'file-ico', html: ICONS.file }),
          el('div', { class: 'file-name' }, f.title),
          el('span', { class: 'file-ext' }, f.ext),
          el('span', { html: ICONS.download }),
        ),
      );
    });
    target.append(
      el('div', { class: 'page-head' }, el('h2', { class: 'row-title' }, t('filesTitle'))),
      list,
    );
  }

  return () => {
    destroyed = true;
  };
}
