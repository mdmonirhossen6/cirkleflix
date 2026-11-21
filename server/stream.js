// Video helpers built on ffmpeg/ffprobe.
//  /api/probe  – which audio/subtitle tracks a file has, codecs, duration
//  /api/stream – "compat mode": remux on the fly so the browser can play any
//                audio track (Hindi/English…) and AC3/DTS sound, by copying the
//                video and converting the chosen audio track to AAC.
import { spawn } from 'node:child_process';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';

const isCircleUrl = (u) => {
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === 'http:' && /(^|\.)circleftp\.net$/i.test(hostname);
  } catch {
    return false;
  }
};

const probeCache = new Map();

function runProbe(url) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFPROBE, [
      '-v', 'error',
      '-rw_timeout', '15000000',
      '-print_format', 'json',
      '-show_streams', '-show_format',
      url,
    ]);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => p.kill('SIGKILL'), 25_000);
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(err.trim().split('\n').pop() || 'ffprobe failed'));
      try { resolve(JSON.parse(out)); } catch (e) { reject(e); }
    });
  });
}

function summarize(info) {
  const streams = info.streams || [];
  const video = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  let a = 0;
  let t = 0;
  return {
    duration: Number(info.format?.duration) || 0,
    format: info.format?.format_name,
    video: video ? { codec: video.codec_name, width: video.width, height: video.height, profile: video.profile } : null,
    audio: streams
      .filter((s) => s.codec_type === 'audio')
      .map((s) => ({
        idx: a++, // audio-relative index, used as 0:a:<idx>
        codec: s.codec_name,
        channels: s.channels,
        lang: s.tags?.language || 'und',
        title: s.tags?.title || '',
        isDefault: !!s.disposition?.default,
      })),
    subs: streams
      .filter((s) => s.codec_type === 'subtitle')
      .map((s) => ({ idx: t++, codec: s.codec_name, lang: s.tags?.language || 'und', title: s.tags?.title || '' })),
  };
}

export function mountStream(app) {
  app.get('/api/probe', async (req, res) => {
    const url = String(req.query.url || '');
    if (!isCircleUrl(url)) return res.status(400).json({ error: 'bad url' });
    try {
      if (!probeCache.has(url)) {
        const p = runProbe(url).then(summarize);
        probeCache.set(url, p);
        p.catch(() => probeCache.delete(url));
      }
      res.json(await probeCache.get(url));
    } catch (e) {
      const notFound = /404|not found/i.test(e.message);
      res.status(notFound ? 404 : 502).json({ error: e.message, notFound });
    }
  });

  app.get('/api/stream', (req, res) => {
    const url = String(req.query.url || '');
    if (!isCircleUrl(url)) return res.status(400).end('bad url');
    const audio = Math.max(0, parseInt(req.query.a, 10) || 0);
    const start = Math.max(0, parseFloat(req.query.t) || 0);
    const transcode = req.query.v === 'x264'; // for video codecs the browser can't decode
    const hevc = req.query.hevc === '1';

    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-rw_timeout', '15000000',
      '-ss', String(start),
      '-i', url,
      '-map', '0:V:0', '-map', `0:a:${audio}?`,
      '-sn', '-dn',
      ...(transcode
        ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-vf', "scale='min(1920,iw)':-2"]
        : ['-c:v', 'copy', ...(hevc ? ['-tag:v', 'hvc1'] : [])]),
      '-c:a', 'aac', '-ac', '2', '-b:a', '192k',
      '-f', 'mp4', '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      'pipe:1',
    ];

    const ff = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' });
    ff.stdout.pipe(res);
    ff.stderr.on('data', (d) => process.stderr.write('[ffmpeg] ' + d));
    ff.on('error', () => res.end());
    ff.on('close', () => res.end());
    const stop = () => ff.kill('SIGKILL');
    req.on('close', stop);
    res.on('close', stop);
  });
}
