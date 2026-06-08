// Kick off the GitHub OAuth flow: set a CSRF `state` cookie, redirect to GitHub.
import crypto from 'node:crypto';
import { originFromRequest } from './_lib.mjs';

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Server not configured: missing GITHUB_CLIENT_ID.');
    return;
  }

  const redirectUri = `${originFromRequest(req)}/api/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
    allow_signup: 'false',
  });

  res.setHeader(
    'Set-Cookie',
    `pt_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
  res.end();
}
