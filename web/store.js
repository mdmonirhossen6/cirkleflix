// Local persistence for Settings, Watch Progress (Continue Watching), and My List

const KEYS = {
  settings: 'cirkleflix_settings_v1',
  history: 'cirkleflix_history_v1',
  list: 'cirkleflix_list_v1',
};

const DEFAULT_SETTINGS = {
  playback: 'auto', // 'auto' | 'direct' | 'compat'
  prefAudio: 'any', // 'any' | 'hin' | 'eng' | 'ben'
  autoplayNext: true,
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

// ---- Settings ----
let settingsCache = { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) };

export function getSettings() {
  return { ...settingsCache };
}

export function updateSettings(patch) {
  settingsCache = { ...settingsCache, ...patch };
  writeJSON(KEYS.settings, settingsCache);
  return { ...settingsCache };
}

// ---- Watch History / Resume ----
let historyCache = readJSON(KEYS.history, {});

export function saveProgress({
  id,
  title,
  name,
  year,
  type,
  image,
  imageSm,
  epKey = '',
  epTitle = '',
  seasonIdx = 0,
  epIdx = 0,
  time = 0,
  duration = 0,
}) {
  if (!id) return;
  const key = String(id);
  const prev = historyCache[key] || {};
  const epProgress = { ...(prev.epProgress || {}) };
  const watchedEps = { ...(prev.watchedEps || {}) };
  const pct = duration > 0 ? time / duration : 0;

  if (epKey) {
    epProgress[epKey] = { time: Math.floor(time), duration: Math.floor(duration) };
    if (pct >= 0.9) watchedEps[epKey] = true;
  }

  historyCache[key] = {
    ...prev,
    id: Number(id),
    title: title || prev.title || '',
    name: name || prev.name || '',
    year: year || prev.year || '',
    type: type || prev.type || 'singleVideo',
    image: image || prev.image || '',
    imageSm: imageSm || prev.imageSm || '',
    epKey,
    epTitle,
    seasonIdx,
    epIdx,
    time: Math.floor(time),
    duration: Math.floor(duration),
    finished: type !== 'series' && pct >= 0.92,
    epProgress,
    watchedEps,
    updatedAt: Date.now(),
  };

  // Cap at 80 entries
  const entries = Object.values(historyCache).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (entries.length > 80) {
    historyCache = Object.fromEntries(entries.slice(0, 80).map((e) => [String(e.id), e]));
  }
  writeJSON(KEYS.history, historyCache);
}

export function getProgress(postId) {
  return historyCache[String(postId)] || null;
}

export function getEpProgress(postId, epKey) {
  const entry = historyCache[String(postId)];
  return entry?.epProgress?.[epKey] || null;
}

export function isEpWatched(postId, epKey) {
  return !!historyCache[String(postId)]?.watchedEps?.[epKey];
}

export function getContinueWatching() {
  return Object.values(historyCache)
    .filter((e) => !e.finished && (e.time > 10 || e.type === 'series'))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 20);
}

export function removeFromHistory(postId) {
  delete historyCache[String(postId)];
  writeJSON(KEYS.history, historyCache);
}

export function clearHistory() {
  historyCache = {};
  writeJSON(KEYS.history, historyCache);
}

// ---- My List ----
let listCache = readJSON(KEYS.list, {});

export function inList(postId) {
  return !!listCache[String(postId)];
}

export function toggleList(post) {
  if (!post?.id) return false;
  const key = String(post.id);
  if (listCache[key]) {
    delete listCache[key];
    writeJSON(KEYS.list, listCache);
    return false;
  }
  listCache[key] = {
    id: Number(post.id),
    title: post.title || '',
    name: post.name || '',
    year: post.year || '',
    type: post.type || 'singleVideo',
    image: post.image || '',
    imageSm: post.imageSm || '',
    quality: post.quality || '',
    addedAt: Date.now(),
  };
  writeJSON(KEYS.list, listCache);
  return true;
}

export function getMyList() {
  return Object.values(listCache).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

export function clearList() {
  listCache = {};
  writeJSON(KEYS.list, listCache);
}
