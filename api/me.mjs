// Report the current session to the front-end (who, if anyone, is logged in).
import { getSession } from './_lib.mjs';

export default function handler(req, res) {
  const s = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!s) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.status(200).json({ authenticated: true, login: s.login, name: s.name, avatar: s.avatar });
}
