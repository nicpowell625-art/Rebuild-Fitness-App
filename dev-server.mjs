// Tiny zero-dependency static server for local testing.
//   node dev-server.mjs   →  http://localhost:4173
// Serves public/ with caching off, so edits show on refresh. Not used in production.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = process.env.PORT || 4173;
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png'};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/api/backup') { // local stand-in for netlify/functions/backup.mjs (in memory)
    if (req.method === 'PUT') { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { global.__backup = JSON.parse(b); global.__backup.savedAt = new Date().toISOString(); res.writeHead(200, {'content-type': 'application/json'}); res.end(JSON.stringify({ok: true, savedAt: global.__backup.savedAt})); } catch { res.writeHead(400).end(); } }); return; }
    res.writeHead(global.__backup ? 200 : 404, {'content-type': 'application/json'}); return res.end(JSON.stringify(global.__backup || {error: 'no backup yet'}));
  }
  if (path === '/api/wellness') { // local stand-in for netlify/functions/wellness.mjs
    const days = []; for (let n = 12; n >= 0; n--) { const x = new Date(); x.setDate(x.getDate() - n); const k = new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); days.push({date: k, rhr: 50 + (n % 4), hrv: 44 + (n % 5), sleep: +(6.5 + (n % 3) * 0.4).toFixed(1), score: 70 + n, steps: 6000 + n * 300}); }
    res.writeHead(200, {'content-type': 'application/json', 'cache-control': 'no-store'}); return res.end(JSON.stringify({days}));
  }
  if (path === '/api/runs') { // local stand-in for netlify/functions/runs.mjs
    const d = n => { const x = new Date(); x.setDate(x.getDate() - n); x.setHours(6, 12, 0, 0); return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); };
    const runs = [{id: 'demo1', date: d(2), type: 'Run', name: 'Morning Run', km: 5.2, min: 32, up: 84, hr: 142, pace: 369, load: 38},
                  {id: 'demo2', date: d(5), type: 'TrailRun', name: 'Trail', km: 11.4, min: 78, up: 410, hr: 151, pace: 410, load: 95}];
    res.writeHead(200, {'content-type': 'application/json', 'cache-control': 'no-store'}); return res.end(JSON.stringify({runs}));
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, {'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`Rebuild → http://localhost:${PORT}`));
