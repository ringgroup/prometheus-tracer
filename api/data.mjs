// Returns the signed-in user's own tracker data (empty for brand-new users).
import { getSession } from './_lib.mjs';
import { getTracker, seedTracker, configured } from './_store.mjs';

export default async function handler(req, res) {
  const s = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!s) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (!configured()) {
    // KV not attached yet — still serve the seeded view (owner sees history,
    // others empty) so the dashboard renders. Saving needs KV.
    res.status(200).json(seedTracker(s.login));
    return;
  }
  try {
    res.status(200).json(await getTracker(s.login));
  } catch (e) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
