// Per-user storage on Vercel Blob (Vercel-native, provisioned via CLI — no
// external service, no browser flow). One private JSON blob per user at
// `trackers/<github_login>.json`, read/written with BLOB_READ_WRITE_TOKEN.
import { put, head } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export const configured = () => Boolean(TOKEN);

export const emptyTracker = () => ({ start: null, rows: [], milestones: [], goalLossKg: 40 });

// Initial tracker for a user with nothing stored yet — EVERYONE starts empty
// and builds their own history. No seeded/demo data.
export const seedTracker = () => emptyTracker();

const pathFor = (login) => `trackers/${String(login).toLowerCase()}.json`;

export async function getTracker(login) {
  try {
    // head() resolves the blob's authenticated URL; 404 -> no data yet.
    const meta = await head(pathFor(login), { token: TOKEN });
    const res = await fetch(meta.url, { headers: { authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) return seedTracker(login);
    return await res.json();
  } catch {
    // BlobNotFoundError (first-time user) or any read miss -> empty start.
    return seedTracker(login);
  }
}

export async function saveTracker(login, data) {
  await put(pathFor(login), JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: TOKEN,
  });
  return data;
}
