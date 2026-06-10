// Authorization endpoint. Requires a Prometheus Tracer session; if absent, the
// user is bounced through GitHub login and returned here. Once authenticated we
// auto-approve (it's the user's own data), mint a single-use code, and redirect
// back to the client with ?code&state.
import { getSession } from '../_lib.mjs';
import { getClient, createCode, originFromRequest } from '../_oauth.mjs';

export default async function handler(req, res) {
  const q = req.query || {};
  const response_type = q.response_type;
  const client_id = q.client_id;
  const redirect_uri = q.redirect_uri;
  const code_challenge = q.code_challenge;
  const code_challenge_method = q.code_challenge_method;
  const state = q.state;

  if (response_type !== 'code') return res.status(400).send('unsupported_response_type');
  const client = client_id ? await getClient(client_id) : null;
  if (!client) return res.status(400).send('invalid client_id');
  if (redirect_uri && client.redirect_uris.length && !client.redirect_uris.includes(redirect_uri))
    return res.status(400).send('invalid redirect_uri');
  const ruri = redirect_uri || client.redirect_uris[0];
  if (!ruri) return res.status(400).send('missing redirect_uri');

  const s = getSession(req);
  if (!s) {
    const back = '/api/oauth/authorize?' + new URLSearchParams(q).toString();
    res.writeHead(302, { Location: `/api/login?return=${encodeURIComponent(back)}` });
    return res.end();
  }

  const code = await createCode({
    login: s.login,
    code_challenge: code_challenge || null,
    code_challenge_method: code_challenge_method || null,
    redirect_uri: ruri,
    client_id,
  });

  const u = new URL(ruri);
  u.searchParams.set('code', code);
  if (state) u.searchParams.set('state', state);
  res.writeHead(302, { Location: u.toString() });
  res.end();
}
