// Token endpoint. Exchanges a single-use auth code (+ PKCE verifier) for an
// access token, which is a revocable API token bound to the user's github login.
import { consumeCode, verifyPkce } from '../_oauth.mjs';
import { issueToken } from '../_keys.mjs';

function parseBody(req) {
  let b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return Object.fromEntries(new URLSearchParams(b)); }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'invalid_request' });

  const b = parseBody(req);
  if (b.grant_type !== 'authorization_code')
    return res.status(400).json({ error: 'unsupported_grant_type' });

  const rec = await consumeCode(b.code);
  if (!rec) return res.status(400).json({ error: 'invalid_grant' });
  if (rec.redirect_uri && b.redirect_uri && rec.redirect_uri !== b.redirect_uri)
    return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
  if (rec.client_id && b.client_id && rec.client_id !== b.client_id)
    return res.status(400).json({ error: 'invalid_client' });
  if (!verifyPkce(b.code_verifier, rec.code_challenge, rec.code_challenge_method))
    return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });

  const access_token = await issueToken(rec.login);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ access_token, token_type: 'Bearer', scope: 'read', expires_in: 31536000 });
}
