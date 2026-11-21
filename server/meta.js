// Ratings, plots, cast, backdrops and logos from Cinemeta
// (Stremio's free, keyless, IMDb-based metadata service).
import fs from 'node:fs';
import path from 'node:path';

const CINEMETA = 'https://v3-cinemeta.strem.io';
const DATA_DIR = path.resolve('data');
const FILE = path.join(DATA_DIR, 'meta.json');

let store = {};
try { store = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* first run */ }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFile(FILE, JSON.stringify(store), () => {});
  }, 2000);
}

/** Turn "The.Avengers 2012 1080p BluRay [Hindi- English] x264" into { name: "The Avengers", year: "2012" } */
export function cleanTitle(raw = '', fallbackYear = '') {
  let s = String(raw).replace(/\.(mkv|mp4|avi|m4v|webm|ts)$/i, '');
  if (!/\s/.test(s)) s = s.replace(/[._]+/g, ' ');
  s = s.replace(/^\s*\d{1,3}\s*[.\-]\s+/, ''); // "001. " / "39 - " rank prefixes
  let year = '';
  const ym = s.match(/[([]?\b(19\d{2}|20\d{2})\b/);
  if (ym) {
    year = ym[1];
    s = s.slice(0, ym.index);
  }
  s = s
    .replace(/\((?:TV|Web)[^)]*\)?/gi, '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, '')
    .replace(/\b(TV (Mini )?Series|Season \d+|S\d{1,2}(E\d+)?|Complete|IMAX|Anime)\b.*$/i, '')
    .replace(/\b(2160p|1080p|720p|480p|WEB-?DL|WEBRip|BluRay|HDRip|DVDRip|HDTV|x26[45]|HEVC|Dual Audio|Hindi|Dubbed)\b.*$/i, '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { name: s, year: year || String(fallbackYear || '').slice(0, 4) };
}

async function getJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'follow' });
  if (!res.ok) throw new Error('cinemeta ' + res.status);
  return res.json();
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

async function lookup(type, name, year) {
  const q = encodeURIComponent(name);
  const found = await getJSON(`${CINEMETA}/catalog/${type}/top/search=${q}.json`);
  const metas = found.metas || [];
  if (!metas.length) return null;
  const yearHit = (m) => year && String(m.releaseInfo || m.year || '').startsWith(year);
  const pick =
    metas.find((m) => yearHit(m) && norm(m.name) === norm(name)) ||
    metas.find((m) => yearHit(m)) ||
    metas.find((m) => norm(m.name) === norm(name)) ||
    (year ? null : metas[0]);
  if (!pick) return null;

  const detail = await getJSON(`${CINEMETA}/meta/${type}/${pick.imdb_id || pick.id}.json`);
  const m = detail.meta || {};
  return {
    id: m.imdb_id || m.id,
    name: m.name,
    year: m.releaseInfo || m.year,
    imdbRating: m.imdbRating,
    description: m.description,
    genres: m.genres || m.genre || [],
    runtime: m.runtime,
    cast: (m.cast || []).slice(0, 6),
    director: (m.director || []).slice(0, 2),
    background: m.background,
    logo: m.logo,
    poster: m.poster,
    trailer: (m.trailers || [])[0]?.source || null,
    videos:
      type === 'series'
        ? (m.videos || []).map((v) => ({
            s: v.season,
            e: v.episode ?? v.number,
            name: v.name || v.title,
            overview: v.overview || v.description,
            thumb: v.thumbnail,
          }))
        : undefined,
  };
}

const pending = new Map();

export async function getMeta(type, rawName, rawYear) {
  type = type === 'series' ? 'series' : 'movie';
  const { name, year } = cleanTitle(rawName, rawYear);
  if (!name) return null;
  const key = `${type}|${norm(name)}|${year}`;
  if (key in store) return store[key];
  if (pending.has(key)) return pending.get(key);

  const p = lookup(type, name, year)
    .then((meta) => {
      store[key] = meta; // null is cached too, so misses aren't retried forever
      persist();
      return meta;
    })
    .catch(() => null) // network trouble: don't cache, try again next time
    .finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

export function mountMeta(app) {
  app.get('/api/meta', async (req, res) => {
    const { type, name, year } = req.query;
    const meta = await getMeta(type, name, year);
    res.json(meta || {});
  });
}
