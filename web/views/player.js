// Fullscreen Netflix-style video player (#/watch/:id?s=0&e=0)
// Supports Direct playback, Compat Mode (/api/stream remux + AAC), x264 Transcode,
// Audio track switching, Speed, Episodes drawer, Next Episode countdown, VLC handoff, Resume.

import {
  checkVlc,
  cleanDisplayTitle,
  formatAudioTrack,
  formatTime,
  getPost,
  getSeasons,
  isSeries,
  openInVlc,
  probeVideo,
  streamUrl,
} from '../api.js';
import { t } from '../i18n.js';
import { getEpProgress, getProgress, getSettings, saveProgress } from '../store.js';
import { el, ICONS, toast } from '../ui.js';

const BROWSER_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);
const BROWSER_VIDEO_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1']);
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function renderPlayer(container, postId, queryParams = {}) {
  let destroyed = false;
  const settings = getSettings();
  let post = null;
  let seasons = [];
  let sIdx = Math.max(0, parseInt(queryParams.s, 10) || 0);
  let eIdx = Math.max(0, parseInt(queryParams.e, 10) || 0);
  let mediaUrl = '';
  let epTitle = '';
  let epKey = '';
  let probe = null;
  let vlcAvailable = false;

  // Playback state
  let mode = settings.playback === 'compat' ? 'compat' : 'direct'; // 'direct' | 'compat' | 'transcode'
  let audioIdx = 0;
  let baseOffset = 0; // used in compat/transcode mode where ffmpeg starts at -ss baseOffset
  let totalDuration = 0;
  let speed = 1;
  let activeMenu = null; // null | 'audio' | 'settings' | 'episodes'
  let idleTimer = null;
  let saveTimer = null;
  let nextCountdownTimer = null;
  let nextShownForEp = false;
  let nextCancelled = false;
  let seeking = false;
  let fallbackTried = false;

  container.innerHTML = '';

  const video = el('video', { playsinline: true, preload: 'auto' });
  const spinner = el('div', { class: 'p-spinner' });
  const flash = el('div', { class: 'p-flash' });
  const center = el('div', { class: 'p-center' }, spinner, flash);

  const titleEl = el('div', { class: 'p-title' }, t('loading'));
  const subEl = el('div', { class: 'p-sub' });
  const modeBadge = el('span', { class: 'badge p-mode' }, t('modeDirect'));

  const backBtn = el(
    'button',
    {
      class: 'p-btn',
      type: 'button',
      'aria-label': t('back'),
      html: ICONS.back,
      onClick: exitPlayer,
    },
  );

  const topBar = el('div', { class: 'p-top' }, backBtn, el('div', { class: 'p-titles' }, titleEl, subEl), modeBadge);

  // Seek bar
  const seekBuf = el('div', { class: 'p-seek-buf' });
  const seekFill = el('div', { class: 'p-seek-fill' });
  const seekKnob = el('div', { class: 'p-seek-knob' });
  const seekTip = el('div', { class: 'p-seek-tip' }, '0:00');
  const seekTrack = el('div', { class: 'p-seek-track' }, seekBuf, seekFill, seekKnob);
  const seekBar = el('div', { class: 'p-seek' }, seekTip, seekTrack);

  // Controls
  const playBtn = el('button', { class: 'p-btn big', type: 'button', 'aria-label': t('play'), html: ICONS.play, onClick: togglePlay });
  const rewBtn = el('button', { class: 'p-btn', type: 'button', 'aria-label': '-10s', html: ICONS.rew10, onClick: () => seekRelative(-10) });
  const fwdBtn = el('button', { class: 'p-btn', type: 'button', 'aria-label': '+10s', html: ICONS.fwd10, onClick: () => seekRelative(10) });
  const muteBtn = el('button', { class: 'p-btn', type: 'button', 'aria-label': 'Mute', html: ICONS.volHigh, onClick: toggleMute });
  const volSlider = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: '1', 'aria-label': 'Volume' });
  const volBox = el('div', { class: 'p-vol' }, muteBtn, volSlider);
  const timeEl = el('div', { class: 'p-time' }, '0:00 / 0:00');

  const epBtn = el(
    'button',
    {
      class: 'p-btn p-btn-text',
      type: 'button',
      style: 'display:none',
      onClick: () => toggleMenu('episodes'),
    },
    el('span', { html: ICONS.list }),
    t('episodes'),
  );
  const audioBtn = el(
    'button',
    {
      class: 'p-btn p-btn-text',
      type: 'button',
      onClick: () => toggleMenu('audio'),
    },
    el('span', { html: ICONS.audio }),
    t('audioTracks'),
  );
  const settingsBtn = el(
    'button',
    {
      class: 'p-btn',
      type: 'button',
      'aria-label': t('playbackSettings'),
      html: ICONS.sliders,
      onClick: () => toggleMenu('settings'),
    },
  );
  const vlcBtn = el(
    'button',
    {
      class: 'p-btn',
      type: 'button',
      style: 'display:none',
      'aria-label': t('openVlc'),
      title: t('openVlc'),
      html: ICONS.vlc,
      onClick: launchVlcNow,
    },
  );
  const fullBtn = el('button', { class: 'p-btn', type: 'button', 'aria-label': 'Fullscreen', html: ICONS.full, onClick: toggleFullscreen });

  const controls = el(
    'div',
    { class: 'p-controls' },
    playBtn,
    rewBtn,
    fwdBtn,
    volBox,
    timeEl,
    el('div', { class: 'p-spacer' }),
    epBtn,
    audioBtn,
    settingsBtn,
    vlcBtn,
    fullBtn,
  );

  const bottomBar = el('div', { class: 'p-bottom' }, seekBar, controls);
  const layer = el('div', { class: 'p-layer' }, topBar, bottomBar);
  const menuHost = el('div');
  const nextHost = el('div');
  const errorHost = el('div');
  const toastHost = el('div');

  const root = el('div', { class: 'player loading' }, video, center, layer, menuHost, nextHost, errorHost, toastHost);
  container.append(root);

  // ---- Helpers ----
  function currentTime() {
    if (mode === 'direct') return video.currentTime || 0;
    return baseOffset + (video.currentTime || 0);
  }

  function duration() {
    if (mode === 'direct' && Number.isFinite(video.duration) && video.duration > 0) return video.duration;
    if (totalDuration > 0) return totalDuration;
    if (Number.isFinite(video.duration) && video.duration > 0) return baseOffset + video.duration;
    return 0;
  }

  function pToast(msg) {
    toastHost.innerHTML = '';
    const node = el('div', { class: 'p-toast' }, msg);
    toastHost.append(node);
    setTimeout(() => {
      if (node.parentNode === toastHost) node.remove();
    }, 2200);
  }

  function flashIcon(svgHtml) {
    flash.innerHTML = svgHtml;
    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');
  }

  function bumpIdle() {
    root.classList.remove('idle');
    clearTimeout(idleTimer);
    if (!video.paused && !activeMenu) {
      idleTimer = setTimeout(() => {
        if (!video.paused && !activeMenu) root.classList.add('idle');
      }, 3000);
    }
  }

  function persistNow() {
    if (!post || !mediaUrl) return;
    const tNow = currentTime();
    const dur = duration();
    if (tNow < 3) return;
    saveProgress({
      id: post.id,
      title: post.title,
      name: post.name,
      year: post.year,
      type: post.type,
      image: post.image,
      imageSm: post.imageSm,
      epKey,
      epTitle,
      seasonIdx: sIdx,
      epIdx: eIdx,
      time: tNow,
      duration: dur,
    });
  }

  function exitPlayer() {
    persistNow();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    location.hash = `#/title/${postId}`;
  }

  function updateModeBadge() {
    modeBadge.textContent =
      mode === 'direct' ? t('modeDirect') : mode === 'transcode' ? t('modeTranscode') : t('modeCompat');
  }

  function updateTimeUI() {
    const cur = currentTime();
    const dur = duration();
    timeEl.textContent = `${formatTime(cur)} / ${dur > 0 ? formatTime(dur) : '--:--'}`;
    if (!seeking && dur > 0) {
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
      seekFill.style.width = `${pct}%`;
      seekKnob.style.left = `${pct}%`;
    }
    if (dur > 0 && video.buffered.length) {
      const bufEnd = (mode === 'direct' ? 0 : baseOffset) + video.buffered.end(video.buffered.length - 1);
      seekBuf.style.width = `${Math.min(100, (bufEnd / dur) * 100)}%`;
    }
    // Check next-episode trigger in last 20 seconds
    if (dur > 60 && dur - cur <= 20 && !nextShownForEp && !nextCancelled && settings.autoplayNext) {
      const nextEp = findNextEpisode();
      if (nextEp) showNextEpisodeCard(nextEp);
    }
  }

  function togglePlay() {
    if (video.paused) {
      video.play().catch(() => {});
      flashIcon(ICONS.play);
    } else {
      video.pause();
      flashIcon(ICONS.pause);
    }
    bumpIdle();
  }

  function toggleMute() {
    video.muted = !video.muted;
    updateVolumeUI();
  }

  function updateVolumeUI() {
    const muted = video.muted || video.volume === 0;
    muteBtn.innerHTML = muted ? ICONS.volMute : ICONS.volHigh;
    volSlider.value = muted ? '0' : String(video.volume);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      root.requestFullscreen?.().catch(() => {});
    }
  }

  function seekTo(targetSec) {
    const dur = duration();
    const clamped = Math.max(0, dur > 0 ? Math.min(dur - 1, targetSec) : targetSec);
    if (mode === 'direct') {
      video.currentTime = clamped;
    } else {
      startPlayback(mode, clamped, audioIdx);
    }
    updateTimeUI();
    bumpIdle();
  }

  function seekRelative(delta) {
    seekTo(currentTime() + delta);
    pToast(delta > 0 ? `+${delta}s` : `${delta}s`);
  }

  function startPlayback(nextMode, startSec = 0, trackIdx = audioIdx) {
    mode = nextMode;
    audioIdx = trackIdx;
    errorHost.innerHTML = '';
    root.classList.add('loading');
    updateModeBadge();

    if (mode === 'direct') {
      baseOffset = 0;
      video.src = mediaUrl;
      video.load();
      if (startSec > 3) {
        const onMeta = () => {
          video.removeEventListener('loadedmetadata', onMeta);
          if (Number.isFinite(video.duration) && startSec < video.duration - 5) {
            video.currentTime = startSec;
          }
        };
        video.addEventListener('loadedmetadata', onMeta);
      }
    } else {
      baseOffset = Math.max(0, Math.floor(startSec));
      const isHevc = /hevc|h265/i.test(probe?.video?.codec || '');
      video.src = streamUrl(mediaUrl, {
        a: audioIdx,
        t: baseOffset,
        v: mode === 'transcode' ? 'x264' : '',
        hevc: mode === 'compat' && isHevc,
      });
      video.load();
    }

    video.playbackRate = speed;
    video.play().catch(() => {});
  }

  function showError(msg) {
    root.classList.remove('loading');
    errorHost.innerHTML = '';
    const box = el(
      'div',
      { class: 'p-error-box' },
      el('h3', {}, t('playerErrTitle')),
      el('p', {}, msg || t('playerErrDesc')),
      el(
        'div',
        { class: 'btns' },
        mode !== 'compat'
          ? el(
              'button',
              {
                class: 'btn btn-grad',
                type: 'button',
                onClick: () => startPlayback('compat', currentTime(), audioIdx),
              },
              t('tryCompat'),
            )
          : null,
        mode !== 'transcode'
          ? el(
              'button',
              {
                class: 'btn btn-glass',
                type: 'button',
                onClick: () => startPlayback('transcode', currentTime(), audioIdx),
              },
              t('tryTranscode'),
            )
          : null,
        vlcAvailable
          ? el('button', { class: 'btn btn-glass', type: 'button', onClick: launchVlcNow }, el('span', { html: ICONS.vlc }), t('openVlc'))
          : null,
        el('a', { class: 'btn btn-glass', href: mediaUrl, target: '_blank', rel: 'noopener' }, t('download')),
        el('button', { class: 'btn btn-glass', type: 'button', onClick: exitPlayer }, t('back')),
      ),
    );
    errorHost.append(el('div', { class: 'p-error' }, box));
  }

  async function launchVlcNow() {
    if (!mediaUrl) return;
    video.pause();
    persistNow();
    toast(t('launchingVlc'));
    try {
      await openInVlc([mediaUrl], currentTime());
    } catch {
      toast(t('vlcFailed'), true);
    }
  }

  function findNextEpisode() {
    if (!seasons.length) return null;
    const season = seasons[sIdx];
    if (season) {
      for (let i = eIdx + 1; i < season.episodes.length; i++) {
        if (season.episodes[i]?.link) return { sIdx, eIdx: i, ep: season.episodes[i] };
      }
    }
    for (let si = sIdx + 1; si < seasons.length; si++) {
      const idx = seasons[si].episodes.findIndex((e) => !!e.link);
      if (idx >= 0) return { sIdx: si, eIdx: idx, ep: seasons[si].episodes[idx] };
    }
    return null;
  }

  function showNextEpisodeCard(next) {
    nextShownForEp = true;
    clearInterval(nextCountdownTimer);
    let secs = 10;
    const small = el('small', {}, t('nextEpisodeIn', { sec: secs }));
    const card = el(
      'div',
      { class: 'p-next' },
      small,
      el('h4', {}, next.ep.title),
      el(
        'div',
        { class: 'btns' },
        el(
          'button',
          {
            class: 'btn btn-primary',
            type: 'button',
            onClick: () => goToEpisode(next.sIdx, next.eIdx),
          },
          el('span', { html: ICONS.play }),
          t('playNext'),
        ),
        el(
          'button',
          {
            class: 'btn btn-glass',
            type: 'button',
            onClick: () => {
              nextCancelled = true;
              clearInterval(nextCountdownTimer);
              nextHost.innerHTML = '';
            },
          },
          t('cancel'),
        ),
      ),
    );
    nextHost.innerHTML = '';
    nextHost.append(card);

    nextCountdownTimer = setInterval(() => {
      if (destroyed) return clearInterval(nextCountdownTimer);
      secs -= 1;
      if (secs <= 0) {
        clearInterval(nextCountdownTimer);
        goToEpisode(next.sIdx, next.eIdx);
      } else {
        small.textContent = t('nextEpisodeIn', { sec: secs });
      }
    }, 1000);
  }

  function goToEpisode(ns, ne) {
    clearInterval(nextCountdownTimer);
    persistNow();
    location.hash = `#/watch/${postId}?s=${ns}&e=${ne}`;
  }

  // ---- Menus ----
  function closeMenu() {
    activeMenu = null;
    menuHost.innerHTML = '';
    bumpIdle();
  }

  function toggleMenu(name) {
    if (activeMenu === name) {
      closeMenu();
      return;
    }
    activeMenu = name;
    root.classList.remove('idle');
    clearTimeout(idleTimer);
    renderMenu();
  }

  function renderMenu() {
    menuHost.innerHTML = '';
    if (!activeMenu) return;
    const menu = el('div', { class: 'p-menu' });

    if (activeMenu === 'audio') {
      menu.append(el('h4', {}, t('audioTracks')));
      const tracks = probe?.audio || [];
      if (!probe) {
        menu.append(el('div', { class: 'p-note' }, t('noAudioInfo')));
      } else if (!tracks.length) {
        menu.append(el('div', { class: 'p-note' }, t('singleAudioNote')));
      } else {
        tracks.forEach((tr, i) => {
          const { label, detail } = formatAudioTrack(tr, i);
          const selected = i === audioIdx;
          menu.append(
            el(
              'button',
              {
                type: 'button',
                onClick: () => {
                  const pos = currentTime();
                  closeMenu();
                  pToast(t('switchingAudio', { label }));
                  startPlayback(mode === 'transcode' ? 'transcode' : 'compat', pos, i);
                },
              },
              el('span', { class: 'tick', html: selected ? ICONS.check : '' }),
              el('span', {}, label),
              el('small', {}, detail),
            ),
          );
        });
      }
      menu.append(el('div', { class: 'p-note' }, t('modeCompatNote')));
    } else if (activeMenu === 'settings') {
      menu.append(el('h4', {}, t('mode')));
      const modes = [
        { id: 'direct', label: t('modeAutoLabel') },
        { id: 'compat', label: t('modeCompatLabel') },
        { id: 'transcode', label: t('modeTranscodeLabel') },
      ];
      for (const m of modes) {
        menu.append(
          el(
            'button',
            {
              type: 'button',
              onClick: () => {
                const pos = currentTime();
                closeMenu();
                pToast(t('switchingMode', { mode: m.label }));
                startPlayback(m.id, pos, audioIdx);
              },
            },
            el('span', { class: 'tick', html: mode === m.id ? ICONS.check : '' }),
            el('span', {}, m.label),
          ),
        );
      }

      menu.append(el('h4', {}, t('speed')));
      for (const sp of SPEEDS) {
        menu.append(
          el(
            'button',
            {
              type: 'button',
              onClick: () => {
                speed = sp;
                video.playbackRate = sp;
                closeMenu();
                pToast(`${sp}x`);
              },
            },
            el('span', { class: 'tick', html: speed === sp ? ICONS.check : '' }),
            el('span', {}, `${sp}x`),
          ),
        );
      }
    } else if (activeMenu === 'episodes' && seasons.length) {
      const season = seasons[sIdx];
      menu.append(el('h4', {}, season.seasonName));
      season.episodes.forEach((ep, i) => {
        menu.append(
          el(
            'button',
            {
              type: 'button',
              disabled: !ep.link,
              onClick: () => {
                closeMenu();
                goToEpisode(sIdx, i);
              },
            },
            el('span', { class: 'tick', html: i === eIdx ? ICONS.play : '' }),
            el('span', {}, ep.title),
          ),
        );
      });
    }

    menuHost.append(menu);
  }

  // ---- Events ----
  video.addEventListener('click', () => {
    if (activeMenu) closeMenu();
    else togglePlay();
  });
  video.addEventListener('dblclick', toggleFullscreen);
  video.addEventListener('play', () => {
    playBtn.innerHTML = ICONS.pause;
    bumpIdle();
  });
  video.addEventListener('pause', () => {
    playBtn.innerHTML = ICONS.play;
    root.classList.remove('idle');
    persistNow();
  });
  video.addEventListener('waiting', () => root.classList.add('loading'));
  video.addEventListener('playing', () => root.classList.remove('loading'));
  video.addEventListener('canplay', () => root.classList.remove('loading'));
  video.addEventListener('timeupdate', updateTimeUI);
  video.addEventListener('loadedmetadata', updateTimeUI);
  video.addEventListener('ended', () => {
    persistNow();
    const next = findNextEpisode();
    if (next && !nextShownForEp) showNextEpisodeCard(next);
  });
  video.addEventListener('error', () => {
    if (destroyed || !mediaUrl) return;
    if (mode === 'direct' && !fallbackTried) {
      fallbackTried = true;
      pToast(t('switchingMode', { mode: t('modeCompat') }));
      startPlayback('compat', currentTime(), audioIdx);
    } else {
      showError(t('playerErrDesc'));
    }
  });

  volSlider.addEventListener('input', () => {
    video.muted = false;
    video.volume = parseFloat(volSlider.value);
    updateVolumeUI();
  });

  // Seek bar pointer interaction
  function pctFromEvent(ev) {
    const rect = seekBar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
  }
  seekBar.addEventListener('mousemove', (ev) => {
    const dur = duration();
    if (!dur) return;
    const pct = pctFromEvent(ev);
    seekTip.textContent = formatTime(pct * dur);
    seekTip.style.left = `${pct * 100}%`;
  });
  seekBar.addEventListener('pointerdown', (ev) => {
    const dur = duration();
    if (!dur) return;
    seeking = true;
    seekBar.setPointerCapture(ev.pointerId);
    const pct = pctFromEvent(ev);
    seekFill.style.width = `${pct * 100}%`;
    seekKnob.style.left = `${pct * 100}%`;
  });
  seekBar.addEventListener('pointermove', (ev) => {
    if (!seeking) return;
    const pct = pctFromEvent(ev);
    seekFill.style.width = `${pct * 100}%`;
    seekKnob.style.left = `${pct * 100}%`;
  });
  seekBar.addEventListener('pointerup', (ev) => {
    if (!seeking) return;
    seeking = false;
    const dur = duration();
    if (dur) seekTo(pctFromEvent(ev) * dur);
  });

  const onFsChange = () => {
    fullBtn.innerHTML = document.fullscreenElement ? ICONS.exitFull : ICONS.full;
  };
  document.addEventListener('fullscreenchange', onFsChange);
  root.addEventListener('mousemove', bumpIdle);

  const onKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === ' ' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
      e.preventDefault();
      seekRelative(-10);
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
      e.preventDefault();
      seekRelative(10);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      video.muted = false;
      video.volume = Math.min(1, video.volume + 0.1);
      updateVolumeUI();
      pToast(`${Math.round(video.volume * 100)}%`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      updateVolumeUI();
      pToast(`${Math.round(video.volume * 100)}%`);
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMute();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (activeMenu) closeMenu();
      else exitPlayer();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  saveTimer = setInterval(persistNow, 5000);

  // ---- Bootstrap ----
  Promise.all([getPost(postId), checkVlc()])
    .then(async ([p, hasVlc]) => {
      if (destroyed) return;
      post = p;
      vlcAvailable = hasVlc;
      if (vlcAvailable) vlcBtn.style.display = '';

      const cleanTitle = cleanDisplayTitle(post);
      let resumeSec = 0;

      if (isSeries(post)) {
        seasons = getSeasons(post);
        const season = seasons[sIdx] || seasons[0];
        if (!season) return showError(t('unavailable'));
        if (!seasons[sIdx]) sIdx = 0;
        const ep = season.episodes[eIdx] || season.episodes.find((x) => !!x.link);
        if (!ep?.link) return showError(t('unavailable'));
        mediaUrl = ep.link;
        epTitle = ep.title;
        epKey = `s${sIdx}e${eIdx}`;
        titleEl.textContent = cleanTitle;
        subEl.textContent = `${season.seasonName} · ${ep.title}`;
        epBtn.style.display = '';
        const epProg = getEpProgress(post.id, epKey);
        if (epProg && epProg.time > 10 && (!epProg.duration || epProg.time < epProg.duration - 25)) {
          resumeSec = epProg.time;
        }
      } else if (typeof post.content === 'string' && post.content.trim()) {
        mediaUrl = post.content.trim();
        titleEl.textContent = cleanTitle;
        subEl.textContent = post.quality || '';
        const prog = getProgress(post.id);
        if (prog && !prog.finished && prog.time > 10) {
          resumeSec = prog.time;
        }
      } else {
        return showError(t('unavailable'));
      }

      // Probe first to pick optimal mode + preferred audio track
      let probeFailed404 = false;
      try {
        probe = await probeVideo(mediaUrl);
      } catch (e) {
        if (e.status === 404) probeFailed404 = true;
      }
      if (destroyed) return;

      if (probeFailed404) {
        return showError(t('fileNotFound'));
      }

      if (probe) {
        totalDuration = probe.duration || 0;
        const tracks = probe.audio || [];
        // Pick preferred audio track
        if (settings.prefAudio !== 'any' && tracks.length > 1) {
          const hit = tracks.findIndex((tr) =>
            String(tr.lang || '').toLowerCase().startsWith(settings.prefAudio.slice(0, 2)),
          );
          if (hit >= 0) audioIdx = hit;
        } else {
          const defIdx = tracks.findIndex((tr) => tr.isDefault);
          if (defIdx >= 0) audioIdx = defIdx;
        }

        if (settings.playback === 'compat') {
          mode = 'compat';
        } else if (settings.playback === 'direct') {
          mode = 'direct';
        } else {
          // Auto decision
          const chosenAudio = tracks[audioIdx];
          const isMkvOrAvi = /\.(mkv|avi|ts|flv)$/i.test(mediaUrl);
          const badAudio = chosenAudio && !BROWSER_AUDIO_CODECS.has(String(chosenAudio.codec || '').toLowerCase());
          const nonDefaultAudio = audioIdx > 0;
          const vCodec = String(probe.video?.codec || '').toLowerCase();
          const needsTranscode = vCodec && !BROWSER_VIDEO_CODECS.has(vCodec) && vCodec !== 'hevc';

          if (needsTranscode) mode = 'transcode';
          else if (isMkvOrAvi || badAudio || nonDefaultAudio) mode = 'compat';
          else mode = 'direct';
        }
      } else if (settings.playback === 'auto' && /\.(mkv|avi)$/i.test(mediaUrl)) {
        mode = 'compat';
      }

      startPlayback(mode, resumeSec, audioIdx);
    })
    .catch(() => {
      if (!destroyed) showError(t('playerErrDesc'));
    });

  return () => {
    destroyed = true;
    persistNow();
    clearTimeout(idleTimer);
    clearInterval(saveTimer);
    clearInterval(nextCountdownTimer);
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('fullscreenchange', onFsChange);
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}
