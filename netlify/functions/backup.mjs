// Cloud backup of the app's data in Netlify Blobs. Requires REBUILD_TOKEN (the app sends it as ?t=).
// GET returns the stored backup; PUT stores one (max 1 MB). The token is the only lock, so set a decent one.
import {getStore} from '@netlify/blobs';
const j = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json', 'cache-control': 'no-store'}});
export default async (req) => {
  const url = new URL(req.url), token = process.env.REBUILD_TOKEN;
  if (!token) return j({error: 'set REBUILD_TOKEN in Netlify to enable cloud backup'}, 503);
  if (url.searchParams.get('t') !== token) return j({error: 'bad token'}, 401);
  const store = getStore('rebuild');
  if (req.method === 'GET') {
    const b = await store.get('backup', {type: 'json'});
    return b ? j(b) : j({error: 'no backup yet'}, 404);
  }
  if (req.method === 'PUT') {
    const text = await req.text();
    if (text.length > 1_000_000) return j({error: 'too big'}, 413);
    let obj; try { obj = JSON.parse(text); } catch (e) { return j({error: 'not json'}, 400); }
    if (obj.app !== 'REBUILD') return j({error: 'not a Rebuild backup'}, 400);
    obj.savedAt = new Date().toISOString();
    await store.setJSON('backup', obj);
    return j({ok: true, savedAt: obj.savedAt, bytes: text.length});
  }
  return j({error: 'method'}, 405);
};
export const config = {path: '/api/backup'};
