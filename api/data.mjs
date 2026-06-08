// Body-composition data — served ONLY to an authenticated session, so the
// personal health numbers are never shipped to anonymous visitors.
import { getSession } from './_lib.mjs';

const DATA = {
  start: '2026-04-14',
  rows: [
    { date: '2026-04-21', day: 7, weight: 154.7, muscle: 49.6, fat: 44.4 },
    { date: '2026-05-02', day: 18, weight: 151.6, muscle: 50.7, fat: 41.9 },
    { date: '2026-05-17', day: 33, weight: 150.3, muscle: 50.2, fat: 42.0 },
    { date: '2026-05-26', day: 42, weight: 146.5, muscle: 50.9, fat: 39.7 },
    { date: '2026-06-08', day: 55, weight: 142.6, muscle: 49.5, fat: 39.6 },
  ],
  milestones: [
    { date: '2026-04-14', day: 0, label: 'First injection — 1 mg' },
    { date: '2026-04-17', day: 3, label: 'Dose up to 3 mg' },
    { date: '2026-05-26', day: 42, label: 'Switch to 4 mg q4-5d' },
  ],
  goalLossKg: 40,
};

export default function handler(req, res) {
  const s = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!s) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.status(200).json(DATA);
}
