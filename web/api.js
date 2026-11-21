// Client API wrappers + Circle FTP parsing helpers

export const CIRCLE_UPLOADS = 'http://new.circleftp.net:5000/uploads/';

const metaMemCache = new Map();
let categoriesPromise = null;
let vlcAvailPromise = null;

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      // ignore
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function getCategories() {
  if (!categoriesPromise) {
    categoriesPromise = fetchJSON('/api/circle/categories').catch((e) => {
      categoriesPromise = null;
      throw e;
    });
  }
  return categoriesPromise;
}

export function getPosts(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return fetchJSON(`/api/circle/posts?${qs.toString()}`);
}

export function getPost(id) {
  return fetchJSON(`/api/circle/posts/${encodeURIComponent(id)}`);
}

export function getMeta(type, name, year = '') {
  const t = type === 'series' ? 'series' : 'movie';
  const key = `${t}|${name}|${year}`;
  if (metaMemCache.has(key)) return metaMemCache.get(key);
  const qs = new URLSearchParams({ type: t, name: name || '', year: year || '' });
  const p = fetchJSON(`/api/meta?${qs.toString()}`)
    .then((d) => (d && d.id ? d : null))
    .catch(() => null);
  metaMemCache.set(key, p);
  return p;
}

export function probeVideo(url) {
  return fetchJSON(`/api/probe?url=${encodeURIComponent(url)}`);
}

export function streamUrl(url, { a = 0, t = 0, v = '', hevc = false } = {}) {
  const qs = new URLSearchParams({ url, a: String(a), t: String(Math.max(0, Math.floor(t))) });
  if (v) qs.set('v', v);
  if (hevc) qs.set('hevc', '1');
  return `/api/stream?${qs.toString()}`;
}

export function checkVlc() {
  if (!vlcAvailPromise) {
    vlcAvailPromise = fetchJSON('/api/vlc')
      .then((d) => !!d.available)
      .catch(() => false);
  }
  return vlcAvailPromise;
}

export function openInVlc(urls, start = 0) {
  return fetchJSON('/api/vlc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, start: Math.floor(start || 0) }),
  });
}

// ---- Circle FTP helpers ----

