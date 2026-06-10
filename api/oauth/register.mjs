// Dynamic Client Registration (RFC 7591) — lets an AI client self-register.
import { registerClient } from '../_oauth.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  const rec = await registerClient({ redirect_uris: b.redirect_uris, client_name: b.client_name });
  res.setHeader('Cache-Control', 'no-store');
  res.status(201).json({
    client_id: rec.client_id,
    redirect_uris: rec.redirect_uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code'],
    response_types: ['code'],
    client_id_issued_at: Math.floor(Date.now() / 1000),
  });
}
