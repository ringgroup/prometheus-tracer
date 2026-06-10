// Session-authenticated management of the caller's personal API token
// (used to connect their AI to the remote MCP server). GET status, POST to
// (re)generate, DELETE to revoke.
import { getSession } from './_lib.mjs';
import { configured } from './_store.mjs';
import { getKeyMeta, createKey, revokeKey } from './_keys.mjs';

export default async function handler(req, res) {
  const s = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!s) return res.status(401).json({ error: 'unauthorized' });
  if (!configured()) return res.status(503).json({ error: 'Storage not configured yet.' });

  try {
    if (req.method === 'GET') {
      const m = await getKeyMeta(s.login);
      return res.status(200).json({ token: (m && m.token) || null, created: (m && m.created) || null });
    }
    if (req.method === 'POST') {
      const token = await createKey(s.login);
      return res.status(200).json({ token });
    }
    if (req.method === 'DELETE') {
      await revokeKey(s.login);
      return res.status(200).json({ ok: true });
    }
  } catch (e) {
    return res.status(500).json({ error: 'token operation failed' });
  }
  return res.status(405).json({ error: 'method not allowed' });
}
