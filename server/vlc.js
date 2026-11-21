// Launch VLC on this PC with a video (or a playlist of episodes).
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const CANDIDATES = [
  process.env.VLC_PATH,
  'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
  '/Applications/VLC.app/Contents/MacOS/VLC',
  '/usr/bin/vlc',
].filter(Boolean);

const findVlc = () => CANDIDATES.find((p) => fs.existsSync(p));

export function mountVlc(app) {
  app.get('/api/vlc', (req, res) => res.json({ available: !!findVlc() }));

  app.post('/api/vlc', (req, res) => {
    const vlc = findVlc();
    if (!vlc) return res.status(404).json({ error: 'VLC not found' });
    const urls = (req.body?.urls || []).filter((u) => /^http:\/\/[^/]*circleftp\.net\//i.test(u)).slice(0, 200);
    if (!urls.length) return res.status(400).json({ error: 'no urls' });
    const start = Math.max(0, Math.floor(Number(req.body?.start) || 0));
    const args = [...(start > 10 ? [`--start-time=${start}`] : []), '--fullscreen', ...urls];
    const child = spawn(vlc, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
    res.json({ ok: true });
  });
}
