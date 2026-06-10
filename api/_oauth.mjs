// Minimal OAuth 2.1 server bits for one-click MCP connect: dynamic client
// registration, short-lived auth codes, and PKCE — all backed by Vercel Blob.
// Access tokens issued by the token endpoint are the same revocable API tokens
// used by the MCP server (_keys.mjs issueToken), so /api/mcp auth is unified.
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
async function getJson(path) {
  try {
    const h = await head(path, { token: TOKEN });
    return await readJson(h.url);
  } catch {
    return null;
  }
}
async function delPath(path) {
  try {
    const h = await head(path, { token: TOKEN });
    await del(h.url, { token: TOKEN });
  } catch {
    /* gone */
  }
}

export async function registerClient(meta) {
  const client_id = 'c_' + crypto.randomBytes(16).toString('hex');
  const rec = {
    client_id,
    redirect_uris: Array.isArray(meta.redirect_uris) ? meta.redirect_uris : [],
    client_name: meta.client_name || '',
    created: new Date().toISOString(),
  };
  await put(`oauth/clients/${client_id}.json`, JSON.stringify(rec), opts);
  return rec;
}
export const getClient = (id) =>
  /^c_[a-f0-9]+$/.test(id || '') ? getJson(`oauth/clients/${id}.json`) : Promise.resolve(null);

export async function createCode(data) {
  const code = 'a_' + crypto.randomBytes(24).toString('hex');
  await put(
    `oauth/codes/${code}.json`,
    JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + 600 }),
    opts,
  );
  return code;
}
export async function consumeCode(code) {
  if (!/^a_[a-f0-9]+$/.test(code || '')) return null;
  const rec = await getJson(`oauth/codes/${code}.json`);
  await delPath(`oauth/codes/${code}.json`); // single-use
  if (!rec) return null;
  if (rec.exp && Math.floor(Date.now() / 1000) > rec.exp) return null;
  return rec;
}

// PKCE S256 (required whenever the client sent a challenge)
export function verifyPkce(verifier, challenge, method) {
  if (!challenge) return true;
  if (method && method !== 'S256') return false;
  if (!verifier) return false;
  const h = crypto.createHash('sha256').update(verifier).digest('base64url');
  return h === challenge;
}

export function originFromRequest(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
