// Personal API tokens for the remote MCP server. One active token per user,
// stored in Vercel Blob so it's revocable:
//   keys/<token>.json        -> { login, created }   (token -> user lookup)
//   keymeta/<login>.json     -> { token, created }   (so the UI can re-show it)
import { put, del, head } from '@vercel/blob';
import crypto from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const opts = {
  access: 'private',
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 0,
  token: TOKEN,
};
const keyPath = (t) => `keys/${t}.json`;
const metaPath = (login) => `keymeta/${String(login).toLowerCase()}.json`;

async function readJson(url) {
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'z=' + Date.now(), {
      headers: { authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
async function delPath(path) {
  try {
    const h = await head(path, { token: TOKEN });
    await del(h.url, { token: TOKEN });
  } catch {
    /* already gone */
  }
}

export async function getKeyMeta(login) {
  try {
    const m = await head(metaPath(login), { token: TOKEN });
    return await readJson(m.url);
  } catch {
    return null;
  }
}

export async function createKey(login) {
  const prev = await getKeyMeta(login);
  if (prev && prev.token) await delPath(keyPath(prev.token)); // revoke the old one
  const token = crypto.randomBytes(24).toString('hex');
  const created = new Date().toISOString();
  await put(keyPath(token), JSON.stringify({ login, created }), opts);
  await put(metaPath(login), JSON.stringify({ token, created }), opts);
  return token;
}

export async function revokeKey(login) {
  const prev = await getKeyMeta(login);
  if (prev && prev.token) await delPath(keyPath(prev.token));
  await delPath(metaPath(login));
}

// Issue an additional token WITHOUT revoking others (used by the OAuth token
// endpoint — a user may connect several AI clients, each gets its own token).
export async function issueToken(login) {
  const token = crypto.randomBytes(24).toString('hex');
  await put(keyPath(token), JSON.stringify({ login, created: new Date().toISOString(), via: 'oauth' }), opts);
  return token;
}

// token -> github login (or null)
export async function resolveKey(token) {
  if (!token || !/^[a-f0-9]{32,}$/.test(token)) return null;
  try {
    const h = await head(keyPath(token), { token: TOKEN });
    const j = await readJson(h.url);
    return j && j.login ? j.login : null;
  } catch {
    return null;
  }
}
