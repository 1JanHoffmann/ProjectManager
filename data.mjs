import { getStore } from '@netlify/blobs';

// Shared project-data endpoint backed by Netlify Blobs.
//  GET  /api/data   -> returns the current project JSON
//  POST /api/data   -> overwrites it, and writes a timestamped backup
// Protected by a single shared password (Netlify env var APP_PASSWORD).
// If APP_PASSWORD is unset, the endpoint is open (not recommended).

const KEY = 'project-data';
const MAX_BACKUPS = 100;

function authed(req) {
  const required = process.env.APP_PASSWORD || '';
  if (!required) return true;                 // no password configured -> open
  const given = req.headers.get('x-app-password') || '';
  return given === required;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export default async (req) => {
  if (!authed(req)) return json({ error: 'unauthorized' }, 401);

  const store = getStore('project-tracker');

  if (req.method === 'GET') {
    const data = await store.get(KEY, { type: 'json' });
    return json(data || { version: 2, projects: [], roles: {} });
  }

  if (req.method === 'POST') {
    let payload;
    try { payload = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    if (!payload || !Array.isArray(payload.projects)) return json({ error: 'invalid payload' }, 400);

    // save current
    await store.setJSON(KEY, payload);

    // automatic timestamped backup
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backups = getStore('project-tracker-backups');
    await backups.setJSON('backup-' + stamp, payload);

    // prune old backups (keep newest MAX_BACKUPS)
    try {
      const { blobs } = await backups.list();
      if (blobs.length > MAX_BACKUPS) {
        const sorted = blobs.map((b) => b.key).sort();           // ISO keys sort chronologically
        const toDelete = sorted.slice(0, sorted.length - MAX_BACKUPS);
        await Promise.all(toDelete.map((k) => backups.delete(k)));
      }
    } catch (e) { /* pruning is best-effort */ }

    return json({ ok: true, lastEditedAt: payload.lastEditedAt || '' });
  }

  return json({ error: 'method not allowed' }, 405);
};
