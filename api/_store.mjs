// Per-user storage on Vercel Blob — APPEND-ONLY, one blob per entry, so adding
// or editing one reading/injection never rewrites the others. This avoids the
// read-modify-write data loss you get when a whole-tracker blob is rewritten on
// top of an eventually-consistent/edge-cached read.
//
// Layout (private blobs):
//   t/<login>/r/<date>.json                 -> a reading  {kind:'reading', date, weight, muscle, fat}
//   t/<login>/m/<date>__<slug(label)>.json  -> an injection {kind:'injection', date, peptide, mg, label}
import { put, del, head, list } from '@vercel/blob';
import { recompute } from './_recompute.mjs';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export const configured = () => Boolean(TOKEN);
export const emptyTracker = () => ({ start: null, rows: [], milestones: [], goalLossKg: 40 });
export const seedTracker = () => emptyTracker();

const base = (login) => `t/${String(login).toLowerCase()}`;
const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'x';
const readingPath = (login, date) => `${base(login)}/r/${date}.json`;
const milestonePath = (login, date, label) => `${base(login)}/m/${date}__${slug(label)}.json`;

const putOpts = {
  access: 'private',
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 0,
  token: TOKEN,
};

async function readJson(url) {
  try {
    const bust = url + (url.includes('?') ? '&' : '?') + 'z=' + Date.now();
    const r = await fetch(bust, { headers: { authorization: `Bearer ${TOKEN}` }, cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Assemble the full tracker by listing the user's entry blobs.
export async function getTracker(login) {
  const t = emptyTracker();
  if (!TOKEN) return t;
  let blobs = [];
  try {
    const res = await list({ prefix: base(login) + '/', token: TOKEN, limit: 1000 });
    blobs = res.blobs || [];
  } catch {
    return t;
  }
  const items = await Promise.all(blobs.map((b) => readJson(b.url)));
  for (const it of items) {
    if (!it || !it.date) continue;
    if (it.kind === 'injection')
      t.milestones.push({ date: it.date, peptide: it.peptide, mg: it.mg, label: it.label });
    else t.rows.push({ date: it.date, weight: it.weight, muscle: it.muscle, fat: it.fat });
  }
  recompute(t);
  return t;
}

export async function putReading(login, r) {
  await put(readingPath(login, r.date), JSON.stringify({ kind: 'reading', ...r }), putOpts);
}
export async function delReading(login, date) {
  try {
    const m = await head(readingPath(login, date), { token: TOKEN });
    await del(m.url, { token: TOKEN });
  } catch {
    /* already gone */
  }
}

export async function putMilestone(login, m) {
  await put(milestonePath(login, m.date, m.label), JSON.stringify({ kind: 'injection', ...m }), putOpts);
}
export async function delMilestone(login, date, label) {
  if (label) {
    try {
      const m = await head(milestonePath(login, date, label), { token: TOKEN });
      await del(m.url, { token: TOKEN });
      return;
    } catch {
      /* fall through to scan */
    }
  }
  // no/!matched label -> scan this user's injection blobs and delete same-date ones
  try {
    const res = await list({ prefix: `${base(login)}/m/`, token: TOKEN, limit: 1000 });
    const matches = await Promise.all(
      (res.blobs || []).map(async (b) => {
        const j = await readJson(b.url);
        return j && j.date === date && (!label || j.label === label) ? b.url : null;
      }),
    );
    const urls = matches.filter(Boolean);
    if (urls.length) await del(urls, { token: TOKEN });
  } catch {
    /* ignore */
  }
}
