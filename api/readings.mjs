// Per-user reading entry. POST adds/replaces a reading; DELETE removes one.
// Date is auto-captured (defaults to "today" server-side if the client omits it).
import { getSession } from './_lib.mjs';
import { getTracker, saveTracker, configured } from './_store.mjs';
import { recompute } from './_recompute.mjs';

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const today = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  const s = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!s) return res.status(401).json({ error: 'unauthorized' });
  if (!configured()) return res.status(503).json({ error: 'Storage not configured yet.' });

  let data;
  try {
    data = await getTracker(s.login);
  } catch (e) {
    return res.status(500).json({ error: 'failed to load data' });
  }
  data.rows = data.rows || [];
  data.milestones = data.milestones || [];
  data.goalLossKg = data.goalLossKg || 40;

  if (req.method === 'POST') {
    const b = req.body || {};
    const date = b.date ? String(b.date) : today(); // auto-capture today
    const weight = Number(b.weight);
    const muscle = Number(b.muscle);
    const fat = Number(b.fat);

    if (!isDate(date)) return res.status(400).json({ error: 'Invalid date' });
    const ok = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
    if (!ok(weight, 20, 500)) return res.status(400).json({ error: 'Weight must be 20–500 kg' });
    if (!ok(muscle, 0, 200)) return res.status(400).json({ error: 'Muscle must be 0–200 kg' });
    if (!ok(fat, 0, 100)) return res.status(400).json({ error: 'Body fat must be 0–100 %' });
    if (data.rows.length >= 2000) return res.status(400).json({ error: 'Reading limit reached' });

    // same-date entry replaces the existing one; `replace` removes the original
    // row when an edit changed its date (single request, no stale re-read).
    const replace = b.replace ? String(b.replace) : null;
    data.rows = data.rows.filter((r) => r.date !== date && (!replace || r.date !== replace));
    data.rows.push({
      date,
      weight: +weight.toFixed(1),
      muscle: +muscle.toFixed(1),
      fat: +fat.toFixed(1),
    });
    recompute(data);

    try {
      await saveTracker(s.login, data);
    } catch (e) {
      return res.status(500).json({ error: 'failed to save' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const date = String((req.body && req.body.date) || (req.query && req.query.date) || '');
    data.rows = data.rows.filter((r) => r.date !== date);
    recompute(data);
    try {
      await saveTracker(s.login, data);
    } catch (e) {
      return res.status(500).json({ error: 'failed to save' });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'method not allowed' });
}