export function posterUrl(post, small = true) {
  const file = small ? post?.imageSm || post?.image : post?.image || post?.imageSm;
  if (!file) return '';
  if (/^https?:\/\//i.test(file)) return file;
  return CIRCLE_UPLOADS + encodeURIComponent(file);
}

export function isSeries(post) {
  return post?.type === 'series';
}

export function isVideo(post) {
  return post?.type === 'singleVideo' || post?.type === 'series';
}

export function isFiles(post) {
  return post?.type === 'singleFile' || post?.type === 'multiFile';
}

export function cleanDisplayTitle(post) {
  const raw = post?.title || post?.name || '';
  if (!raw) return 'Untitled';
  let s = String(raw).replace(/\.(mkv|mp4|avi|m4v|webm|ts|rar|zip)$/i, '');
  if (!/\s/.test(s)) s = s.replace(/[._]+/g, ' ');
  s = s.replace(/^\s*\d{1,3}\s*[.\-]\s+/, '');
  // Trim trailing release/codec junk while keeping the main title readable
  s = s
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\((?:TV(?:\s+Mini)?\s+Series[^)]*|Web[^)]*|\d{4}[-–]?\d*)\)/gi, '')
    .replace(/\b(2160p|1080p|720p|480p|WEB-?DL|WEBRip|BluRay|HDRip|DVDRip|HDTV|IMAX|x26[45]|H\.?26[45]|HEVC|AAC|DDP5\.1|Atmos|ESubs|Dual Audio|Multi Audio|Hindi Dubbed|Full Hindi Dubbed|Anime)\b.*$/i, '')
    .replace(/\b(19\d{2}|20\d{2})\b\s*$/g, '')
    .replace(/[-_:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s || post?.name || raw;
}

export function extractYear(post) {
  if (post?.year && /^\d{4}/.test(String(post.year))) return String(post.year).slice(0, 4);
  const m = String(post?.title || '').match(/\b(19\d{2}|20\d{2})\b/);
  return m ? m[1] : '';
}

export function extractQuality(post) {
  const src = `${post?.quality || ''} ${post?.title || ''}`;
  if (/2160p|4k|uhd/i.test(src)) return '4K';
  if (/1080p/i.test(src)) return '1080p';
  if (/720p/i.test(src)) return '720p';
  if (/480p/i.test(src)) return '480p';
  if (/bluray|bdrip/i.test(src)) return 'BluRay';
  if (/web-?dl|webrip/i.test(src)) return 'WEB-DL';
  return '';
}

export function extractAudioBadge(post) {
  const src = String(post?.title || '');
  if (/multi\s*audio/i.test(src)) return 'Multi Audio';
  if (/dual\s*audio|hin\s*[+\-&]\s*eng|eng\s*[+\-&]\s*hin|hindi\s*[+\-&]\s*english/i.test(src)) return 'Dual Audio';
  if (/hindi\s*dub/i.test(src)) return 'Hindi Dub';
  return '';
}

/** Parse season & episode number from episode title or season name */
export function parseEpisodeSE(epTitle = '', seasonName = '', sIdx = 0, eIdx = 0) {
  const se = String(epTitle).match(/S(\d{1,2})\s*E(\d{1,3})/i);
  if (se) return { s: parseInt(se[1], 10), e: parseInt(se[2], 10) };

  const sm = String(seasonName).match(/(\d{1,2})/);
  const s = sm ? parseInt(sm[1], 10) : sIdx + 1;
  const em = String(epTitle).match(/(?:Ep(?:isode)?|E)\s*0*(\d{1,3})/i);
  const e = em ? parseInt(em[1], 10) : eIdx + 1;
  return { s, e };
}

/** Normalize post.content for series into [{ seasonName, episodes: [{ title, link }] }] */
export function getSeasons(post) {
  if (!post || !Array.isArray(post.content)) return [];
  return post.content
    .filter((s) => s && Array.isArray(s.episodes))
    .map((s, idx) => ({
      seasonName: s.seasonName || `Season ${idx + 1}`,
      episodes: s.episodes.map((ep, eIdx) => ({
        title: ep?.title || `Episode ${eIdx + 1}`,
        link: typeof ep?.link === 'string' ? ep.link.trim() : '',
      })),
    }));
}

/** Normalize post.content for singleFile / multiFile into [{ title, link, ext }] */
export function getFilesList(post) {
  if (!post) return [];
  const list = [];
  if (typeof post.content === 'string' && post.content.trim()) {
    const link = post.content.trim();
    const title = decodeURIComponent(link.split('/').pop() || post.title || 'File');
    list.push({ title, link });
  } else if (Array.isArray(post.content)) {
    for (const item of post.content) {
      if (item?.link) {
        list.push({
          title: item.title || decodeURIComponent(item.link.split('/').pop() || 'File'),
          link: item.link.trim(),
        });
      }
    }
  }
  return list.map((f) => {
    const m = f.link.match(/\.([a-z0-9]{2,5})(?:$|\?)/i);
    return { ...f, ext: m ? m[1].toUpperCase() : 'FILE' };
  });
}

export function formatTime(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const LANG_NAMES = {
  eng: 'English',
  en: 'English',
  hin: 'Hindi',
  hi: 'Hindi',
  ben: 'Bengali',
  bn: 'Bengali',
  jpn: 'Japanese',
  ja: 'Japanese',
  kor: 'Korean',
  ko: 'Korean',
  tam: 'Tamil',
  tel: 'Telugu',
  mal: 'Malayalam',
  kan: 'Kannada',
  spa: 'Spanish',
  fre: 'French',
  fra: 'French',
  ger: 'German',
  deu: 'German',
  ita: 'Italian',
  rus: 'Russian',
  chi: 'Chinese',
  zho: 'Chinese',
  ara: 'Arabic',
  tur: 'Turkish',
  und: 'Audio',
};

export function formatAudioTrack(track, idx) {
  const code = String(track.lang || 'und').toLowerCase();
  const base = LANG_NAMES[code] || code.toUpperCase();
  const title = track.title && track.title.toLowerCase() !== base.toLowerCase() ? track.title : '';
  const ch = track.channels === 6 ? '5.1' : track.channels === 8 ? '7.1' : track.channels === 2 ? '2.0' : track.channels ? `${track.channels}ch` : '';
  const codec = track.codec ? track.codec.toUpperCase() : '';
  const label = title ? `${base} – ${title}` : `${base}${code === 'und' ? ` #${idx + 1}` : ''}`;
  const detail = [codec, ch].filter(Boolean).join(' ');
  return { label, detail };
}
