// Returns the signed-in user's own tracker data (empty for brand-new users).
import { getSession } from './_lib.mjs';
import { getTracker, emptyTracker, configured } from './_store.mjs';

export default async function handler(req, res) {
  const s = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!s) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (!configured()) {
    // DB not wired yet — return an empty tracker so the UI still works.
    res.status(200).json(emptyTracker());
    return;
  }
  try {
    res.status(200).json(await getTracker(s.login));
  } catch (e) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
