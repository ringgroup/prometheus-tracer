// GitHub redirects back here with ?code&state. We verify state, exchange the
// code for an access token (server-side, using the client secret), look up the
// user, enforce the allow-list, and set a signed session cookie.
import { sign, sessionCookie, parseCookies, originFromRequest } from './_lib.mjs';

const deny = (res, status, msg) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Set-Cookie', 'pt_oauth_state=; Path=/; Max-Age=0');
  res.end(
    `<body style="font-family:monospace;background:#000;color:#ff8c00;padding:48px;line-height:1.6">` +
      `<div style="font-weight:700;letter-spacing:1px">PROMETHEUS TRACER</div>` +
      `<div style="color:#ff3b3b;margin:16px 0">${msg}</div>` +
      `<a style="color:#33ccff" href="/api/login">try again</a></body>`,
  );
};

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = parseCookies(req);

  if (!code || !state || state !== cookies.pt_oauth_state) {
    deny(res, 400, 'Invalid or expired sign-in request (state mismatch).');
    return;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    deny(res, 500, 'Server not configured: missing GitHub OAuth credentials.');
    return;
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${originFromRequest(req)}/api/callback`,
      }),
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      deny(res, 401, 'GitHub did not return an access token.');
      return;
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'prometheus-tracer',
      },
    });
    const user = await userRes.json();
    if (!user || !user.login) {
      deny(res, 401, 'Could not read your GitHub profile.');
      return;
    }

    // Allow-list: comma-separated GitHub usernames in ALLOWED_GITHUB_USERS.
    // If unset/empty, any GitHub user may sign in.
    const allow = (process.env.ALLOWED_GITHUB_USERS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allow.length && !allow.includes(user.login.toLowerCase())) {
      deny(res, 403, `ACCESS DENIED — @${user.login} is not authorized for this terminal.`);
      return;
    }

    const token = sign({
      login: user.login,
      name: user.name || user.login,
      avatar: user.avatar_url,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    });

    // honor a same-site return path (OAuth authorize bounce), else home
    let dest = '/';
    const ret = cookies.pt_return ? decodeURIComponent(cookies.pt_return) : '';
    if (ret && ret.startsWith('/')) dest = ret;

    res.setHeader('Set-Cookie', [
      sessionCookie(token),
      'pt_oauth_state=; Path=/; Max-Age=0',
      'pt_return=; Path=/; Max-Age=0',
    ]);
    res.writeHead(302, { Location: dest });
    res.end();
  } catch (err) {
    deny(res, 500, 'Unexpected error during sign-in.');
  }
}
