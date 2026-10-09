// Rebuild <- intervals.icu (fed by Garmin Connect). Returns recent runs/hikes so the app can log them.
// Env (Netlify -> Project configuration -> Environment variables), then trigger a deploy:
//   INTERVALS_API_KEY     personal key: intervals.icu -> Settings -> Developer settings
//   INTERVALS_ATHLETE_ID  optional; "0" (default) = the athlete who owns the key
//   REBUILD_TOKEN         optional shared secret; when set, the app must send it as ?t=
const KINDS = /run|hike|walk/i; // Run, TrailRun, VirtualRun, Hike, Walk
const j = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json', 'cache-control': 'no-store'}});
export default async (req) => {
  const url = new URL(req.url);
  const token = process.env.REBUILD_TOKEN;
  if (token && url.searchParams.get('t') !== token) return j({error: 'bad token'}, 401);
  // Accept INTERVALS_API_KEY, or any variable whose name starts with 'intervals' (easy to misname in the Netlify UI).
  const key = process.env.INTERVALS_API_KEY || (Object.entries(process.env).find(([k, v]) => /^intervals/i.test(k) && !/athlete/i.test(k) && v) || [])[1], id = process.env.INTERVALS_ATHLETE_ID || '0';
  if (!key) return j({error: 'not configured', seen: Object.keys(process.env).filter(k => /interval|icu|rebuild|garmin/i.test(k))}, 503); // names only, to catch a misnamed variable
  const since = url.searchParams.get('since') || '';
  const oldest = /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
  const newest = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  let r;
  try {
    r = await fetch(`https://intervals.icu/api/v1/athlete/${encodeURIComponent(id)}/activities?oldest=${oldest}&newest=${newest}`,
      {headers: {Authorization: 'Basic ' + Buffer.from('API_KEY:' + key).toString('base64')}});
  } catch (e) { return j({error: 'intervals.icu unreachable'}, 502); }
  if (!r.ok) return j({error: 'intervals.icu replied ' + r.status}, 502);
  const acts = await r.json();
  const runs = (Array.isArray(acts) ? acts : []).filter(a => KINDS.test(a.type || '') && (a.distance || a.moving_time)).map(a => {
    const sec = a.moving_time || a.elapsed_time || 0, km = (a.distance || 0) / 1000;
    return {id: String(a.id), date: a.start_date_local, type: a.type, name: a.name || '', km: +km.toFixed(2), min: Math.round(sec / 60),
      up: Math.round(a.total_elevation_gain || 0), hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      pace: km > 0.2 ? Math.round(sec / km) : null, load: a.icu_training_load ?? null};
  });
  return j({runs, fetched: new Date().toISOString()});
};
export const config = {path: '/api/runs'};
