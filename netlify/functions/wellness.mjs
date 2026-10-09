// Rebuild <- intervals.icu wellness (fed by Garmin Connect): resting HR, HRV, sleep, steps per day.
// Same env as runs.mjs: INTERVALS_API_KEY (or any intervals* name), optional INTERVALS_ATHLETE_ID, optional REBUILD_TOKEN as ?t=.
const j = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json', 'cache-control': 'no-store'}});
export default async (req) => {
  const url = new URL(req.url);
  const token = process.env.REBUILD_TOKEN;
  if (token && url.searchParams.get('t') !== token) return j({error: 'bad token'}, 401);
  const key = process.env.INTERVALS_API_KEY || (Object.entries(process.env).find(([k, v]) => /^intervals/i.test(k) && !/athlete/i.test(k) && v) || [])[1], id = process.env.INTERVALS_ATHLETE_ID || '0';
  if (!key) return j({error: 'not configured'}, 503);
  const since = url.searchParams.get('since') || '';
  const oldest = /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);
  const newest = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  let r;
  try {
    r = await fetch(`https://intervals.icu/api/v1/athlete/${encodeURIComponent(id)}/wellness?oldest=${oldest}&newest=${newest}`,
      {headers: {Authorization: 'Basic ' + Buffer.from('API_KEY:' + key).toString('base64')}});
  } catch (e) { return j({error: 'intervals.icu unreachable'}, 502); }
  if (!r.ok) return j({error: 'intervals.icu replied ' + r.status}, 502);
  const rows = await r.json();
  const days = (Array.isArray(rows) ? rows : []).filter(w => w && w.id).map(w => ({
    date: String(w.id).slice(0, 10), rhr: w.restingHR ?? null, hrv: w.hrv != null ? Math.round(w.hrv) : null,
    sleep: w.sleepSecs ? +(w.sleepSecs / 3600).toFixed(1) : null, score: w.sleepScore != null ? Math.round(w.sleepScore) : null,
    steps: w.steps ?? null, weight: w.weight ?? null,
  })).filter(d => d.rhr != null || d.hrv != null || d.sleep != null || d.steps != null);
  return j({days, fetched: new Date().toISOString()});
};
export const config = {path: '/api/wellness'};
