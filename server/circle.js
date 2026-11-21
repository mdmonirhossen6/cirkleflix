// Proxy + cache for the Circle FTP JSON API (new.circleftp.net:5000).
// The API already allows CORS, but going through the local server lets us
// cache responses so Home rows and repeat visits load instantly.

export const CIRCLE_API = process.env.CIRCLE_API || 'http://new.circleftp.net:5000';

const cache = new Map(); // key -> { at, ttl, data }
const inflight = new Map();

const MIN = 60_000;
function ttlFor(path) {
  if (/^\/posts\/\d+/.test(path)) return 6 * 60 * MIN; // one title's details
  if (path.startsWith('/categories')) return 6 * 60 * MIN;
  return 3 * MIN; // lists and searches change often
}

export async function circleGet(pathAndQuery) {
  const hit = cache.get(pathAndQuery);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data;
  if (inflight.has(pathAndQuery)) return inflight.get(pathAndQuery);

  const p = (async () => {
    const res = await fetch(CIRCLE_API + '/api' + pathAndQuery, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = new Error(`Circle API ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    cache.set(pathAndQuery, { at: Date.now(), ttl: ttlFor(pathAndQuery), data });
    if (cache.size > 2000) cache.delete(cache.keys().next().value); // simple cap
    return data;
  })().finally(() => inflight.delete(pathAndQuery));

  inflight.set(pathAndQuery, p);
  return p;
}

const ALLOWED = /^\/(posts(\/\d+)?|categories)(\?|$)/;

export function mountCircle(app) {
  app.use('/api/circle', async (req, res) => {
    const pathAndQuery = req.url; // e.g. /posts?page=1&limit=20
    if (!ALLOWED.test(pathAndQuery)) return res.status(404).json({ error: 'not allowed' });
    try {
      const data = await circleGet(pathAndQuery);
      res.set('Cache-Control', 'no-store').json(data);
    } catch (e) {
      res.status(e.status || 502).json({ error: e.message || 'Circle FTP is not reachable' });
    }
  });
}
