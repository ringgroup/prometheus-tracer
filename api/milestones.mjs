// Per-user injection / "pin" log. POST adds an injection (peptide + mg, date
// auto-captured); DELETE removes one. Append-only storage (one blob per pin) —
// see _store.mjs. Response built from getTracker() + in-memory mutation.
import { getSession } from './_lib.mjs';
import { getTracker, putMilestone, delMilestone, configured } from './_store.mjs';
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

  if (req.method === 'POST') {
    const b = req.body || {};
    const peptide = String(b.peptide || '').trim();
    const mg = Number(b.mg);
    const date = b.date ? String(b.date) : today(); // auto-capture today

    if (!peptide || peptide.length > 60) return res.status(400).json({ error: 'Pick a peptide' });
    if (!Number.isFinite(mg) || mg <= 0 || mg > 1000)
      return res.status(400).json({ error: 'Dose (mg) must be greater than 0' });
    if (!isDate(date)) return res.status(400).json({ error: 'Invalid date' });
    if (data.milestones.length >= 2000)
      return res.status(400).json({ error: 'Injection limit reached' });

    const label = `${peptide} ${mg} mg`;
    const rd = b.replaceDate ? String(b.replaceDate) : null; // edited-from original
    const rl = b.replaceLabel != null ? String(b.replaceLabel) : null;

    // accurate response: apply the mutation in memory
    data.milestones = data.milestones.filter((m) => {
      if (m.date === date && m.peptide === peptide && m.mg === mg) return false;
      if (rd && m.date === rd && (rl == null || m.label === rl)) return false;
      return true;
    });
    const pin = { date, peptide, mg, label };
    data.milestones.push(pin);
    recompute(data);

    // persist append-only: drop the edited original (if its key changed), write this pin
    try {
      if (rd && !(rd === date && rl === label)) await delMilestone(s.login, rd, rl || undefined);
      await putMilestone(s.login, pin);
    } catch (e) {
      return res.status(500).json({ error: 'failed to save' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const q = req.body || req.query || {};
    const date = String(q.date || '');
    const label = String(q.label || '');
    data.milestones = data.milestones.filter((m) => !(m.date === date && (!label || m.label === label)));
    recompute(data);
    try {
      await delMilestone(s.login, date, label || undefined);
    } catch (e) {
      return res.status(500).json({ error: 'failed to save' });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'method not allowed' });
}
