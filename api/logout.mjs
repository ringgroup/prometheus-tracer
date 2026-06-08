// Clear the session cookie and return to the landing page.
import { clearSessionCookie } from './_lib.mjs';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.writeHead(302, { Location: '/' });
  res.end();
}
