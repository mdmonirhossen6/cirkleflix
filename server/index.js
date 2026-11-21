import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { mountCircle } from './circle.js';
import { mountMeta } from './meta.js';
import { mountStream } from './stream.js';
import { mountVlc } from './vlc.js';

const PORT = Number(process.env.PORT) || 4000;
const DIST = path.resolve('dist');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

mountCircle(app);
mountMeta(app);
mountStream(app);
mountVlc(app);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (fs.existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: 'index.html',
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    }),
  );
} else {
  app.get('/', (_req, res) => res.send('Run <code>npm run build</code> first, or use <code>npm start</code>.'));
}

app.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  CirkleFlix is running →  ${url}\n  (keep this window open while watching; Ctrl+C to stop)\n`);
  if (!process.env.NO_OPEN && fs.existsSync(DIST)) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(cmd);
  }
});
