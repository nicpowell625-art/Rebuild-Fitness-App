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
